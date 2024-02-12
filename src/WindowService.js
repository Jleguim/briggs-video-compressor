const { BrowserWindow, app } = require('electron')
const path = require('path')

class WindowService {
  constructor() {
    this.mainWindow = null
    // this.isDev = process.env.NODE_ENV !== 'production' // THIS DOESNT WORK
  }

  createMainWindow() {
    var preload = path.join(__dirname, '/renderer/preload.js')
    var readableName = require('../package.json').readableName

    this.mainWindow = new BrowserWindow({
      title: readableName,
      // icon: '',
      width: 250,
      height: 350,
      autoHideMenuBar: true,
      resizable: false,
      webPreferences: {
        preload,
      },
    })

    // if (this.isDev) this.mainWindow.webContents.openDevTools()
    return this.mainWindow
  }
}

module.exports = WindowService
