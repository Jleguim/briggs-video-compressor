const { app, ipcMain } = require('electron')
const { execSync, spawn, exec } = require('child_process')
const unzip = require('extract-zip')
const path = require('path')
const fs = require('fs')

class FFmpegTask {
  constructor(file, FFMPEG_PATHS) {
    this.paths = FFMPEG_PATHS
    this.file = file

    this.progress = 0
  }

  calculateProgress(str) {
    let timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2}.\d{2})/)
    if (timeMatch) {
      let hours = parseFloat(timeMatch[1])
      let minutes = parseFloat(timeMatch[2])
      let seconds = parseFloat(timeMatch[3])
      this.timeInSeconds = hours * 3600 + minutes * 60 + seconds
    }

    if (this.timeInSeconds && this.durationInSeconds) {
      let progress = Math.ceil((this.timeInSeconds / this.durationInSeconds) * 100)
      this.progress = parseInt(progress)
    }
  }

  getDuration() {
    let cmd = `"${this.paths.ffprobe}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${this.file}"`
    let buffer = execSync(cmd)
    this.durationInSeconds = parseFloat(buffer.toString())
    return this.durationInSeconds
  }

  calculateBitrate(size) {
    let length = this.getDuration()
    return Math.max(1, Math.floor((size * 8192.0) / (1.048576 * length) - 128))
  }

  get fileName() {
    let split = this.file.split('\\')
    let name = split[split.length - 1]
    return name
  }

  get isDone() {
    if (this.progress >= 100) return true
  }

  toJSON() {
    return {
      progress: this.progress,
      file: this.file,
    }
  }
}

class FFmpegCompression {
  _log = (obj) => console.log('FFmpegCompression =>', obj)
  _emitEvent = (name) => {
    const { windows } = require('../main')
    windows.mainWindow.webContents.send(`ffmpeg:${name}`, {
      tasks: this.tasks.map((t) => t.toJSON()),
      position: this.position,
    })
  }

  constructor(FFMPEG_PATHS, options, isSimultaneous = false) {
    this.paths = FFMPEG_PATHS
    this.options = options
    this.isSimult = isSimultaneous

    this.tasks = this.options.files.map((f) => new FFmpegTask(f, FFMPEG_PATHS))
    this.position = 0
    this.aborted = false

    if (this.isSimult) this.tasks.forEach((t, i) => this.pass(t, i))
    else this.pass(this.currentTask)
    this._emitEvent('started')
  }

  get currentTask() {
    return this.tasks[this.position]
  }

  get isFinished() {
    if (this.isSimult) {
      let finishedTasks = this.tasks.filter((f) => f.isDone).length
      return finishedTasks == this.tasks.length
    }

    return this.position + 1 == this.tasks.length
  }

  pass(task) {
    if (this.aborted) return

    const { output, encoder, size } = this.options

    const bitrate = task.calculateBitrate(size)
    const outputName = `${task.fileName}-${encoder}-compressed.mp4`
    const outputPath = path.join(output, outputName)

    const args = ['-i', task.file, '-y', '-b:v', `${bitrate}k`, '-c:v', encoder, outputPath]
    task.child = spawn(this.paths.ffmpeg, args)

    task.child.on('close', () => {
      if (this.aborted) return

      task.progress = 100
      this._log(`Finished ${task.fileName}`)

      if (this.isFinished) {
        this._log('Finished compressing')
        this._emitEvent('finished')
        return exec('explorer.exe ' + output)
      }

      this.position++

      if (!this.isSimult) this.pass(this.currentTask)
    })

    task.child.stderr.on('data', (d) => {
      if (this.aborted) return task.child.kill('SIGINT')

      let str = d.toString()

      console.log(str)
      task.calculateProgress(str)

      this._emitEvent('update')
    })
  }

  abort() {
    this.aborted = true
    this.tasks.forEach((task) => {
      if (!task.child) return

      const { output, encoder } = this.options
      const outputName = `${task.fileName}-${encoder}-compressed.mp4`
      const outputFile = path.join(output, outputName)

      task.child.kill('SIGINT')
      setTimeout(() => fs.rmSync(outputFile), 500)
    })
  }
}

class FFmpegService {
  _log = (obj) => console.log('FFmpegService =>', obj)
  _emitEvent = (name) => {
    const { windows } = require('../main')
    windows.mainWindow.webContents.send(`ffmpeg:${name}`)
  }

  constructor(FFMPEG_DL) {
    this.ffmpeg_dl = FFMPEG_DL
    this.paths = {
      ffmpeg: path.join(app.getPath('userData'), '/ffmpeg.exe'),
      ffprobe: path.join(app.getPath('userData'), '/ffprobe.exe'),
    }

    this.encoders = {
      libx264: 'CPU',
      h264_amf: 'AMD HW H.264',
      h264_nvenc: 'NVIDIA NVENC H.264',
    }

    ipcMain.handle('ffmpeg:getEncoders', () => this.encoders)
    ipcMain.handle('ffmpeg:checkDependency', () => this.checkDependency())

    ipcMain.handle('ffmpeg:start', (e, opts) => this.compress(opts))
    ipcMain.handle('ffmpeg:abort', () => this.compression.abort())
  }

  createDownloadWindow() {
    const { windows } = require('../main')

    let winOptions = {
      transparent: false,
      frame: false,
      width: 300,
      height: 300,
      resizable: false,
    }

    let winFile = path.resolve(windows.viewsPath, 'download.html')
    this.downloadWindow = windows.createWindow(winOptions)
    this.downloadWindow.loadFile(winFile)
  }

  async checkDependency() {
    const { ffmpeg, ffprobe } = this.paths

    if (fs.existsSync(ffmpeg) && fs.existsSync(ffprobe)) {
      return this._log('FFmpeg found!')
    }

    this.createDownloadWindow()
    await this.downloadFFmpeg()
  }

  async downloadFFmpeg() {
    this._log('Downloading FFmpeg...')

    let temp = path.join(app.getPath('userData'), '/ffmpeg.zip')
    if (fs.existsSync(temp)) return await this.installFFmpeg(temp)

    let request = await fetch(this.ffmpeg_dl, { method: 'GET' })
    let buffer = await request.arrayBuffer()
    fs.writeFileSync(temp, new Uint8Array(buffer))

    await this.installFFmpeg(temp)
  }

  async installFFmpeg(zip_path) {
    this._log('Installing FFmpeg...')

    await unzip(zip_path, { dir: app.getPath('userData') })
    let unzipped_path = path.join(app.getPath('userData'), '/ffmpeg-master-latest-win64-gpl')

    fs.copyFileSync(path.join(unzipped_path, '/bin/ffmpeg.exe'), this.paths.ffmpeg)
    fs.copyFileSync(path.join(unzipped_path, '/bin/ffprobe.exe'), this.paths.ffprobe)

    fs.rmSync(zip_path)
    fs.rmSync(unzipped_path, { recursive: true })

    this.downloadWindow.hide()
    this._log('Installed FFmpeg!')
  }

  compress(opts) {
    this.compression = new FFmpegCompression(this.paths, opts)
  }
}

module.exports = FFmpegService
