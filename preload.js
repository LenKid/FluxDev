const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
})

contextBridge.exposeInMainWorld('projectsApi', {
    list: () => ipcRenderer.invoke('projects:list'),
    add: (project) => ipcRenderer.invoke('projects:add', project),
    update: (projectId, project) => ipcRenderer.invoke('projects:update', { projectId, project }),
    delete: (projectId) => ipcRenderer.invoke('projects:delete', { projectId }),
    run: (projectId, command) => ipcRenderer.invoke('projects:run', { projectId, command }),
    stop: (projectId) => ipcRenderer.invoke('projects:stop', { projectId }),
    running: () => ipcRenderer.invoke('projects:running'),
    pickDirectory: () => ipcRenderer.invoke('dialog:pick-directory'),
    pickIcon: () => ipcRenderer.invoke('dialog:pick-icon'),
    onRunUpdate: (listener) => {
        const subscription = (_event, payload) => listener(payload)
        ipcRenderer.on('projects:run-update', subscription)

        return () => {
            ipcRenderer.removeListener('projects:run-update', subscription)
        }
    }
})