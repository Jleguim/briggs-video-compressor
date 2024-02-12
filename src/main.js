const { app } = require('electron')
const path = require('path')

const FFmpeg = require('./FFmpegService.js')
const WindowService = require('./WindowService.js')
const SettingService = require('./SettingService.js')

const compressor = new FFmpeg()
const winManager = new WindowService()
const settings = new SettingService()

app.once('ready', async function () {
  settings.load()
  compressor.checkDirs(app.getPath('userData'), settings)
  await compressor.checkFFmpeg()

  var view = path.join(__dirname, '/renderer/index.html')
  var mainWindow = winManager.createMainWindow()
  mainWindow.loadFile(view)

  require('./handles.js')
})

module.exports = { compressor, winManager, settings }
