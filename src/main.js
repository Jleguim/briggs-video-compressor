const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const child_process = require('child_process')
const path = require('path')

const Compressor = require('./compressor')

app.once('ready', async function () {
  const compressor = new Compressor()
  await compressor.initiliaze()

  ipcMain.handle('dialog:promptVideoSelect', function () {
    return dialog.showOpenDialogSync(win, {
      filters: [{ name: 'Videos', extensions: ['mkv', 'avi', 'mp4'] }],
      properties: ['multiSelections'],
    })
  })

  ipcMain.handle('compression:start', function (ev, videos, encoder, sizeTarget) {
    console.log('Videos: ', videos)
    console.log('Encoder: ', encoder)
    console.log('Size: ', sizeTarget)
    compressor.ffmpeg.run(videos, encoder, sizeTarget)
  })

  ipcMain.handle('compression:finished', function (ev) {
    let cmd = `explorer.exe ${compressor.ffmpeg.outDir}`
    child_process.execSync(cmd)
  })

  ipcMain.handle('compression:abort', function (ev) {
    console.log('abort')
  })

  const win = new BrowserWindow({
    width: 250,
    height: 350,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, './js/preload.js'),
    },
    resizable: false,
  })

  win.loadFile('./src/views/index.html')
})

app.on('will-quit', function (ev) {
  ev.preventDefault()
  app.exit()
})
