const { ipcMain, app } = require('electron')
const fs = require('fs')
const path = require('path')

class SettingsService {
  constructor(SETTINGS_PATH) {
    if (!fs.existsSync(SETTINGS_PATH)) {
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify({}))
    }

    this.save_path = SETTINGS_PATH
    this._data = new SettingsObject()

    ipcMain.handle('settings:get', () => this._data)
    ipcMain.handle('settings:set', (e, newSettings) => this.set(newSettings))
  }

  set(newObj) {
    let mutableKeys = Object.keys(newObj).filter((k) => Object.keys(this._data).includes(k))
    mutableKeys.forEach((key) => {
      this._data[key] = newObj[key]
    })
    this.save()
  }

  save() {
    let data = JSON.stringify(this._data, 0, 3)
    fs.writeFileSync(this.save_path, data)
    return this._data
  }

  load() {
    if (!fs.existsSync(this.save_path)) return this.save()
    let data = fs.readFileSync(this.save_path)
    let obj = JSON.parse(data)
    this.set(obj)
    return this._data
  }
}

class SettingsObject {
  constructor() {
    this.encoder = 'libx264'
    this.out_path = path.resolve(app.getPath('videos'))
    this.recent_path = app.getPath('videos')
  }
}

module.exports = SettingsService
