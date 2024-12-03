const { execSync, spawn } = require('child_process')
const { finished } = require('stream/promises')
const EventEmitter = require('events')
const { Readable } = require('stream')
const unzip = require('extract-zip')
const path = require('path')
const fs = require('fs')

const FFmpegDownloadUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'

class FFmpegEncoders {
  constructor() {
    this.libx264 = 'CPU'
    this.h264_amf = 'AMD HW H.264'
    this.h264_nvenc = 'NVIDIA NVENC H.264'
  }
}

class FFmpegPaths {
  constructor(binDirectory = path.resolve(process.cwd(), './bin')) {
    this.ffmpeg = path.join(binDirectory, '/ffmpeg.exe')
    this.ffprobe = path.join(binDirectory, '/ffprobe.exe')
    this.binDirectory = binDirectory
  }
}

class FFmpegCompressionOptions {
  constructor({ files = [], encoder = 'libx264', size = 10, output = process.cwd() }) {
    this.files = files
    this.encoder = encoder
    this.size = size
    this.output = output
  }
}

class FFmpegCompressionTask {
  constructor(file, options) {
    this.paths = new FFmpegPaths()
    this.file = file
    this.options = options

    this.progress = 0
    this.times = [0, 0]
  }

  parseTime(str) {
    let timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2}.\d{2})/)
    if (timeMatch) {
      let hours = parseFloat(timeMatch[1])
      let minutes = parseFloat(timeMatch[2])
      let seconds = parseFloat(timeMatch[3])
      return hours * 3600 + minutes * 60 + seconds
    }
  }

  calculateProgress(str) {
    var videoLength = this.getVideoLength()
    var taskLength = videoLength * 2
    var timestampInSeconds = this.parseTime(str)

    if (!timestampInSeconds) return

    if (this.progress >= 50) this.times[1] = timestampInSeconds
    else this.times[0] = timestampInSeconds

    var sum = this.times[0] + this.times[1]
    var porcentage = Math.ceil((sum / taskLength) * 100)

    this.progress = parseInt(porcentage)
  }

  get compressedFileName() {
    const fileName = this.fileName
    const encoder = this.options.encoder
    return `${fileName}-${encoder}-compressed.mp4`
  }

  get fileName() {
    let split = this.file.split('\\')
    let name = split[split.length - 1]
    return name
  }

  get firstPassArgs() {
    const file = this.file
    const bitrate = this.calculateVideoBitrate()
    const encoder = this.options.encoder
    const temp = path.join(process.env.TMPDIR, `$${this.fileName}-TEMP`)

    return ['-i', file, '-y', '-b:v', `${bitrate}k`, '-c:v', encoder, '-an', '-pass', '1', '-f', 'mp4', temp]
  }

  get secondPassArgs() {
    const file = this.file
    const bitrate = this.calculateVideoBitrate()
    const encoder = this.options.encoder
    const output = path.join(this.options.output, this.compressedFileName)

    return ['-i', file, '-y', '-b:v', `${bitrate}k`, '-c:v', encoder, '-b:a', '128k', '-pass', '2', output]
  }

  getVideoLength() {
    const command = this.paths.ffprobe
    const args = '-v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1'
    const file = this.file

    const buffer = execSync(`"${command}" ${args} "${file}"`)
    const lengthInSeconds = parseFloat(buffer.toString())

    return lengthInSeconds
  }

  getAudioBitrate() {
    const command = this.paths.ffprobe
    const args = '-v quiet -select_streams a:0 -show_entries stream=bit_rate -of default=noprint_wrappers=1:nokey=1'
    const file = this.file

    const buffer = execSync(`"${command}" ${args} "${file}"`)
    const bitrate = parseFloat(buffer.toString())

    return Math.round(bitrate / 1000)
  }

  calculateVideoBitrate() {
    const length = this.getVideoLength()
    const audioBitrate = this.getAudioBitrate()
    const size = this.options.size

    const videoBitrate = (size * 8192.0 * 0.98) / (1.048576 * length) - audioBitrate
    return Math.max(1, Math.round(videoBitrate))
  }

  toJSON() {
    return {
      progress: this.progress,
      file: this.file,
    }
  }
}

