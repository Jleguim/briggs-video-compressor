const fs = require('fs')
const path = require('path')
const unzip = require('extract-zip')
const FFmpeg = require('./ffmpeg')

let globals = {}

class Compressor {
  constructor() {}
  logger = console.log

  async downloadFFMPEG() {
    this.logger('Downloading FFmpeg...')
    let dwUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'
    let dwPath = path.join(globals.bin, 'ffmpeg.zip')

    if (fs.existsSync(dwPath)) {
      this.logger('Finished downloading FFmpeg...')
      return await this.installFFMPEG(dwPath)
    }

    let request = await fetch(dwUrl, { method: 'GET' })
    let blob = await request.blob()
    let buffer = await blob.arrayBuffer()
    fs.writeFileSync(dwPath, new Uint8Array(buffer))

    this.logger('Finished downloading FFmpeg...')
    await this.installFFMPEG(dwPath)
  }

  async installFFMPEG(dwPath) {
    this.logger('Installing FFmpeg...')

    await unzip(dwPath, { dir: globals.bin })
    this.logger('FFmpeg extracted, moving files to bin folder')

    let filesPath = path.join(globals.bin, '/ffmpeg-master-latest-win64-gpl/bin')
    let filesNeeded = ['ffmpeg.exe', 'ffprobe.exe']

    for (const file of filesNeeded) {
      let src = path.join(filesPath, file)
      let dest = path.join(globals.bin, file)
      fs.copyFileSync(src, dest)
      this.logger(`Moved ${file}`)
    }

    this.logger('Finished moving files')
    this.logger('Deleting temp files')

    let filesToClean = ['ffmpeg.zip', '/ffmpeg-master-latest-win64-gpl']
    for (const file of filesToClean) {
      let filepath = path.join(globals.bin, file)
      fs.rmSync(filepath, { recursive: true })
      this.logger(`Deleted ${filepath}`)
    }

    this.logger('Finished installing FFmpeg')
  }

  async checkFFMPEG() {
    let ffmpegPath = path.join(globals.bin, 'ffmpeg.exe')
    let ffprobePath = path.join(globals.bin, 'ffprobe.exe')

    if (!fs.existsSync(ffmpegPath) || !fs.existsSync(ffprobePath)) {
      this.logger('FFmpeg not installed')
      await this.downloadFFMPEG()
    }

    this.ffmpeg = new FFmpeg(ffmpegPath, ffprobePath, globals.out)
    this.logger('FFmpeg is installed')
  }

  checkDirs() {
    this.logger('Verifying directories...')
    let paths = {
      bin: path.join(__dirname, 'bin'),
      out: path.join(__dirname, 'output'),
    }

    for (const key in paths) {
      let dir = paths[key]

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
        this.logger(`Created ${key} directory`)
      }

      globals[key] = dir
      this.logger(`${key}: ${dir}`)
    }

    this.logger('Directories checked')
  }

  async initiliaze() {
    this.checkDirs()
    await this.checkFFMPEG()
  }
}

module.exports = Compressor
