const { app, BrowserWindow, ipcMain, dialog } = require('electron/main')
const path = require('node:path')
const fs = require('node:fs/promises')
const { spawn, spawnSync } = require('node:child_process')
const ElectronStore = require('electron-store')
const pty = require('node-pty')
const Store = ElectronStore.default || ElectronStore

const PROJECTS_FILE = 'projects.json'
const runningProcesses = new Map()
const runningSequences = new Map()
const terminalSessions = new Map()
const isWindows = process.platform === 'win32'

app.setName('FluxDev')

if (isWindows && typeof app.setAppUserModelId === 'function') {
    app.setAppUserModelId('LenKid.FluxDev')
}

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

const parseEnvironmentText = (value) => {
    const environment = {}
    const raw = String(value ?? '')

    raw.split('\n').forEach((line) => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) {
            return
        }

        const separatorIndex = trimmed.indexOf('=')
        if (separatorIndex <= 0) {
            return
        }

        const key = trimmed.slice(0, separatorIndex).trim()
        const entryValue = trimmed.slice(separatorIndex + 1).trim()

        if (!key) {
            return
        }

        environment[key] = entryValue
    })

    return environment
}

const normalizeEnvironmentProfile = (profile, index = 0) => {
    const name = String(profile?.name ?? '').trim()
    const id = String(profile?.id || `profile-${Date.now().toString(36)}-${index}`).trim()
    const environmentSource = profile?.environment ?? profile?.env ?? profile?.variables ?? profile?.environmentText ?? ''
    const environment = typeof environmentSource === 'string'
        ? parseEnvironmentText(environmentSource)
        : Object.fromEntries(
            Object.entries(environmentSource || {})
                .map(([key, value]) => [String(key).trim(), String(value ?? '').trim()])
                .filter(([key]) => Boolean(key))
        )

    return {
        id,
        name,
        environment
    }
}

const normalizeEnvironmentProfiles = (profiles) => {
    if (!Array.isArray(profiles)) {
        return []
    }

    return profiles
        .map((profile, index) => normalizeEnvironmentProfile(profile, index))
        .filter((profile) => profile.name || Object.keys(profile.environment).length > 0)
}

const resolveProjectEnvironmentProfile = (project, profileId) => {
    const profiles = Array.isArray(project?.environmentProfiles) ? project.environmentProfiles : []

    if (!profiles.length) {
        return null
    }

    const normalizedProfileId = String(profileId ?? project?.defaultEnvironmentProfileId ?? profiles[0].id ?? '').trim()
    return profiles.find((profile) => profile.id === normalizedProfileId) || profiles[0] || null
}

const resolveRuntimeEnvironment = (project, profileId) => {
    const profile = resolveProjectEnvironmentProfile(project, profileId)

    return {
        profile,
        env: {
            ...process.env,
            ...(profile?.environment || {})
        }
    }
}

const readProjects = async () => {
    const projects = store.get('projects', [])
    return Array.isArray(projects) ? projects : []
}

const saveProjects = async (projects) => {
    store.set('projects', projects)
}

const sanitizeImportedProjects = (payloadProjects) => {
    if (!Array.isArray(payloadProjects)) {
        throw new Error('El archivo no contiene una lista valida de proyectos.')
    }

    const seenIds = new Set()

    return payloadProjects.map((rawProject, index) => {
        const validated = validateProjectInput(rawProject)
        const createdAt = String(rawProject?.createdAt || new Date().toISOString())
        const updatedAt = rawProject?.updatedAt ? String(rawProject.updatedAt) : undefined
        let id = String(rawProject?.id || `imported-${Date.now().toString(36)}-${index}`)

        if (!id || seenIds.has(id)) {
            id = `imported-${Date.now().toString(36)}-${index}`
        }

        seenIds.add(id)

        return {
            id,
            ...validated,
            createdAt,
            updatedAt
        }
    })
}

const exportProjectsToFile = async () => {
    const projects = await readProjects()
    const now = new Date()
    const stamp = now.toISOString().slice(0, 10)

    const result = await dialog.showSaveDialog({
        title: 'Exportar proyectos FluxDev',
        defaultPath: `fluxdev-backup-${stamp}.json`,
        filters: [
            {
                name: 'JSON',
                extensions: ['json']
            }
        ]
    })

    if (result.canceled || !result.filePath) {
        return {
            canceled: true
        }
    }

    const payload = {
        app: 'FluxDev',
        schemaVersion: 1,
        exportedAt: now.toISOString(),
        projects
    }

    await fs.writeFile(result.filePath, JSON.stringify(payload, null, 2), 'utf8')

    return {
        canceled: false,
        filePath: result.filePath,
        count: projects.length
    }
}