class FFmpegCompression {
  constructor(options, start = false) {
    this.paths = new FFmpegPaths()
    this.options = new FFmpegCompressionOptions(options)
    this.events = new EventEmitter()

    this.tasks = this.options.files.map((file) => new FFmpegCompressionTask(file, this.options))
    this.aborted = false
    this.position = 0

    this.events.on('log', (log) => console.log(`FFmpegCompression => ${log}`))
    this.events.on('abort', () => (this.aborted = true))
    this.events.on('debug', (data) => {
      const str = data.toString()
      this.events.emit('update')
      this.currentTask.calculateProgress(str)
    })

    if (start == true) this.start()
  }

  log(log) {
    this.events.emit('log', log)
  }

  parseData() {
    return {
      tasks: this.tasks.map((t) => t.toJSON()),
      position: this.position,
    }
  }

  get currentTask() {
    return this.tasks[this.position]
  }

  get isFinished() {
    return this.position + 1 == this.tasks.length
  }

  start() {
    if (!fs.existsSync(this.options.output)) fs.mkdirSync(this.options.output)

    this.pass(this.currentTask)
    this.events.emit('started')
  }

  abort() {
    this.events.emit('abort')
  }

  pass(task) {
    if (this.aborted) return

    this.events.once('abort', () => task.currentChild.kill('SIGINT'))

    task.currentChild = spawn(this.paths.ffmpeg, task.firstPassArgs)
    task.currentChild.stderr.on('data', (d) => this.events.emit('debug', d))
    task.currentChild.on('close', () => {
      if (this.aborted) return

      this.log(`Finished first pass ${task.fileName}`)

      task.currentChild = spawn(this.paths.ffmpeg, task.secondPassArgs)
      task.currentChild.stderr.on('data', (d) => this.events.emit('debug', d))
      task.currentChild.on('close', () => {
        if (this.aborted) return

        this.log(`Finished second pass ${task.fileName}`)

        if (this.isFinished) return this.events.emit('finished')

        this.position++
        this.pass(this.currentTask)
      })
    })
  }
}

class FFmpegWrapper {
  constructor() {
    this.paths = new FFmpegPaths()
    this.encoders = new FFmpegEncoders()
    this.events = new EventEmitter()

    this.events.on('log', (log) => console.log(`FFmpegWrapper => ${log}`))
  }

  log(log) {
    this.events.emit('log', log)
  }

  async getDependencies() {
    if (fs.existsSync(this.paths.ffmpeg) && fs.existsSync(this.paths.ffprobe)) {
      this.events.emit('installingDependencies', true)
      return this.log('FFmpeg found!')
    }

    this.events.emit('installingDependencies', false)

    if (!fs.existsSync(this.paths.binDirectory)) fs.mkdirSync(this.paths.binDirectory)

    const zipDest = path.join(process.env.TMPDIR, './ffmpeg.zip')
    const unzipDest = path.join(process.env.TMPDIR, './ffmpeg-master-latest-win64-gpl/')
    const files = [
      {
        extr: path.join(unzipDest, './bin/ffmpeg.exe'),
        dest: this.paths.ffmpeg,
      },
      {
        extr: path.join(unzipDest, './bin/ffprobe.exe'),
        dest: this.paths.ffprobe,
      },
    ]

    this.log('Downloading FFmpeg...')
    const response = await fetch(FFmpegDownloadUrl)
    const stream = fs.createWriteStream(zipDest)
    // https://stackoverflow.com/a/74722656
    const body = Readable.fromWeb(response.body) // Creates a Readable from a ReadableStream
    await finished(body.pipe(stream)) // Pipes Readable to WriteStream

    this.log('Extracting FFmpeg...')
    await unzip(zipDest, { dir: process.env.TMPDIR })

    files.forEach(({ extr, dest }) => {
      if (!fs.existsSync(extr)) return
      fs.copyFileSync(extr, dest) // move files from unzipped directory to bin directory
    })

    // cleanup
    fs.rmSync(zipDest)
    fs.rmSync(unzipDest, { recursive: true })

    this.log('Extracted FFmpeg!')
    this.events.emit('installingDependencies', true)
  }

  createCompressionQueue(opts, start) {
    this.currentCompressionQueue = new FFmpegCompression(opts, start)
    return this.currentCompressionQueue
  }
}

module.exports = FFmpegWrapper
