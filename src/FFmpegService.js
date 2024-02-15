const { execSync, spawn } = require('child_process')
const path = require('node:path')
const fs = require('fs')
const unzip = require('extract-zip')

class CompressingQueue {
  constructor(FFMPEG_PATH, FFPROBE_PATH, options) {
    // this.ffmpeg = ffmpeg
    this.FFMPEG_PATH = FFMPEG_PATH
    this.FFPROBE_PATH = FFPROBE_PATH
    // this.settings = { encoder, size }
    this.options = options

    this.queue = this.options.files
    this.queuePosition = 0
    this.completed = false
    this.aborted = false
    this.currentTask = null
  }

  getVideoLength(source) {
    let cmd = `"${this.FFPROBE_PATH}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${source}"`
    let lengthBuffer = execSync(cmd)
    let videoLength = parseFloat(lengthBuffer.toString())
    return videoLength
  }

  calculateBitrate(source) {
    const VIDEO_LENGTH = this.getVideoLength(source)
    const TARGET_SIZE = this.options.size
    let bitrate = Math.max(1, Math.floor((TARGET_SIZE * 8192.0) / (1.048576 * VIDEO_LENGTH) - 128))
    return bitrate
  }

  getFileName(source) {
    let split = source.split('\\')
    let name = split[split.length - 1]
    return name
  }

  pass(source, bitrate) {
    if (this.aborted) return

    const FFMPEG_PATH = this.FFMPEG_PATH
    const OUTPUT_FILE = `${this.getFileName(source)}-${this.options.encoder}-compressed.mp4`
    const OUTPUT_PATH = path.join(this.options.output, OUTPUT_FILE)

    let args = ['-i', source, '-y', '-b:v', `${bitrate}k`, '-c:v', this.options.encoder, OUTPUT_PATH]

    let child = spawn(FFMPEG_PATH, args)
    this.currentTask = { child, OUTPUT_PATH, source }
    child.stdout.on('data', (data) => console.log(data.toString()))
    child.stderr.on('data', (data) => console.log(data.toString()))

    child.on('close', () => {
      if (this.aborted) return
      this.queuePosition += 1
      this.completed = this.queuePosition == this.queue.length
      this.walk()
    })
  }

  abort() {
    if (this.aborted) return
    this.aborted = true
    this.currentTask.child.kill('SIGINT')

    setTimeout(() => {
      fs.rmSync(this.currentTask.OUTPUT_PATH)
    }, 500)
  }

  finish() {
    console.log('Finished compression queue')
    if (this.onFinish) return this.onFinish({ queue: this.queue, length: this.queue.length, pos: this.queuePosition })
  }

  walk() {
    if (this.completed) return this.finish()

    let nextFile = this.queue[this.queuePosition]
    let targetBitrate = this.calculateBitrate(nextFile)

    console.log('Walked compression queue')
    if (this.onWalk) this.onWalk({ queue: this.queue, length: this.queue.length, pos: this.queuePosition })

    this.pass(nextFile, targetBitrate)
  }

  start() {
    console.log('Started compression queue')
    if (this.onStart) this.onStart({ queue: this.queue, length: this.queue.length, pos: this.queuePosition })
    this.walk()
  }
}

class FFmpeg {
  constructor({ bin, out }) {
    this.BIN_PATH = bin
    this.OUT_PATH = out
    this.FFMPEG_PATH = path.join(this.BIN_PATH, '/ffmpeg.exe')
    this.FFPROBE_PATH = path.join(this.BIN_PATH, '/ffprobe.exe')

    this.ENCODERS = {
      libx264: 'CPU',
      h264_amf: 'AMD HW H.264',
      h264_nvenc: 'NVIDIA NVENC H.264',
    }

    this.FFMPEG_DL = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'
  }

  newQueue(files, encoder, size, output) {
    let options = { files, encoder, size, output }
    this.OUT_PATH = output
    this.queue = new CompressingQueue(this.FFMPEG_PATH, this.FFPROBE_PATH, options)
    return this.queue
  }

  async installFFMPEG(ZIP_PATH) {
    console.log('Installing FFmpeg...')

    await unzip(ZIP_PATH, { dir: this.BIN_PATH })
    console.log('FFmpeg extracted, moving files...')

    const UNZIPPED_PATH = path.join(this.BIN_PATH, '/ffmpeg-master-latest-win64-gpl/bin')
    for (const file of ['ffmpeg.exe', 'ffprobe.exe']) {
      let src = path.join(UNZIPPED_PATH, file)
      let dest = path.join(this.BIN_PATH, file)
      fs.copyFileSync(src, dest)
      console.log(`Moved ${file}`)
    }

    console.log('Finished moving files, deleting temp files...')

    for (const file of ['ffmpeg.zip', '/ffmpeg-master-latest-win64-gpl']) {
      let filepath = path.join(this.BIN_PATH, file)
      fs.rmSync(filepath, { recursive: true })
      console.log(`Deleted ${filepath}`)
    }

    console.log('Finished installing FFmpeg')
  }

  async downloadFFmpeg() {
    console.log('Downloading FFmpeg...')
    const TEMP_PATH = path.join(this.BIN_PATH, '/ffmpeg.zip')
    if (fs.existsSync(TEMP_PATH)) {
      return await this.installFFMPEG(TEMP_PATH)
    }

    let request = await fetch(this.FFMPEG_DL, { methdod: 'GET' })
    let blob = await request.blob()
    let buffer = await blob.arrayBuffer()
    fs.writeFileSync(TEMP_PATH, new Uint8Array(buffer))

    console.log('Finished downloading FFmpeg...')
    await this.installFFMPEG(TEMP_PATH)
  }

  async checkFFmpeg() {
    if (fs.existsSync(this.FFMPEG_PATH) && fs.existsSync(this.FFPROBE_PATH)) {
      return console.log('FFmpeg found, starting...')
    }

    console.log('FFmpeg not found')
    await this.downloadFFmpeg()
  }

  checkDirs() {
    if (!fs.existsSync(this.BIN_PATH)) {
      console.log('Creating bin directory...')
      fs.mkdirSync(this.BIN_PATH)
    }

    if (!fs.existsSync(this.OUT_PATH)) {
      console.log('Creating out directory...')
      fs.mkdirSync(this.OUT_PATH)
    }

    console.log('Bin directory: ' + this.BIN_PATH)
    console.log('Out directory: ' + this.OUT_PATH)
    console.log('Directories checked')
  }
}

module.exports = FFmpeg
