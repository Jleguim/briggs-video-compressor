const { contextBridge, ipcRenderer } = require('electron')

var settings = {
  get: () => ipcRenderer.invoke('settings:get'),
  set: (newSettings) => ipcRenderer.invoke('settings:set', newSettings),
}

var ffmpeg = {
  getEncoders: () => ipcRenderer.invoke('ffmpeg:getEncoders'),
  start: (opts) => ipcRenderer.invoke('ffmpeg:start', opts),
  abort: () => ipcRenderer.invoke('ffmpeg:abort'),
  //handlers
  whenStarted: (cb) => ipcRenderer.on('ffmpeg:started', (e, data) => cb(data)),
  onUpdate: (cb) => ipcRenderer.on('ffmpeg:update', (e, data) => cb(data)),
  whenFinished: (cb) => ipcRenderer.on('ffmpeg:finished', (e, data) => cb(data)),
}

contextBridge.exposeInMainWorld('app', {
  settings,
  ffmpeg,
  getInfo: () => ipcRenderer.invoke('app:info'),
  openBrowser: (url) => ipcRenderer.invoke('app:openBrowser', url),
  fileSelect: (opts) => ipcRenderer.invoke('app:fileSelect', opts),
})
