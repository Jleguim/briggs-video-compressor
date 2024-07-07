const { contextBridge, ipcRenderer } = require('electron')

var settings = {
  get: () => ipcRenderer.invoke('settings:get'),
  set: (newSettings) => ipcRenderer.invoke('settings:set', newSettings),
}

var ffmpeg = {
  checkDependency: () => ipcRenderer.invoke('ffmpeg:checkDependency'),
  getEncoders: () => ipcRenderer.invoke('ffmpeg:getEncoders'),
  start: (opts) => ipcRenderer.invoke('ffmpeg:start', opts),
  abort: () => ipcRenderer.invoke('ffmpeg:abort'),
  //handlers
  whenStarted: (cb) => ipcRenderer.on('ffmpeg:started', (e, data) => cb(data)),
  onUpdate: (cb) => ipcRenderer.on('ffmpeg:update', (e, data) => cb(data)),
  whenFinished: (cb) => ipcRenderer.on('ffmpeg:finished', (e, data) => cb(data)),
  whenDownload: (cb) => ipcRenderer.on('ffmpeg:dependency:download', () => cb()),
  whenInstalled: (cb) => ipcRenderer.on('ffmpeg:dependency:installed', () => cb()),
}

contextBridge.exposeInMainWorld('app', {
  settings,
  ffmpeg,
  getInfo: () => ipcRenderer.invoke('app:info'),
  openReleaseNotes: () => ipcRenderer.invoke('app:openReleaseNotes'),
  fileSelect: (opts) => ipcRenderer.invoke('app:fileSelect', opts),
})
