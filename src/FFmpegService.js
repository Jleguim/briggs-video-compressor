const { execSync, exec, spawn } = require('child_process')
const path = require('node:path')
const fs = require('fs')
const unzip = require('extract-zip')

class Task {
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

class CompressionQueue {
  _log = (obj) => console.log('Compression =>', obj)
  _emitEvent = (name, data) => {
    const winManager = require('./main').winManager
    winManager.mainWindow.webContents.send(`ffmpeg:event:${name}`, {
      tasks: this.tasks.map((t) => t.toJSON()),
    })
  }

  constructor(paths, options, isSimult = false) {
    this.paths = paths
    this.options = options
    this.isSimult = isSimult

    this.tasks = this.options.files.map((f) => new Task(f))
    this.position = 0
    this.aborted = false
  }

  get currentTask() {
    return this.tasks[this.position]
  }

  get isFinished() {
    if (this.isSimult) {
      var finishedTasks = this.tasks.filter((f) => f.isDone).length
      return finishedTasks == this.tasks.length
    }

    return this.position == this.tasks.length
  }

  calculateBitrate(filePath) {
    const length = this.getVideoLength(filePath)
    return Math.max(1, Math.floor((this.options.size * 8192.0) / (1.048576 * length) - 128))
  }

  getVideoLength(filePath) {
    const ffprobe = this.paths.ffprobe
    const cmd = `"${ffprobe}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    const buffer = execSync(cmd)
    const length = parseFloat(buffer.toString())
    return length
  }

  getFileName(filePath) {
    const split = filePath.split('\\')
    const name = split[split.length - 1]
    return name
  }

  getCompressedName(filePath) {
    const name = this.getFileName(filePath)
    const encoder = this.options.encoder
    return `${name}-${encoder}-compressed.mp4`
  }

  start() {
    this._emitEvent('start')
    if (this.isSimult) return this.tasks.forEach((t, i) => this.pass(t, i))
    this.pass(this.currentTask)
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

        this._emitEvent('finish')
        return exec('explorer.exe ' + output)
      }

      if (!this.isSimult) this.pass(this.currentTask)
    })

    task.child.stderr.on('data', (d) => {
      if (this.aborted) return task.child.kill('SIGINT')
      console.log(d.toString())

      task.progress += Math.floor(Math.random() * 3)
      if (task.progress >= 99) task.progress = 99

      this._emitEvent('walk')
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

class FFmpeg {
  constructor(paths) {
    this.ffmpeg_dl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'

    this.paths = {
      bin: paths.bin,
      out: paths.out,
      ffmpeg: path.join(paths.bin, '/ffmpeg.exe'),
      ffprobe: path.join(paths.bin, '/ffprobe.exe'),
      zip: path.join(paths.bin, '/ffmpeg.zip'),
      unzipped: path.join(paths.bin, '/ffmpeg-master-latest-win64-gpl/bin'),
    }

    this.encoders = {
      libx264: 'CPU',
      h264_amf: 'AMD HW H.264',
      h264_nvenc: 'NVIDIA NVENC H.264',
    }
  }

  _log(obj) {
    console.log('FFmpegWrapper =>', obj)
  }

  checkDirs() {
    if (!fs.existsSync(this.paths.bin)) {
      this._log('Creating bin directory...')
      fs.mkdirSync(this.paths.bin)
    }

    if (!fs.existsSync(this.paths.out)) {
      this._log('Creating out directory...')
      fs.mkdirSync(this.paths.out)
    }

    this._log('Bin directory: ' + this.paths.bin)
    this._log('Out directory: ' + this.paths.out)
    this._log('Directories checked')
  }

  async checkFFmpeg() {
    let ffmpegExists = fs.existsSync(this.paths.ffmpeg)
    let ffprobeExists = fs.existsSync(this.paths.ffprobe)

    if (ffmpegExists && ffprobeExists) {
      return this._log('FFmpeg found, starting...')
    }

    this._log('FFmpeg not found')
    await this.downloadFFmpeg()
  }

  async downloadFFmpeg() {
    this._log('Downloading FFmpeg...')

    let tempExists = fs.existsSync(this.paths.zip)
    if (tempExists) {
      return await this.installFFMPEG(this.paths.zip)
    }

    let request = await fetch(this.ffmpeg_dl, { methdod: 'GET' })
    let blob = await request.blob()
    let buffer = await blob.arrayBuffer()
    fs.writeFileSync(this.paths.zip, new Uint8Array(buffer))

    this._log('Finished downloading FFmpeg...')
    await this.installFFmpeg()
  }

  async installFFmpeg() {
    this._log('Installing FFmpeg...')

    await unzip(this.paths.zip, { dir: this.paths.bin })
    this._log('FFmpeg extracted, moving files...')

    for (const file of ['ffmpeg.exe', 'ffprobe.exe']) {
      let src = path.join(this.paths.unzipped, file)
      let dest = path.join(this.paths.bin, file)
      fs.copyFileSync(src, dest)
      this._log(`Moved ${file}`)
    }

    this._log('Finished moving files, deleting temp files...')

    for (const file of ['ffmpeg.zip', '/ffmpeg-master-latest-win64-gpl']) {
      let filepath = path.join(this.paths.bin, file)
      fs.rmSync(filepath, { recursive: true })
      this._log(`Deleted ${filepath}`)
    }

    this._log('Finished installing FFmpeg')
  }

  compress(options) {
    this.paths.out = options.output
    var compression = new CompressionQueue(this.paths, options)
    this.queue = compression
    compression.start()
  }
}

module.exports = FFmpeg