const importProjectsFromFile = async () => {
    const result = await dialog.showOpenDialog({
        title: 'Importar proyectos FluxDev',
        properties: ['openFile'],
        filters: [
            {
                name: 'JSON',
                extensions: ['json']
            }
        ]
    })

    if (result.canceled || result.filePaths.length === 0) {
        return {
            canceled: true
        }
    }

    if (runningProcesses.size > 0) {
        throw new Error('Deten los procesos en ejecucion antes de importar datos.')
    }

    const selectedPath = result.filePaths[0]
    const raw = await fs.readFile(selectedPath, 'utf8')
    const parsed = JSON.parse(raw)

    const projectsPayload = Array.isArray(parsed) ? parsed : parsed?.projects
    const importedProjects = sanitizeImportedProjects(projectsPayload)

    await saveProjects(importedProjects)

    return {
        canceled: false,
        filePath: selectedPath,
        count: importedProjects.length
    }
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

const broadcastTerminalUpdate = (payload) => {
    BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('terminal:update', payload)
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

const getInteractiveShell = () => {
    if (isWindows) {
        return {
            command: process.env.COMSPEC || 'powershell.exe',
            args: process.env.COMSPEC ? ['/K'] : ['-NoLogo', '-NoExit']
        }
    }

    return {
        command: process.env.SHELL || '/bin/bash',
        args: ['-i']
    }
}

const getProjectById = async (projectId) => {
    const projects = await readProjects()
    return projects.find((item) => item.id === projectId) || null
}

const writeTerminalOutput = (sessionId, data, isError = false) => {
    broadcastTerminalUpdate({
        sessionId,
        type: isError ? 'stderr' : 'stdout',
        data: String(data)
    })
}

const createTerminalSession = async (payload = {}) => {
    const sessionId = String(payload.sessionId || Date.now().toString(36))
    const requestedProjectId = String(payload.projectId || '').trim()
    const requestedProfileId = String(payload.profileId || '').trim()
    const customCwd = String(payload.cwd || '').trim()
    const initialCommand = String(payload.initialCommand || '').trim()

    if (terminalSessions.has(sessionId)) {
        return {
            sessionId,
            reused: true
        }
    }

    let cwd = app.getPath('home')
    let runtimeEnv = process.env

    if (requestedProjectId) {
        const project = await getProjectById(requestedProjectId)
        if (!project) {
            throw new Error('Proyecto no encontrado para la terminal.')
        }

        cwd = project.path
        runtimeEnv = resolveRuntimeEnvironment(project, requestedProfileId).env
    } else if (customCwd) {
        cwd = customCwd
    }

    let ptyProcess

    try {
        const shell = getInteractiveShell()
        ptyProcess = pty.spawn(shell.command, shell.args, {
            name: 'xterm-256color',
            cols: 80,
            rows: 30,
            cwd,
            env: runtimeEnv,
            encoding: 'utf8',
            useConpty: isWindows
        })
    } catch (error) {
        throw new Error(error.message || 'No se pudo iniciar la terminal.')
    }

    terminalSessions.set(sessionId, ptyProcess)

    ptyProcess.onData((chunk) => writeTerminalOutput(sessionId, chunk, false))

    ptyProcess.onExit(({ exitCode, signal }) => {
        terminalSessions.delete(sessionId)
        broadcastTerminalUpdate({
            sessionId,
            type: 'exit',
            data: `Terminal cerrada (code: ${exitCode ?? 'null'}, signal: ${signal ?? 'null'})`
        })
    })

    if (initialCommand) {
        ptyProcess.write(`${initialCommand}\r`)
    }

    broadcastTerminalUpdate({
        sessionId,
        type: 'ready',
        data: `Terminal lista en ${cwd}`,
        cwd
    })

    return {
        sessionId,
        cwd
    }
}

const writeToTerminalSession = async (payload = {}) => {
    const sessionId = String(payload.sessionId || '').trim()
    const data = String(payload.data || '')

    if (!sessionId) {
        throw new Error('Debes indicar la terminal destino.')
    }

    const ptyProcess = terminalSessions.get(sessionId)
    if (!ptyProcess) {
        throw new Error('La terminal ya no existe.')
    }

    ptyProcess.write(data)
}

const resizeTerminalSession = async (payload = {}) => {
    const sessionId = String(payload.sessionId || '').trim()
    const cols = Number(payload.cols)
    const rows = Number(payload.rows)

    if (!sessionId) {
        return
    }

    const ptyProcess = terminalSessions.get(sessionId)
    if (!ptyProcess) {
        return
    }

    if (Number.isFinite(cols) && Number.isFinite(rows) && cols > 0 && rows > 0) {
        ptyProcess.resize(cols, rows)
    }
}

const clearTerminalSession = async (payload = {}) => {
    const sessionId = String(payload.sessionId || '').trim()
    if (!sessionId) {
        return
    }

    broadcastTerminalUpdate({
        sessionId,
        type: 'clear'
    })
}

const closeTerminalSession = async (payload = {}) => {
    const sessionId = String(payload.sessionId || '').trim()

    if (!sessionId) {
        return {
            closed: false
        }
    }

    const ptyProcess = terminalSessions.get(sessionId)
    if (!ptyProcess) {
        return {
            closed: false
        }
    }

    try {
        ptyProcess.kill()
    } catch {
        // no-op
    }
    terminalSessions.delete(sessionId)

    broadcastTerminalUpdate({
        sessionId,
        type: 'closed',
        data: 'Terminal cerrada manualmente.'
    })

    return {
        closed: true
    }
}

const runProjectCommand = async (projectId, command, profileId = '') => {
    const projects = await readProjects()
    const project = projects.find((item) => item.id === projectId)

    if (!project) {
        throw new Error('Proyecto no encontrado.')
    }

    if (!project.commands.includes(command)) {
        throw new Error('El comando no pertenece al proyecto.')
    }

    if (runningProcesses.has(projectId) || runningSequences.has(projectId)) {
        throw new Error('Este proyecto ya esta en ejecucion.')
    }

    const stats = await fs.stat(project.path)
    if (!stats.isDirectory()) {
        throw new Error('La ruta configurada no es una carpeta valida.')
    }

    const startPromise = spawnProjectCommandProcess(project, command, { profileId })
    void startPromise.catch(() => {
        // El estado final se comunica por eventos broadcastRunUpdate.
    })

    const runningChild = runningProcesses.get(projectId)

    return {
        projectId,
        pid: runningChild?.pid,
        command,
        status: 'running'
    }
}

const stopProjectCommand = async (projectId) => {
    const sequenceController = runningSequences.get(projectId)
    const child = runningProcesses.get(projectId) || sequenceController?.child

    if (!child) {
        if (sequenceController) {
            sequenceController.canceled = true
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

        return {
            projectId,
            stopped: false,
            status: 'idle'
        }
    }

    if (sequenceController) {
        sequenceController.canceled = true
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
    const favorite = Boolean(project?.favorite)
    const environmentProfiles = normalizeEnvironmentProfiles(project?.environmentProfiles)
    const requestedDefaultProfileId = String(project?.defaultEnvironmentProfileId ?? '').trim()
    const defaultEnvironmentProfileId = environmentProfiles.some((profile) => profile.id === requestedDefaultProfileId)
        ? requestedDefaultProfileId
        : (environmentProfiles[0]?.id || '')

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
        icon,
        favorite,
        environmentProfiles,
        defaultEnvironmentProfileId
    }
}

const runCommandInProject = async (cwd, command, args = []) => {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            env: process.env,
            windowsHide: true
        })

        let stdout = ''
        let stderr = ''

        child.stdout?.on('data', (chunk) => {
            stdout += String(chunk)
        })

        child.stderr?.on('data', (chunk) => {
            stderr += String(chunk)
        })

        child.on('error', (error) => reject(error))

        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr })
                return
            }

            reject(new Error(stderr || stdout || `Command failed: ${command}`))
        })
    })
}

