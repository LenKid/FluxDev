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
    toggleFavorite: (projectId) => ipcRenderer.invoke('projects:toggle-favorite', { projectId }),
    autoDetectScan: () => ipcRenderer.invoke('projects:auto-detect-scan'),
    autoDetectApply: (projects) => ipcRenderer.invoke('projects:auto-detect-apply', { projects }),
    clearAll: () => ipcRenderer.invoke('projects:clear-all'),
    gitStatus: (projectId) => ipcRenderer.invoke('projects:git-status', { projectId }),
    exportData: () => ipcRenderer.invoke('projects:export'),
    importData: () => ipcRenderer.invoke('projects:import'),
    run: (projectId, command, profileId = '') => ipcRenderer.invoke('projects:run', { projectId, command, profileId }),
    runAll: (projectId, profileId = '') => ipcRenderer.invoke('projects:run-all', { projectId, profileId }),
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

contextBridge.exposeInMainWorld('terminalApi', {
    create: (payload) => ipcRenderer.invoke('terminal:create', payload),
    write: (payload) => ipcRenderer.invoke('terminal:write', payload),
    resize: (payload) => ipcRenderer.invoke('terminal:resize', payload),
    clear: (payload) => ipcRenderer.invoke('terminal:clear', payload),
    close: (payload) => ipcRenderer.invoke('terminal:close', payload),
    onUpdate: (listener) => {
        const subscription = (_event, payload) => listener(payload)
        ipcRenderer.on('terminal:update', subscription)

        return () => {
            ipcRenderer.removeListener('terminal:update', subscription)
        }
    }
})