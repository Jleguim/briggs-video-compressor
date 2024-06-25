const { execSync, exec, spawn } = require('child_process')
const path = require('node:path')
const fs = require('fs')
const unzip = require('extract-zip')

class CompressQueue {
  constructor(paths, options) {
    this.paths = paths
    this.options = options

    this.files = this.options.files
    this.position = 0
    this.aborted = false
    this.task = undefined
  }

  _log(obj) {
    console.log('CompressQueue =>', obj)
  }

  emitEvent(eventName, data) {
    const { winManager } = require('./main')
    winManager.mainWindow.webContents.send(eventName, data)
  }

  start() {
    this._log('Started compression queue')

    this.emitEvent('ffmpeg:event:start', {
      files: this.files,
      position: this.position,
    })

    this.walk()
  }

  walk() {
    let file = this.files[this.position]
    let bitrate = this.calculateBitrate(file)

    this._log('Walked compression queue')
    this.emitEvent('ffmpeg:event:walk', {
      files: this.files,
      position: this.position,
    })

    this.pass(file, bitrate)
  }

  calculateBitrate(file) {
    const length = this.getVideoLength(file)
    return Math.max(1, Math.floor((this.options.size * 8192.0) / (1.048576 * length) - 128))
  }

  getVideoLength(file) {
    let cmd = `"${this.paths.ffprobe}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`
    let buffer = execSync(cmd)
    let length = parseFloat(buffer.toString())
    return length
  }

  pass(file, bitrate) {
    const outputFile = `${this.getFileName(file)}-${this.options.encoder}-compressed.mp4`
    const outputPath = path.join(this.options.output, outputFile)

    let args = ['-i', file, '-y', '-b:v', `${bitrate}k`, '-c:v', this.options.encoder, outputPath]
    let child = spawn(this.paths.ffmpeg, args)
    this.task = { child, outputPath }

    child.on('close', () => {
      this.position += 1
      if (this.position == this.files.length) {
        this.emitEvent('ffmpeg:event:finish', {
          files: this.files,
          position: this.position,
        })

        return exec('explorer.exe ' + this.options.output)
      }

      this.walk()
    })

    child.stdout.on('data', (d) => console.log(d.toString()))
    child.stderr.on('data', (d) => console.log(d.toString()))
  }

  getFileName(file) {
    let split = file.split('\\')
    let name = split[split.length - 1]
    return name
  }

  abort() {
    if (this.aborted) return
    this.aborted = true
    this.task.child.kill('SIGINT')

    setTimeout(() => fs.rmSync(this.task.outputPath), 500)
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

  newQueue(options) {
    this.paths.out = options.output
    this.queue = new CompressQueue(this.paths, options)
    return this.queue
  }
}

module.exports = FFmpeg
