const { BrowserWindow, app } = require('electron')
const path = require('path')
const fs = require('fs')
const DEV_MODE = !app.isPackaged

class WindowsService {
  constructor(RENDERER_PATH) {
    if (!fs.existsSync(RENDERER_PATH)) throw 'RENDERER_PATH must be an existing PATH to a directory'

    this.renderer_dir = RENDERER_PATH
    this.main = undefined
  }

  createMainWindow() {
    let options = {
      title: app.getName(),
      // icon: '',
      width: 250,
      height: 350,
      autoHideMenuBar: true,
      resizable: false,
      webPreferences: {
        preload: path.resolve(this.renderer_dir, 'preload.js'),
      },
    }

    this.main = new BrowserWindow(options)
    this.main.loadFile(path.resolve(this.renderer_dir, 'index.html'))

    if (DEV_MODE) this.main.webContents.openDevTools()

    return this.main
  }
}

module.exports = WindowsService
