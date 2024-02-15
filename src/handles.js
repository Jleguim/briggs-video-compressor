const { dialog, ipcMain, app } = require('electron')
const { exec } = require('child_process')

const { compressor, winManager, settings } = require('./main')
const path = require('path')
const fs = require('fs')

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

module.exports['settings:promptDirectorySelection'] = function (e) {
  let filters = []
  let properties = ['openDirectory']
  return module.exports['dialog:promptFileSelect'](e, filters, properties)
}

module.exports['settings:get'] = function (e) {
  return settings.obj
}

module.exports['settings:save'] = function (e, newSettings) {
  settings.obj = newSettings
  return settings.save()
}

module.exports['ffmpeg:promptVideoSelection'] = function (e) {
  let filters = [{ name: 'Videos', extensions: ['mkv', 'avi', 'mp4'] }]
  let properties = ['multiSelections']
  return module.exports['dialog:promptFileSelect'](e, filters, properties)
}

module.exports['ffmpeg:start'] = function (e, files, encoder, size, output) {
  module.exports['logging:debug'](null, 'ffmpeg', { files, encoder, size, output })
  let queue = compressor.newQueue(files, encoder, size, output)

  queue.onStart = (queueData) => winManager.mainWindow.webContents.send('ffmpeg:event:start', queueData)
  queue.onWalk = (queueData) => winManager.mainWindow.webContents.send('ffmpeg:event:walk', queueData)
  queue.onFinish = (queueData) => {
    winManager.mainWindow.webContents.send('ffmpeg:event:finish', queueData)
    exec('explorer.exe ' + output)
  }

  queue.start()
}

module.exports['ffmpeg:abort'] = function () {
  module.exports['logging:status'](null, 'ffmpeg', 'Compression queue aborted')
  compressor.queue.abort()
}

module.exports['ffmpeg:getEncoders'] = function (e) {
  return compressor.ENCODERS
}

for (const eventName in module.exports) {
  let handler = module.exports[eventName]
  ipcMain.handle(eventName, handler)
}
