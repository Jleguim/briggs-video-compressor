const { app } = require('electron')
const { autoUpdater } = require('electron-updater')

const path = require('path')

const FFmpeg = require('./FFmpegService.js')
const WindowService = require('./WindowService.js')
const SettingService = require('./SettingService.js')

const winManager = new WindowService()
const settings = new SettingService()
const compressor = new FFmpeg(settings)

app.once('ready', function () {
  autoUpdater.checkForUpdates()
  autoUpdater.on('update-available', () => console.log('update-available'))

  autoUpdater.on('update-downloaded', () => {
    console.log('update-downloaded')
    autoUpdater.quitAndInstall()
  })

  autoUpdater.on('update-not-available', async () => {
    console.log('update-not-available')
    settings.load()
    compressor.checkDirs(app.getPath('userData'), settings)
    await compressor.checkFFmpeg()

    var view = path.join(__dirname, '/renderer/index.html')
    var mainWindow = winManager.createMainWindow()
    mainWindow.loadFile(view)

    require('./handles.js')
  })
})

module.exports = { compressor, winManager, settings }
