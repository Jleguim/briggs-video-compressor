const { ipcMain, app, dialog } = require('electron')
const { exec } = require('child_process')
const path = require('path')

const { windows, settings } = require('./main')
const package = require('../package.json')

ipcMain.handle('app:info', () => {
  var releaseNotes = `${package.repository.url.replace('.git', '')}/releases/tag/v${app.getVersion()}`
  return {
    name: app.getName(),
    version: app.getVersion(),
    releaseNotes: releaseNotes,
  }
})

ipcMain.handle('app:openBrowser', (e, url) => {
  exec('explorer.exe ' + url)
})

ipcMain.handle('app:fileSelect', (e, opts) => {
  let selection = dialog.showOpenDialogSync(windows.main, opts)
  if (!selection) return

  return { selection, dir: path.dirname(selection[0]) }
})
