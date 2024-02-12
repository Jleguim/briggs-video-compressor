const { BrowserWindow } = require('electron')
const path = require('path')

class WindowService {
  constructor() {
    this.mainWindow = null
  }

  createMainWindow() {
    var preload = path.join(__dirname, '/renderer/preload.js')

    this.mainWindow = new BrowserWindow({
      width: 250,
      height: 350,
      autoHideMenuBar: true,
      resizable: false,
      webPreferences: { preload },
    })

    return this.mainWindow
  }
}

module.exports = WindowService
