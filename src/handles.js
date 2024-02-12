const { dialog, ipcMain } = require('electron')
const { exec } = require('child_process')

const { compressor, winManager } = require('./main')

module.exports['app:version'] = function (e) {
  const package = require('../package.json')
  return package.version
}

module.exports['app:name'] = function (e) {
  const package = require('../package.json')
  return package.readableName
}

module.exports['logging:status'] = function (e, module, logText) {
  console.log(`${module} => ${logText}`)
}

module.exports['logging:debug'] = function (e, module, variables = {}) {
  for (const varName in variables) {
    console.log(`${module} => ${varName}: ${variables[varName]}`)
  }
}

module.exports['dialog:promptFileSelect'] = function (e, filters, properties) {
  const MainWindow = winManager.mainWindow
  return dialog.showOpenDialogSync(MainWindow, { filters, properties })
}

module.exports['ffmpeg:promptVideoSelection'] = function (e) {
  var filters = [{ name: 'Videos', extensions: ['mkv', 'avi', 'mp4'] }]
  var properties = ['multiSelections']
  return module.exports['dialog:promptFileSelect'](e, filters, properties)
}

module.exports['ffmpeg:start'] = function (e, videos, encoder, size) {
  module.exports['logging:debug'](null, 'ffmpeg', { videos, encoder, size })
  compressor.createNewCompressionQueue(videos, encoder, size)
  compressor.compressionQueue.onStart = (queueData) =>
    winManager.mainWindow.webContents.send('ffmpeg:event:start', queueData)
  compressor.compressionQueue.onWalk = (queueData) =>
    winManager.mainWindow.webContents.send('ffmpeg:event:walk', queueData)
  compressor.compressionQueue.onFinish = (queueData) => {
    winManager.mainWindow.webContents.send('ffmpeg:event:finish', queueData)
    exec('explorer.exe ' + compressor.OUT_PATH)
  }
  compressor.compressionQueue.start()
}

module.exports['ffmpeg:abort'] = function () {
  module.exports['logging:status']('ffmpeg', 'Compression queue aborted')
  compressor.compressionQueue.abort()
}

for (const eventName in module.exports) {
  var handler = module.exports[eventName]
  ipcMain.handle(eventName, handler)
}
