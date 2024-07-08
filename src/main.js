const { app } = require('electron')
const path = require('path')

const { WindowsService, SettingsService, UpdaterService, FFmpegService } = require('./Services')

const RENDERER_PATH = path.join(__dirname, './Public')
const SETTINGS_PATH = path.join(app.getPath('userData'), '/settings.json')
const UPDATE_SERVER = 'https://hazel-test-beta.vercel.app'
const FFMPEG_DL = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'

const services = {
  windows: new WindowsService(RENDERER_PATH),
  settings: new SettingsService(SETTINGS_PATH),
  updater: new UpdaterService(UPDATE_SERVER),
  ffmpeg: new FFmpegService(FFMPEG_DL),
}

app.once('ready', async () => {
  const { windows, settings, updater, ffmpeg } = services

  require('./handles')
  app.setName('Briggs Compressor')
  settings.load()

  await updater.checkUpdates()
  await ffmpeg.checkDependency()

  windows.createMainWindow()
  ffmpeg.downloadWindow?.destroy()
})

module.exports = services
