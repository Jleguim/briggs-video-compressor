const { app, BrowserWindow } = require('electron')
const path = require('path')

class WindowsService {
  constructor(viewsPath) {
    this.viewsPath = viewsPath
    this.mainWindow = null
    this.windowSettings = {
      title: app.getName(),
      width: 250,
      height: 350,
      autoHideMenuBar: true,
      resizable: false,
      show: false,
      webPreferences: { preload: path.resolve(this.viewsPath, 'preload.js') },
    }
  }

  createDownloadWindow() {
    let winOptions = {
      transparent: false,
      frame: false,
      width: 300,
      height: 300,
      resizable: false,
    }

    let winFile = path.resolve(this.viewsPath, 'download.html')
    this.downloadWindow = this.createWindow(winOptions)
    this.downloadWindow.loadFile(winFile)
  }

  createMainWindow() {
    let mainWindowFile = path.resolve(this.viewsPath, 'compressor.html')
    let mainWindow = this.createWindow(this.windowSettings)

    this.mainWindow = mainWindow
    this.mainWindow.loadFile(mainWindowFile)

    return this.mainWindow
  }

  createWindow(options) {
    options = Object.assign(options, { show: false })
    var win = new BrowserWindow(options)

    win.on('ready-to-show', () => win.show())

    return win
  }

  createModalWindow(options) {
    options = Object.assign(options, { parent: this.mainWindow, modal: true })
    return this.createWindow(options)
  }
}

module.exports = WindowsService