const spawnProjectCommandProcess = async (project, command, options = {}) => {
    const { emitCloseStatus = true, startMessage = `Ejecutando: ${command}`, controller = null, profileId = '' } = options
    const runtimeEnv = resolveRuntimeEnvironment(project, profileId).env

    return new Promise((resolve, reject) => {
        const child = spawn(command, {
            cwd: project.path,
            shell: true,
            windowsHide: true,
            env: runtimeEnv
        })

        runningProcesses.set(project.id, child)

        if (controller) {
            controller.child = child
        }

        broadcastRunUpdate({
            projectId: project.id,
            command,
            status: 'running',
            pid: child.pid,
            message: startMessage
        })

        child.stdout?.on('data', (chunk) => {
            broadcastRunUpdate({
                projectId: project.id,
                command,
                status: 'log',
                message: String(chunk)
            })
        })

        child.stderr?.on('data', (chunk) => {
            broadcastRunUpdate({
                projectId: project.id,
                command,
                status: 'error-log',
                message: String(chunk)
            })
        })

        child.on('error', (error) => {
            runningProcesses.delete(project.id)

            if (controller && controller.child === child) {
                controller.child = null
            }

            broadcastRunUpdate({
                projectId: project.id,
                command,
                status: 'failed',
                message: error.message || 'No se pudo iniciar el comando.'
            })

            reject(error)
        })

        child.on('close', (code, signal) => {
            runningProcesses.delete(project.id)

            if (controller && controller.child === child) {
                controller.child = null
            }

            if (emitCloseStatus) {
                broadcastRunUpdate({
                    projectId: project.id,
                    command,
                    status: 'stopped',
                    code,
                    signal,
                    message: `Proceso finalizado (code: ${code ?? 'null'}).`
                })
            }

            if (code === 0) {
                resolve({
                    projectId: project.id,
                    pid: child.pid,
                    command,
                    status: 'running',
                    code,
                    signal
                })
                return
            }

            reject(new Error(`Command failed: ${command}`))
        })
    })
}

