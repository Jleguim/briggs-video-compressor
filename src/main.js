const { app } = require('electron')
const path = require('path')

const FFmpeg = require('./FFmpegService.js')
const WindowService = require('./WindowService.js')
const SettingService = require('./SettingService.js')

const winManager = new WindowService()
const settings = new SettingService()
const compressor = new FFmpeg(settings)

app.once('ready', async function () {
  compressor.checkDirs()
  await compressor.checkFFmpeg()

  var view = path.join(__dirname, '/renderer/index.html')
  var mainWindow = winManager.createMainWindow()
  mainWindow.loadFile(view)

  require('./handles.js')
})

module.exports = { compressor, winManager, settings }
