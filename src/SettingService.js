const { app } = require('electron')
const path = require('path')
const fs = require('fs')

class Settings {
  constructor() {
    this.SETTINGS_PATH = path.join(app.getPath('userData'), '/settings.json')

    this.encoder = 'libx264'
    this.out = path.join(app.getPath('userData'), '/out')
    this.bin = path.join(app.getPath('userData'), '/bin')

    this.load()
  }

  get obj() {
    return {
      encoder: this.encoder,
      out: this.out,
    }
  }

  set obj(settings) {
    this.encoder = settings.encoder
    this.out = settings.out
  }

  save() {
    let data = JSON.stringify(this.obj)
    fs.writeFileSync(this.SETTINGS_PATH, data)
    return data
  }

  load() {
    if (!fs.existsSync(this.SETTINGS_PATH)) return this.save()

    var data = fs.readFileSync(this.SETTINGS_PATH)
    this.obj = JSON.parse(data)
    return this.obj
  }
}

module.exports = Settings
