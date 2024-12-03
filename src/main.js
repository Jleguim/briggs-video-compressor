const { app } = require('electron')
const path = require('path')

const { WindowsService, SettingsService, UpdaterService, FFmpegService } = require('./Services')

const RENDERER_PATH = path.join(__dirname, './Public')
const SETTINGS_PATH = path.join(app.getPath('userData'), '/settings.json')
const UPDATE_SERVER = 'https://hazel-test-beta.vercel.app'

const services = {
  windows: new WindowsService(RENDERER_PATH),
  settings: new SettingsService(SETTINGS_PATH),
  updater: new UpdaterService(UPDATE_SERVER),
  ffmpeg: new FFmpegService(),
}

services.ffmpeg.events.on('installingDependencies', (finished) => {
  if (!finished) {
    services.windows.createDownloadWindow()
    return
  }

  services.windows.createMainWindow()
  services.windows.downloadWindow?.destroy()
})

app.once('ready', async () => {
  const { settings, updater, ffmpeg } = services

  require('./handles')
  app.setName('Briggs Compressor')
  settings.load()

  await updater.checkUpdates()
  await ffmpeg.getDependencies()
})

module.exports = services
