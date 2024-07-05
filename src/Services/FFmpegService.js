const { app, ipcMain } = require('electron')
const { execSync, spawn, exec } = require('child_process')
const unzip = require('extract-zip')
const path = require('path')
const fs = require('fs')

class FFmpegTask {
  constructor(f) {
    this.progress = 0
    this.file = f
    this.child = undefined
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
  _emitEvent = (name, data) => {
    const { windows } = require('../main')
    windows.main.webContents.send(`ffmpeg:${name}`, {
      tasks: this.tasks.map((t) => t.toJSON()),
    })
  }

  constructor(FFMPEG_PATHS, options, isSimultaneous = false) {
    this.paths = FFMPEG_PATHS
    this.options = options
    this.isSimult = isSimultaneous

    this.tasks = this.options.files.map((f) => new FFmpegTask(f))
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

    return this.position == this.tasks.length
  }

  calculateBitrate(filePath) {
    let length = this.getVideoLength(filePath)
    return Math.max(1, Math.floor((this.options.size * 8192.0) / (1.048576 * length) - 128))
  }

  getVideoLength(filePath) {
    let cmd = `"${this.paths.ffprobe}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    let buffer = execSync(cmd)
    let length = parseFloat(buffer.toString())
    return length
  }

  getFileName(filePath) {
    let split = filePath.split('\\')
    let name = split[split.length - 1]
    return name
  }

  getCompressedName(filePath) {
    let name = this.getFileName(filePath)
    let encoder = this.options.encoder
    return `${name}-${encoder}-compressed.mp4`
  }

  pass(task) {
    if (this.aborted) return

    const { output, encoder } = this.options
    const { ffmpeg } = this.paths

    const bitrate = this.calculateBitrate(task.file)
    const outputName = this.getCompressedName(task.file)
    const outputFile = path.join(output, outputName)

    const args = ['-i', task.file, '-y', '-b:v', `${bitrate}k`, '-c:v', encoder, outputFile]
    task.child = spawn(ffmpeg, args)

    task.child.on('close', () => {
      if (this.aborted) return

      this._log(`Finished ${outputName}`)
      this.position++
      task.progress = 100

      if (this.isFinished) {
        this._log('Finished compressing')

        this._emitEvent('finished')
        return exec('explorer.exe ' + output)
      }

      if (!this.isSimult) this.pass(this.currentTask)
    })

    task.child.stderr.on('data', (d) => {
      if (this.aborted) return task.child.kill('SIGINT')
      console.log(d.toString())

      task.progress += Math.floor(Math.random() * 3)
      if (task.progress >= 99) task.progress = 99

      this._emitEvent('update')
    })
  }

  abort() {
    this.aborted = true
    this.tasks.forEach((task) => {
      if (!task.child) return

      const output = this.options.output
      const outputName = this.getCompressedName(task.file)
      const outputFile = path.join(output, outputName)

      task.child.kill('SIGINT')
      setTimeout(() => {
        fs.rmSync(outputFile)
      }, 500)
    })
  }
}

class FFmpegService {
  _log = (obj) => console.log('FFmpegService =>', obj)

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
    ipcMain.handle('ffmpeg:start', (e, opts) => this.compress(opts))
    ipcMain.handle('ffmpeg:abort', () => this.compression.abort())
  }

  async checkDependency() {
    const { ffmpeg, ffprobe } = this.paths

    if (fs.existsSync(ffmpeg) && fs.existsSync(ffprobe)) {
      return this._log('FFmpeg found!')
    }

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

    this._log('Installed FFmpeg!')
  }

  compress(opts) {
    this.compression = new FFmpegCompression(this.paths, opts, true)
  }
}

module.exports = FFmpegService
