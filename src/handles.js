const { ipcMain, app, dialog } = require('electron')
const { exec } = require('child_process')
const path = require('path')

const { windows } = require('./main')
const package = require('../package.json')

ipcMain.handle('app:info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
  }
})

ipcMain.handle('app:openReleaseNotes', (e) => {
  var releaseNotes = `${package.repository.url.replace('.git', '')}/releases/tag/v${app.getVersion()}`
  exec('explorer.exe ' + releaseNotes)
})

ipcMain.handle('app:fileSelect', (e, opts) => {
  let selection = dialog.showOpenDialogSync(windows.main, opts)
  if (!selection) return

  return { selection, dir: path.dirname(selection[0]) }
})