const runProjectCommandSequence = async (projectId, profileId = '') => {
    const project = await getProjectById(projectId)

    if (!project) {
        throw new Error('Proyecto no encontrado.')
    }

    if (runningProcesses.has(projectId) || runningSequences.has(projectId)) {
        throw new Error('Este proyecto ya esta en ejecucion.')
    }

    const commands = Array.isArray(project.commands) ? project.commands : []
    const selectedProfileId = String(profileId || project?.defaultEnvironmentProfileId || '').trim()

    if (commands.length === 0) {
        throw new Error('El proyecto no tiene comandos para ejecutar.')
    }

    const controller = {
        canceled: false,
        child: null
    }

    runningSequences.set(projectId, controller)

    void (async () => {
        try {
            for (let index = 0; index < commands.length; index += 1) {
                if (controller.canceled) {
                    break
                }

                const command = commands[index]
                await spawnProjectCommandProcess(project, command, {
                    emitCloseStatus: false,
                    controller,
                    startMessage: `Paso ${index + 1}/${commands.length}: ${command}`,
                    profileId: selectedProfileId
                })
            }

            if (!controller.canceled) {
                broadcastRunUpdate({
                    projectId,
                    command: commands[commands.length - 1],
                    status: 'stopped',
                    message: `Multi-run finalizado (${commands.length} pasos).`
                })
            }
        } catch (error) {
            if (!controller.canceled) {
                broadcastRunUpdate({
                    projectId,
                    command: commands[commands.length - 1],
                    status: 'failed',
                    message: error.message || 'No se pudo completar el multi-run.'
                })
            }
        } finally {
            runningSequences.delete(projectId)
        }
    })()

    return {
        projectId,
        commandCount: commands.length,
        status: 'running'
    }
}

const getGitStatusForProject = async (projectId) => {
    const project = await getProjectById(projectId)

    if (!project) {
        throw new Error('Proyecto no encontrado para consultar Git.')
    }

    try {
        await runCommandInProject(project.path, 'git', ['rev-parse', '--is-inside-work-tree'])
    } catch {
        return {
            projectId,
            hasGit: false,
            branch: '',
            dirtyCount: 0
        }
    }

    const branchResult = await runCommandInProject(project.path, 'git', ['branch', '--show-current'])
    const statusResult = await runCommandInProject(project.path, 'git', ['status', '--porcelain'])

    const branch = String(branchResult.stdout || '').trim()
    const dirtyCount = String(statusResult.stdout || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean).length

    return {
        projectId,
        hasGit: true,
        branch,
        dirtyCount
    }
}

