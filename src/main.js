const { app, autoUpdater, dialog } = require('electron')
const path = require('path')

const FFmpeg = require('./FFmpegService.js')
const WindowService = require('./WindowService.js')
const SettingService = require('./SettingService.js')
const Updater = require('./UpdateService.js')

const winManager = new WindowService()
const settings = new SettingService()
const compressor = new FFmpeg(settings)
const updater = new Updater()

app.once('ready', async function () {
  await updater.checkForUpdates()
  compressor.checkDirs()
  await compressor.checkFFmpeg()

  let view = path.join(__dirname, '/renderer/index.html')
  let mainWindow = winManager.createMainWindow()
  mainWindow.loadFile(view)

  require('./handles.js')
})

if (require('electron-squirrel-startup')) app.quit()

module.exports = { compressor, winManager, settings }
