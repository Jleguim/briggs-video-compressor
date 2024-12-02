const { app, autoUpdater, dialog } = require('electron')
const { Octokit } = require('octokit')
const { compare } = require('compare-versions')

const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')

const package_data = require('../../package.json')

class UpdaterService {
  _log = (obj) => console.log('UpdaterService =>', obj)

  constructor(UPDATE_SERVER) {
    this.update_uri = `${UPDATE_SERVER}/update/${process.platform}/${app.getVersion()}`

    autoUpdater.setFeedURL({ url: this.update_uri })
    autoUpdater.on('update-downloaded', this.handleAutoUpdaterDownload)
  }

  get isPortable() {
    var exec_path = path.dirname(process.execPath)
    var squirrel_path = path.resolve(exec_path, '..', 'update.exe')

    return !fs.existsSync(squirrel_path)
  }

  async handleAutoUpdaterDownload() {
    let updateMessage = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: `${app.getName()} Update Downloaded`,
      detail: 'A new version has been downloaded. Restart the application to apply the updates.',
      cancelId: 1,
      defaultId: 0,
    })

    if (updateMessage.response === 0) autoUpdater.quitAndInstall()
  }

  async getLatestVersion() {
    let octokit = new Octokit({})
    let options = { owner: package_data.author, repo: package_data.name }
    let res = await octokit.request('GET /repos/{owner}/{repo}/releases/latest', options)
    this._latestRelease = res.data
    return res.data.tag_name.replace('v', '')
  }

  async portableUpdateDialog() {
    let updateMessage = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Open Github', 'Later'],
      title: `${app.getName()} Update Available`,
      detail: 'A new version is available, you should check GitHub.',
      cancelId: 1,
      defaultId: 0,
    })

    if (updateMessage.response == 0) exec('explorer.exe ' + this._latestRelease.html_url)
  }

  async promptSquirrelUpdateNotice() {
    let updateMessage = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Yes', 'No'],
      title: `${app.getName()} Update Available`,
      detail: `A new verision is available, do you want to download ${this._latestRelease.tag_name}?`,
      cancelId: 1,
      defaultId: 0,
    })

    if (updateMessage.response == 0) return autoUpdater.checkForUpdates()
  }

  async checkUpdates() {
    if (!app.isPackaged) return this._log('Not packaged, ignoring updates')

    let latestVersion = await this.getLatestVersion()
    let currentVersion = app.getVersion()

    if (!compare(currentVersion, latestVersion, '>=')) {
      this._log(`New version available: v${latestVersion}`)

      if (this.isPortable) return this.portableUpdateDialog()
      else return this.promptSquirrelUpdateNotice()
    }

    this._log('Already up to date!')
  }
}

module.exports = UpdaterService
