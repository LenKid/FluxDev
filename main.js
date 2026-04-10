const { app, BrowserWindow, ipcMain, dialog } = require('electron/main')
const path = require('node:path')
const fs = require('node:fs/promises')
const { spawn, spawnSync } = require('node:child_process')
const ElectronStore = require('electron-store')
const Store = ElectronStore.default || ElectronStore

const PROJECTS_FILE = 'projects.json'
const runningProcesses = new Map()
const isWindows = process.platform === 'win32'
const store = new Store({
    name: 'fluxdev',
    defaults: {
        projects: []
    }
})

const getLegacyProjectsFilePath = () => path.join(app.getPath('userData'), PROJECTS_FILE)

const normalizeCommands = (commands) => {
    if (!Array.isArray(commands)) {
        return []
    }

    return commands
        .map((command) => String(command).trim())
        .filter(Boolean)
}

const readProjects = async () => {
    const projects = store.get('projects', [])
    return Array.isArray(projects) ? projects : []
}

const saveProjects = async (projects) => {
    store.set('projects', projects)
}

const migrateLegacyProjects = async () => {
    const migrationKey = 'projectsMigratedFromJson'
    if (store.get(migrationKey, false)) {
        return
    }

    const legacyPath = getLegacyProjectsFilePath()
    const currentProjects = await readProjects()

    try {
        const raw = await fs.readFile(legacyPath, 'utf8')
        const legacyProjects = JSON.parse(raw)

        if (Array.isArray(legacyProjects) && legacyProjects.length > 0 && currentProjects.length === 0) {
            await saveProjects(legacyProjects)
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error
        }
    }

    store.set(migrationKey, true)
}

const broadcastRunUpdate = (payload) => {
    BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('projects:run-update', payload)
    })
}

const killTreeWindows = (pid) => {
    return new Promise((resolve) => {
        const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
            windowsHide: true
        })

        killer.on('close', () => resolve())
        killer.on('error', () => resolve())
    })
}

const terminateChildProcess = async (child) => {
    if (!child || !child.pid) {
        return
    }

    if (isWindows) {
        await killTreeWindows(child.pid)
        return
    }

    if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGTERM')

        await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                if (child.exitCode === null && child.signalCode === null) {
                    child.kill('SIGKILL')
                }
                resolve()
            }, 1200)

            child.once('close', () => {
                clearTimeout(timeout)
                resolve()
            })
        })
    }
}

const terminateChildProcessSync = (child) => {
    if (!child || !child.pid) {
        return
    }

    if (isWindows) {
        spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
            windowsHide: true
        })
        return
    }

    if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGTERM')
        child.kill('SIGKILL')
    }
}

const runProjectCommand = async (projectId, command) => {
    const projects = await readProjects()
    const project = projects.find((item) => item.id === projectId)

    if (!project) {
        throw new Error('Proyecto no encontrado.')
    }

    if (!project.commands.includes(command)) {
        throw new Error('El comando no pertenece al proyecto.')
    }

    if (runningProcesses.has(projectId)) {
        throw new Error('Este proyecto ya esta en ejecucion.')
    }

    const stats = await fs.stat(project.path)
    if (!stats.isDirectory()) {
        throw new Error('La ruta configurada no es una carpeta valida.')
    }

    const child = spawn(command, {
        cwd: project.path,
        shell: true,
        windowsHide: true,
        env: process.env
    })

    runningProcesses.set(projectId, child)

    broadcastRunUpdate({
        projectId,
        command,
        status: 'running',
        pid: child.pid,
        message: `Ejecutando: ${command}`
    })

    child.stdout?.on('data', (chunk) => {
        broadcastRunUpdate({
            projectId,
            command,
            status: 'log',
            message: String(chunk)
        })
    })

    child.stderr?.on('data', (chunk) => {
        broadcastRunUpdate({
            projectId,
            command,
            status: 'error-log',
            message: String(chunk)
        })
    })

    child.on('error', (error) => {
        runningProcesses.delete(projectId)
        broadcastRunUpdate({
            projectId,
            command,
            status: 'failed',
            message: error.message || 'No se pudo iniciar el comando.'
        })
    })

    child.on('close', (code, signal) => {
        runningProcesses.delete(projectId)
        broadcastRunUpdate({
            projectId,
            command,
            status: 'stopped',
            code,
            signal,
            message: `Proceso finalizado (code: ${code ?? 'null'}).`
        })
    })

    return {
        projectId,
        pid: child.pid,
        command,
        status: 'running'
    }
}

