const { ipcMain, app, dialog } = require('electron')
const { exec } = require('child_process')
const path = require('path')

const { windows, ffmpeg } = require('./main')
const package = require('../package.json')

ipcMain.handle('FFmpeg:getEncoders', () => ffmpeg.encoders)
ipcMain.handle('FFmpeg:abort', () => ffmpeg.currentCompressionQueue.abort())
ipcMain.handle('FFmpeg:start', (e, opts) => {
  const queue = ffmpeg.createCompressionQueue(opts)
  const target = windows.mainWindow.webContents

  const events = [
    {
      ev: 'started',
      toSend: 'FFmpeg:started',
    },
    {
      ev: 'update',
      toSend: 'FFmpeg:update',
    },
    {
      ev: 'finished',
      toSend: 'FFmpeg:finished',
    },
  ]

  events.forEach(({ ev, toSend }) => {
    queue.events.on(ev, () => {
      target.send(toSend, queue.parseData())

      if (ev != 'finished') return

      exec('explorer.exe ' + queue.options.output)
    })
  })

  queue.start()
})

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
