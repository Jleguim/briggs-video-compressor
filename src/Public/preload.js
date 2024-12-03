const { contextBridge, ipcRenderer } = require('electron')

var settings = {
  get: () => ipcRenderer.invoke('settings:get'),
  set: (newSettings) => ipcRenderer.invoke('settings:set', newSettings),
}

var ffmpeg = {
  getEncoders: () => ipcRenderer.invoke('FFmpeg:getEncoders'),
  start: (opts) => ipcRenderer.invoke('FFmpeg:start', opts),
  abort: () => ipcRenderer.invoke('FFmpeg:abort'),
  // handlers
  whenStarted: (cb) => ipcRenderer.on('FFmpeg:started', (e, data) => cb(data)),
  whenFinished: (cb) => ipcRenderer.on('FFmpeg:finished', (e, data) => cb(data)),
  onUpdate: (cb) => ipcRenderer.on('FFmpeg:update', (e, data) => cb(data)),
}

contextBridge.exposeInMainWorld('app', {
  settings,
  ffmpeg,
  getInfo: () => ipcRenderer.invoke('app:info'),
  openReleaseNotes: () => ipcRenderer.invoke('app:openReleaseNotes'),
  fileSelect: (opts) => ipcRenderer.invoke('app:fileSelect', opts),
})
