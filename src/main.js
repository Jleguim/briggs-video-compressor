const { app, autoUpdater, dialog } = require('electron')
const path = require('path')

const FFmpeg = require('./FFmpegService.js')
const WindowService = require('./WindowService.js')
const SettingService = require('./SettingService.js')

const winManager = new WindowService()
const settings = new SettingService()
const compressor = new FFmpeg(settings)

if (app.isPackaged) {
  const server = 'https://hazel-test-five.vercel.app'
  const url = `${server}/update/${process.platform}/${app.getVersion()}`

  autoUpdater.setFeedURL({ url })

  setInterval(() => {
    autoUpdater.checkForUpdates()
    console.log('Checked for updates')
  }, 10000)

  autoUpdater.on('update-downloaded', async (e, releaseNotes, releaseName) => {
    const dialogOpts = {
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Application Update',
      message: process.platform === 'win32' ? releaseNotes : releaseName,
      detail: 'A new version has been downloaded. Restart the application to apply the updates.',
    }

    var returnValue = await dialog.showMessageBox(dialogOpts)
    if (returnValue.response === 0) autoUpdater.quitAndInstall()
  })

  autoUpdater.on('error', (message) => {
    console.error('There was a problem updating the application')
    console.error(message)
  })
}

app.once('ready', async function () {
  compressor.checkDirs()
  await compressor.checkFFmpeg()

  var view = path.join(__dirname, '/renderer/index.html')
  var mainWindow = winManager.createMainWindow()
  mainWindow.loadFile(view)

  require('./handles.js')
})

if (require('electron-squirrel-startup')) app.quit()

module.exports = { compressor, winManager, settings }
