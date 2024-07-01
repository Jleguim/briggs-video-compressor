const { dialog, ipcMain, app } = require('electron')
const { exec } = require('child_process')

const { ffmpeg, winManager, settings } = require('./main')
const path = require('path')

module.exports['app:info'] = function (e) {
  const package = require('../package.json')
  return {
    name: package.readableName,
    version: `v${package.version}`,
    releaseNotes: `${package.repository.url.replace('.git', '')}/releases/tag/v${package.version}`,
  }
}

module.exports['app:openInBrowser'] = function (e, url) {
  exec('explorer.exe ' + url)
}

module.exports['logging:status'] = function (e, module, logText) {
  console.log(`${module} => ${logText}`)
}

module.exports['logging:debug'] = function (e, module, variables = {}) {
  for (const varName in variables) {
    console.log(`${module} => ${varName}: ${variables[varName]}`)
  }
}

module.exports['dialog:promptSelect'] = async function (e, opts) {
  const MainWindow = winManager.mainWindow
  let selection = await dialog.showOpenDialogSync(MainWindow, opts)
  if (opts.properties.includes('openDirectory')) {
    return { folders: selection, dir: selection ? selection[0] : undefined }
  } else {
    return { files: selection, dir: selection ? path.dirname(selection[0]) : undefined }
  }
}

module.exports['settings:get'] = function (e) {
  return settings.obj
}

module.exports['settings:save'] = function (e, newSettings) {
  settings.obj = newSettings
  return settings.save()
}

module.exports['ffmpeg:start'] = function (e, options) {
  module.exports['logging:debug'](null, 'ffmpeg', options)
  ffmpeg.compress(options)
}

module.exports['ffmpeg:abort'] = function () {
  module.exports['logging:status'](null, 'ffmpeg', 'Compression queue aborted')
  ffmpeg.queue.abort()
}

module.exports['ffmpeg:getEncoders'] = function (e) {
  return ffmpeg.encoders
}

for (const eventName in module.exports) {
  let handler = module.exports[eventName]
  ipcMain.handle(eventName, handler)
}
