const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ffmpeg', {
  // Methods
  promptVideoSelection: () => ipcRenderer.invoke('ffmpeg:promptVideoSelection'),
  start: (files, encoder, size) => ipcRenderer.invoke('ffmpeg:start', files, encoder, size),
  abort: () => ipcRenderer.invoke('ffmpeg:abort'),
  // Event handlers
  onStart: (cb) => ipcRenderer.on('ffmpeg:event:start', (e, queueData) => cb(queueData)),
  onWalk: (cb) => ipcRenderer.on('ffmpeg:event:walk', (e, queueData) => cb(queueData)),
  onFinish: (cb) => ipcRenderer.on('ffmpeg:event:finish', (e, queueData) => cb(queueData)),
})

contextBridge.exposeInMainWorld('app', {
  getVersion: () => ipcRenderer.invoke('app:version'),
  getName: () => ipcRenderer.invoke('app:name'),
})

contextBridge.exposeInMainWorld('logger', {
  // Methods
  status: (module, logText) => ipcRenderer.invoke('logging:status', module, logText),
  debug: (module, variables) => ipcRenderer.invoke('logging:debug', module, variables),
})
