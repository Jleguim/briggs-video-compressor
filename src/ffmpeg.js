const path = require('path')
const child_process = require('child_process')

class FFmpeg {
  constructor(ffmpegPath, ffprobePath, outDir) {
    this.ffmpegPath = ffmpegPath
    this.ffprobePath = ffprobePath
    this.outDir = outDir
  }

  getVideoLength(filePath) {
    let cmd = `"${this.ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    var lengthBuffer = child_process.execSync(cmd)
    return parseFloat(lengthBuffer.toString())
  }

  calculateBitrate(filePath, targetSize) {
    let videoLength = this.getVideoLength(filePath)
    console.log('\n\n\n\n\n\n\nVideo length: ' + videoLength)
    var bitrate = Math.max(1, Math.floor((targetSize * 8192.0) / (1.048576 * videoLength) - 128))
    return bitrate
  }

  getFileName(path) {
    let split = path.split('\\')
    return split[split.length - 1]
  }

  pass(filePath, encoder, bitrate) {
    var outPath = path.join(this.outDir, `${this.getFileName(filePath)}-${encoder}-compressed.mp4`)
    var ffmpegPath = this.ffmpegPath
    var cmd = `"${ffmpegPath}" -i "${filePath}" -y -b:v ${bitrate}k -c:v ${encoder} "${outPath}"`
    console.log(cmd + '\n\n\n\n\n\n\n')
    child_process.execSync(cmd)
  }

  run(files, encoder, targetSize) {
    for (const filePath of files) {
      var bitrate = this.calculateBitrate(filePath, targetSize)
      console.log('File: ' + filePath)
      console.log(`Encoder: ${encoder}`)
      console.log(`Bitrate: ${bitrate}k`)
      this.pass(filePath, encoder, bitrate)
    }
  }
}

module.exports = FFmpeg
