const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ipc', {
  promptVideoSelect: () => ipcRenderer.invoke('dialog:promptVideoSelect'),
  beginCompression: (videos, encoder, sizeTarget) =>
    ipcRenderer.invoke('compression:start', videos, encoder, sizeTarget),
  finishedCompression: () => ipcRenderer.invoke('compression:finished'),
  abortCompression: () => ipcRenderer.invoke('compression:abortCompression'),
})
