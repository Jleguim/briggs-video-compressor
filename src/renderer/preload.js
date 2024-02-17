const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ffmpeg', {
  // Methods
  start: (files, encoder, size, output) => ipcRenderer.invoke('ffmpeg:start', files, encoder, size, output),
  abort: () => ipcRenderer.invoke('ffmpeg:abort'),
  getEncoders: () => ipcRenderer.invoke('ffmpeg:getEncoders'),
  // Event handlers
  onStart: (cb) => ipcRenderer.on('ffmpeg:event:start', (e, queueData) => cb(queueData)),
  onWalk: (cb) => ipcRenderer.on('ffmpeg:event:walk', (e, queueData) => cb(queueData)),
  onFinish: (cb) => ipcRenderer.on('ffmpeg:event:finish', (e, queueData) => cb(queueData)),
})

async function promptSelect(type, defaultPath) {
  if (type == 'videos') {
    return ipcRenderer.invoke('dialog:promptSelect', {
      filters: [{ name: 'Videos', extensions: ['mkv', 'avi', 'mp4'] }],
      properties: ['multiSelections'],
      defaultPath,
    })
  } else if (type == 'dir') {
    return ipcRenderer.invoke('dialog:promptSelect', { properties: ['openDirectory'], defaultPath })
  }
}

contextBridge.exposeInMainWorld('app', {
  getVersion: () => ipcRenderer.invoke('app:version'),
  getName: () => ipcRenderer.invoke('app:name'),
  promptFileSelect: (defaultPath) => promptSelect('videos', defaultPath),
  promptDirSelect: (defaultPath) => promptSelect('dir', defaultPath),
  get: () => ipcRenderer.invoke('settings:get'),
  save: (settings) => ipcRenderer.invoke('settings:save', settings),
})

contextBridge.exposeInMainWorld('logger', {
  // Methods
  status: (module, logText) => ipcRenderer.invoke('logging:status', module, logText),
  debug: (module, variables) => ipcRenderer.invoke('logging:debug', module, variables),
})
