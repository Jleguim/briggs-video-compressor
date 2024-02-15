const { app, autoUpdater, dialog } = require('electron')
const { Octokit } = require('octokit')
const { compare } = require('compare-versions')
const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')

const pkg = require('../package.json')
const server = 'https://hazel-test-beta.vercel.app'
const url = `${server}/update/${process.platform}/${app.getVersion()}`

autoUpdater.setFeedURL({ url })

autoUpdater.on('update-downloaded', async function () {
  let updateMessage = await dialog.showMessageBox({
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: `${pkg.readableName} Update Downloaded`,
    detail: 'A new version has been downloaded. Restart the application to apply the updates.',
    cancelId: 1,
    defaultId: 0,
  })

  if (updateMessage.response === 0) autoUpdater.quitAndInstall()
})

autoUpdater.on('error', function (message) {
  console.error('There was a problem updating the application')
  console.error(message)
})

class Updater {
  constructor() {
    this.octokit = new Octokit({})
  }

  get hasLatestVersion() {
    let latestVersion = this.latestRelease.tag_name.replace('v', '') // Removes v from v1.0.0
    return compare(app.getVersion(), latestVersion, '>=')
  }

  async getLatestVersion() {
    let options = { owner: pkg.author, repo: pkg.name }
    let res = await this.octokit.request('GET /repos/{owner}/{repo}/releases/latest', options)
    this.latestRelease = res.data
    return this.latestRelease
  }

  get isPortableApp() {
    return !this.checkSquirrelUpdateExe()
  }

  checkSquirrelUpdateExe() {
    return fs.existsSync(path.resolve(path.dirname(process.execPath), '..', 'update.exe'))
  }

  async promptPortableUpdateNotice() {
    let updateMessage = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Open Github', 'Later'],
      title: `${pkg.readableName} Update Available`,
      detail: 'A new version is available, you should check GitHub.',
      cancelId: 1,
      defaultId: 0,
    })

    if (updateMessage.response == 0) exec('explorer.exe ' + this.latestRelease.html_url)
  }

  async promptSquirrelUpdateNotice() {
    let updateMessage = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Yes', 'No'],
      title: `${pkg.readableName} Update Available`,
      detail: `A new verision is available, do you want to download ${this.latestRelease.tag_name}?`,
      cancelId: 1,
      defaultId: 0,
    })

    if (updateMessage.response == 0) return autoUpdater.checkForUpdates()
  }

  async checkForUpdates() {
    console.log('Checking for updates...')
    await this.getLatestVersion()

    if (!app.isPackaged) return
    if (this.hasLatestVersion) return

    console.log('New version available: ' + this.latestRelease.tag_name)

    if (this.isPortableApp) this.promptPortableUpdateNotice()
    else this.promptSquirrelUpdateNotice()
  }
}

module.exports = Updater
