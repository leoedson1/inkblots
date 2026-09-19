const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('inkNative', {
  open: () => ipcRenderer.invoke('open'),
  saveDialog: (suggested) => ipcRenderer.invoke('saveDialog', suggested),
  write: (p, text) => ipcRenderer.invoke('write', p, text),
  read: (p) => ipcRenderer.invoke('read', p),

  // synchronous read used by the Ink compiler to resolve INCLUDE lines
  readRelative: (basePath, name) => {
    const result = ipcRenderer.sendSync('readRelative', basePath, name);
    if (result.error) throw new Error(result.error);
    return result.content;
  },

  setEdited: (edited, name) => ipcRenderer.send('edited', edited, name),
  onMenu: (cb) => ipcRenderer.on('menu', (_e, cmd, arg) => cb(cmd, arg)),
  platform: process.platform,
  closeWindow: () => ipcRenderer.send('close-window'),
});