const guessCommandsFromPackageJson = (packageJson) => {
    const scripts = packageJson?.scripts || {}

    if (typeof scripts.dev === 'string') {
        return ['npm install', 'npm run dev']
    }

    if (typeof scripts.start === 'string') {
        return ['npm install', 'npm start']
    }

    return ['npm install']
}

const detectFrameworkIcon = (packageJson) => {
    const dependencies = {
        ...(packageJson?.dependencies || {}),
        ...(packageJson?.devDependencies || {})
    }

    const has = (pkgName) => typeof dependencies[pkgName] === 'string'

    if (has('next')) return 'devicon:nextjs'
    if (has('nuxt') || has('nuxt3')) return 'devicon:nuxtjs'
    if (has('@angular/core')) return 'devicon:angular'
    if (has('vue')) return 'devicon:vuejs'
    if (has('svelte') || has('@sveltejs/kit')) return 'devicon:svelte'
    if (has('react')) return 'devicon:react'
    if (has('nestjs') || has('@nestjs/core')) return 'devicon:nestjs'
    if (has('express')) return 'devicon:express'
    if (has('fastify')) return 'devicon:fastify'
    if (has('astro')) return 'devicon:astro'
    if (has('vite')) return 'devicon:vitejs'
    if (has('typescript')) return 'devicon:typescript'
    if (has('javascript')) return 'devicon:javascript'

    return ''
}

const toPathKey = (inputPath) => {
    return path.resolve(String(inputPath || '')).toLowerCase()
}

const collectDetectedProjects = async (rootPath) => {
    const ignoredFolders = new Set(['node_modules', '.git', 'out', 'dist', 'build', '.next', '.nuxt', 'coverage'])
    const bucket = []
    const seenPaths = new Set()
    let entries = []

    try {
        entries = await fs.readdir(rootPath, { withFileTypes: true })
    } catch {
        return bucket
    }

    const folders = entries.filter((entry) => entry.isDirectory() && !ignoredFolders.has(entry.name))

    const tryAddProjectFromFolder = async (folderPath, fallbackName) => {
        const packagePath = path.join(folderPath, 'package.json')

        try {
            const raw = await fs.readFile(packagePath, 'utf8')
            const parsed = JSON.parse(raw)
            const key = toPathKey(folderPath)

            if (seenPaths.has(key)) {
                return
            }

            seenPaths.add(key)
            bucket.push({
                path: folderPath,
                name: String(parsed?.name || fallbackName).trim(),
                commands: guessCommandsFromPackageJson(parsed),
                icon: detectFrameworkIcon(parsed)
            })
        } catch {
            // ignore folders without valid package.json
        }
    }

    for (const folder of folders) {
        const folderPath = path.join(rootPath, folder.name)
        await tryAddProjectFromFolder(folderPath, folder.name)

        let childEntries = []

        try {
            childEntries = await fs.readdir(folderPath, { withFileTypes: true })
        } catch {
            childEntries = []
        }

        const childFolders = childEntries.filter((entry) => entry.isDirectory() && !ignoredFolders.has(entry.name))

        for (const child of childFolders) {
            const childPath = path.join(folderPath, child.name)
            await tryAddProjectFromFolder(childPath, child.name)
        }
    }

    return bucket
}

