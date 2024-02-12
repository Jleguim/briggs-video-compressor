const { app } = require('electron')
const path = require('path')

const FFmpeg = require('./FFmpegService.js')
const WindowService = require('./WindowService.js')

const compressor = new FFmpeg(app.getPath('userData'))
const winManager = new WindowService()

app.once('ready', async function () {
  compressor.checkDirs()
  await compressor.checkFFmpeg()

  var view = path.join(__dirname, '/renderer/index.html')
  var mainWindow = winManager.createMainWindow()
  mainWindow.loadFile(view)

  require('./handles.js')
})

module.exports = { compressor, winManager }
