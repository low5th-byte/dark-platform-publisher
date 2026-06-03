const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  posts: {
    get: () => ipcRenderer.invoke('posts:get'),
    schedule: (data) => ipcRenderer.invoke('posts:schedule', data),
    cancel: (id) => ipcRenderer.invoke('posts:cancel', id),
  },
  auth: {
    login: (platform) => ipcRenderer.invoke('auth:login', platform),
    loginClose: (platform) => ipcRenderer.invoke('auth:login-close', platform),
    status: (platform) => ipcRenderer.invoke('auth:status', platform),
  },
  onPostUpdate: (callback) => {
    const handler = (_, post) => callback(post);
    ipcRenderer.on('post:updated', handler);
    return () => ipcRenderer.removeListener('post:updated', handler);
  },
});