const autoDetectScanProjects = async () => {
    const result = await dialog.showOpenDialog({
        title: 'Selecciona carpeta base para auto-deteccion',
        properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
        return {
            canceled: true,
            foundCount: 0
        }
    }

    const basePath = result.filePaths[0]
    const detected = await collectDetectedProjects(basePath)

    if (detected.length === 0) {
        return {
            canceled: false,
            basePath,
            foundCount: 0,
            detected: []
        }
    }

    return {
        canceled: false,
        basePath,
        foundCount: detected.length,
        detected
    }
}

const autoDetectApplyProjects = async (selectedDetected) => {
    const normalizedSelection = Array.isArray(selectedDetected)
        ? selectedDetected
              .map((project) => {
                  try {
                      const validated = validateProjectInput(project)
                      return {
                          ...validated,
                          icon: validated.icon || ''
                      }
                  } catch {
                      return null
                  }
              })
              .filter(Boolean)
        : []

    const projects = await readProjects()
    const knownPaths = new Set(projects.map((project) => toPathKey(project.path)))
    const now = Date.now()

    const additions = normalizedSelection
        .filter((project) => !knownPaths.has(toPathKey(project.path)))
        .map((project, index) => ({
            id: `${(now + index).toString(36)}-auto`,
            name: project.name,
            path: project.path,
            commands: project.commands,
            icon: project.icon,
            favorite: false,
            createdAt: new Date().toISOString(),
            detectedAt: new Date().toISOString()
        }))

    if (additions.length > 0) {
        await saveProjects([...projects, ...additions])
    }

    return {
        canceled: false,
        selectedCount: normalizedSelection.length,
        addedCount: additions.length
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

        const sequenceController = runningSequences.get(projectId)
        const runningChild = runningProcesses.get(projectId) || sequenceController?.child
        if (runningChild) {
            if (sequenceController) {
                sequenceController.canceled = true
            }

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

    ipcMain.handle('projects:toggle-favorite', async (_event, payload) => {
        const projectId = String(payload?.projectId ?? '').trim()

        if (!projectId) {
            throw new Error('Debes indicar el proyecto a marcar como favorito.')
        }

        const projects = await readProjects()
        const index = projects.findIndex((item) => item.id === projectId)

        if (index < 0) {
            throw new Error('Proyecto no encontrado para favorito.')
        }

        const current = projects[index]
        const updated = {
            ...current,
            favorite: !Boolean(current.favorite),
            updatedAt: new Date().toISOString()
        }

        projects[index] = updated
        await saveProjects(projects)

        return {
            projectId,
            favorite: updated.favorite
        }
    })

    ipcMain.handle('projects:auto-detect-scan', async () => autoDetectScanProjects())

    ipcMain.handle('projects:auto-detect-apply', async (_event, payload) => {
        return autoDetectApplyProjects(payload?.projects)
    })

    ipcMain.handle('projects:clear-all', async () => {
        const projects = await readProjects()

        await Promise.all(projects.map((project) => stopProjectCommand(project.id)))

        for (const project of projects) {
            broadcastRunUpdate({
                projectId: project.id,
                status: 'deleted',
                message: 'Proyecto eliminado.'
            })
        }

        await saveProjects([])

        return {
            cleared: true,
            deletedCount: projects.length
        }
    })

    ipcMain.handle('projects:git-status', async (_event, payload) => {
        const projectId = String(payload?.projectId ?? '').trim()

        if (!projectId) {
            throw new Error('Debes indicar el proyecto para consultar Git.')
        }

        return getGitStatusForProject(projectId)
    })

    ipcMain.handle('projects:run', async (_event, payload) => {
        const projectId = String(payload?.projectId ?? '').trim()
        const command = String(payload?.command ?? '').trim()
        const profileId = String(payload?.profileId ?? '').trim()

        if (!projectId || !command) {
            throw new Error('Proyecto y comando son obligatorios.')
        }

        return runProjectCommand(projectId, command, profileId)
    })

    ipcMain.handle('projects:run-all', async (_event, payload) => {
        const projectId = String(payload?.projectId ?? '').trim()
        const profileId = String(payload?.profileId ?? '').trim()

        if (!projectId) {
            throw new Error('Debes indicar el proyecto a ejecutar.')
        }

        return runProjectCommandSequence(projectId, profileId)
    })

    ipcMain.handle('projects:stop', async (_event, payload) => {
        const projectId = String(payload?.projectId ?? '').trim()

        if (!projectId) {
            throw new Error('Debes indicar el proyecto a detener.')
        }

        return stopProjectCommand(projectId)
    })

    ipcMain.handle('projects:running', async () => Array.from(runningProcesses.keys()))
    ipcMain.handle('projects:export', async () => exportProjectsToFile())
    ipcMain.handle('projects:import', async () => importProjectsFromFile())

    ipcMain.handle('terminal:create', async (_event, payload) => createTerminalSession(payload))
    ipcMain.handle('terminal:write', async (_event, payload) => writeToTerminalSession(payload))
    ipcMain.handle('terminal:resize', async (_event, payload) => resizeTerminalSession(payload))
    ipcMain.handle('terminal:clear', async (_event, payload) => clearTerminalSession(payload))
    ipcMain.handle('terminal:close', async (_event, payload) => closeTerminalSession(payload))

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
        fullscreen: true,
        title: 'FluxDev',
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'public', 'FluxLogo.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.removeMenu()
    win.maximize()

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

    terminalSessions.forEach((child) => {
        terminateChildProcessSync(child)
    })
    terminalSessions.clear()
})