const stopProjectCommand = async (projectId) => {
    const child = runningProcesses.get(projectId)

    if (!child) {
        return {
            projectId,
            stopped: false,
            status: 'idle'
        }
    }

    await terminateChildProcess(child)
    runningProcesses.delete(projectId)

    broadcastRunUpdate({
        projectId,
        status: 'stopping',
        message: 'Deteniendo proceso...'
    })

    return {
        projectId,
        stopped: true,
        status: 'stopping'
    }
}

const validateProjectInput = (project) => {
    const name = String(project?.name ?? '').trim()
    const projectPath = String(project?.path ?? '').trim()
    const icon = String(project?.icon ?? '').trim()
    const commands = normalizeCommands(project?.commands)

    if (!name) {
        throw new Error('El nombre del proyecto es obligatorio.')
    }

    if (!projectPath) {
        throw new Error('La ruta del proyecto es obligatoria.')
    }

    if (commands.length === 0) {
        throw new Error('Debes ingresar al menos un comando.')
    }

    return {
        name,
        path: projectPath,
        commands,
        icon
    }
}

const registerIpcHandlers = () => {
    ipcMain.handle('projects:list', async () => readProjects())

    ipcMain.handle('projects:add', async (_event, payload) => {
        const projectData = validateProjectInput(payload)
        const project = {
            id: Date.now().toString(36),
            ...projectData,
            createdAt: new Date().toISOString()
        }
        const projects = await readProjects()
        projects.push(project)
        await saveProjects(projects)
        return project
    })

    ipcMain.handle('projects:update', async (_event, payload) => {
        const projectId = String(payload?.projectId ?? '').trim()

        if (!projectId) {
            throw new Error('Debes indicar el proyecto a editar.')
        }

        const projectData = validateProjectInput(payload?.project)
        const projects = await readProjects()
        const index = projects.findIndex((item) => item.id === projectId)

        if (index < 0) {
            throw new Error('Proyecto no encontrado para editar.')
        }

        const current = projects[index]
        const updatedProject = {
            ...current,
            ...projectData,
            id: current.id,
            createdAt: current.createdAt,
            updatedAt: new Date().toISOString()
        }

        projects[index] = updatedProject
        await saveProjects(projects)
        return updatedProject
    })

    ipcMain.handle('projects:delete', async (_event, payload) => {
        const projectId = String(payload?.projectId ?? '').trim()

        if (!projectId) {
            throw new Error('Debes indicar el proyecto a eliminar.')
        }

        const projects = await readProjects()
        const exists = projects.some((item) => item.id === projectId)

        if (!exists) {
            throw new Error('Proyecto no encontrado para eliminar.')
        }

        const runningChild = runningProcesses.get(projectId)
        if (runningChild) {
            await terminateChildProcess(runningChild)
            runningProcesses.delete(projectId)
        }

        const filteredProjects = projects.filter((item) => item.id !== projectId)
        await saveProjects(filteredProjects)

        broadcastRunUpdate({
            projectId,
            status: 'deleted',
            message: 'Proyecto eliminado.'
        })

        return {
            projectId,
            deleted: true
        }
    })

    ipcMain.handle('projects:run', async (_event, payload) => {
        const projectId = String(payload?.projectId ?? '').trim()
        const command = String(payload?.command ?? '').trim()

        if (!projectId || !command) {
            throw new Error('Proyecto y comando son obligatorios.')
        }

        return runProjectCommand(projectId, command)
    })

    ipcMain.handle('projects:stop', async (_event, payload) => {
        const projectId = String(payload?.projectId ?? '').trim()

        if (!projectId) {
            throw new Error('Debes indicar el proyecto a detener.')
        }

        return stopProjectCommand(projectId)
    })

    ipcMain.handle('projects:running', async () => Array.from(runningProcesses.keys()))

    ipcMain.handle('dialog:pick-directory', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        })

        if (result.canceled || result.filePaths.length === 0) {
            return ''
        }

        return result.filePaths[0]
    })

    ipcMain.handle('dialog:pick-icon', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                {
                    name: 'Images',
                    extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'ico']
                }
            ]
        })

        if (result.canceled || result.filePaths.length === 0) {
            return ''
        }

        return result.filePaths[0]
    })
}

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1100,
        height: 760,
        minWidth: 900,
        minHeight: 620,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'public', 'FluxLogo.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.removeMenu()

    win.loadFile(path.join('renderer', 'index.html'))
}

app.whenReady().then(() => {
    migrateLegacyProjects()
        .catch((error) => {
            console.error('No se pudo migrar el almacenamiento legado de proyectos:', error)
        })
        .finally(() => {
            registerIpcHandlers()
            createWindow()

            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    createWindow()
                }
            })
        })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('before-quit', () => {
    runningProcesses.forEach((child) => {
        terminateChildProcessSync(child)
    })
    runningProcesses.clear()
})
