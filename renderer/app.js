const form = document.getElementById('project-form')
const nameInput = document.getElementById('name')
const pathInput = document.getElementById('path')
const iconInput = document.getElementById('icon')
const commandsInput = document.getElementById('commands')
const environmentProfileNameInput = document.getElementById('environment-profile-name')
const environmentProfileVariablesInput = document.getElementById('environment-profile-variables')
const environmentProfileSaveButton = document.getElementById('environment-profile-save')
const environmentProfileCancelButton = document.getElementById('environment-profile-cancel')
const environmentProfilesList = document.getElementById('environment-profiles-list')
const browsePathButton = document.getElementById('browse-path')
const browseIconButton = document.getElementById('browse-icon')
const iconTemplateButtons = document.querySelectorAll('.icon-template')
const submitProjectButton = document.getElementById('submit-project')
const cancelEditButton = document.getElementById('cancel-edit')
const autoDetectButton = document.getElementById('auto-detect')
const exportDataButton = document.getElementById('export-data')
const importDataButton = document.getElementById('import-data')
const clearAllButton = document.getElementById('clear-all')
const detectModal = document.getElementById('detect-modal')
const environmentProfilesModal = document.getElementById('environment-profiles-modal')
const environmentProfilesModalProject = document.getElementById('environment-profiles-project')
const environmentProfilesCloseButton = document.getElementById('environment-profiles-close')
const detectSubtitle = document.getElementById('detect-subtitle')
const detectList = document.getElementById('detect-list')
const detectCancelButton = document.getElementById('detect-cancel')
const detectSelectAllButton = document.getElementById('detect-select-all')
const detectApplyButton = document.getElementById('detect-apply')
const formTitle = document.getElementById('form-title')
const formSubtitle = document.getElementById('form-subtitle')
const feedback = document.getElementById('feedback')
const projectSearchInput = document.getElementById('project-search')
const favoritesOnlyInput = document.getElementById('favorites-only')
const projectFilters = document.querySelector('.project-filters')
const projectsList = document.getElementById('projects-list')
const processesView = document.getElementById('processes-view')
const terminalView = document.getElementById('terminal-view')
const settingsView = document.getElementById('settings-view')
const terminalProjectSelect = document.getElementById('terminal-project-select')
const terminalProfileSelect = document.getElementById('terminal-profile-select')
const terminalOpenButton = document.getElementById('terminal-open')
const terminalClearButton = document.getElementById('terminal-clear')
const terminalCloseButton = document.getElementById('terminal-close')
const terminalContainer = document.getElementById('terminal-container')
const terminalStatus = document.getElementById('terminal-status')
const tabButtons = document.querySelectorAll('.tab-button')
const runtimeInfo = document.getElementById('runtime-info')
const runningProjectIds = new Set()
const processSnapshots = new Map()
const gitSnapshots = new Map()
const selectedEnvironmentProfileByProjectId = new Map()
let currentProjects = []
let editingProjectId = null
let editingEnvironmentProfileId = null
let projectEnvironmentProfiles = []
let projectDefaultEnvironmentProfileId = ''
let environmentProfilesTargetProjectId = ''
let activeTab = 'projects'
let projectSearchTerm = ''
let favoritesOnly = false
let detectedCandidates = []
let terminalSessionId = null
let terminalInstance = null
let terminalFitAddon = null
let terminalUpdateUnsubscribe = null
let terminalKeyListener = null
let terminalInitialized = false

const parseCommands = (commandsRaw) => {
	return commandsRaw
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
}

const parseEnvironmentVariablesText = (text) => {
	const environment = {}

	String(text ?? '')
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => Boolean(line) && !line.startsWith('#'))
		.forEach((line) => {
			const separatorIndex = line.indexOf('=')
			if (separatorIndex <= 0) {
				return
			}

			const key = line.slice(0, separatorIndex).trim()
			const value = line.slice(separatorIndex + 1).trim()

			if (key) {
				environment[key] = value
			}
		})

	return environment
}

const serializeEnvironmentVariables = (environment) => {
	return Object.entries(environment || {})
		.map(([key, value]) => `${key}=${value}`)
		.join('\n')
}

const getNormalizedProfileId = (project) => {
	const profiles = Array.isArray(project?.environmentProfiles) ? project.environmentProfiles : []
	const selected = selectedEnvironmentProfileByProjectId.get(project?.id)
	const defaultProfileId = String(project?.defaultEnvironmentProfileId || '').trim()
	const fallbackProfileId = String(profiles[0]?.id || '').trim()
	return String(selected || defaultProfileId || fallbackProfileId || '').trim()
}

const getProjectProfileOptions = (project) => {
	const profiles = Array.isArray(project?.environmentProfiles) ? project.environmentProfiles : []
	if (!profiles.length) {
		return '<option value="">Sin perfil</option>'
	}

	const activeProfileId = getNormalizedProfileId(project)
	return profiles
		.map((profile) => {
			const isSelected = profile.id === activeProfileId ? 'selected' : ''
			return `<option value="${escapeHtml(profile.id)}" ${isSelected}>${escapeHtml(profile.name || 'Perfil')}</option>`
		})
		.join('')
}

const renderEnvironmentProfiles = () => {
	if (!projectEnvironmentProfiles.length) {
		environmentProfilesList.innerHTML = `
			<article class="empty-state">
				<h3>Sin perfiles</h3>
				<p>Agrega al menos un perfil de entorno para guardar variables reutilizables.</p>
			</article>
		`
		return
	}

	const defaultProfileId = projectDefaultEnvironmentProfileId || projectEnvironmentProfiles[0]?.id || ''

	environmentProfilesList.innerHTML = projectEnvironmentProfiles.map((profile) => {
		const isDefault = profile.id === defaultProfileId
		const isEditing = profile.id === editingEnvironmentProfileId
		const variablesCount = Object.keys(profile.environment || {}).length

		return `
			<article class="environment-profile-item">
				<header>
					<strong>${escapeHtml(profile.name || 'Perfil')}</strong>
					${isDefault ? '<span class="environment-profile-chip">Por defecto</span>' : ''}
				</header>
				<p>${escapeHtml(serializeEnvironmentVariables(profile.environment)) || 'Sin variables definidas.'}</p>
				<p>${variablesCount} variable(s)</p>
				<div class="environment-profile-item-actions">
					<button type="button" class="environment-profile-default-button" data-profile-id="${escapeHtml(profile.id)}">Usar por defecto</button>
					<button type="button" class="environment-profile-edit-button" data-profile-id="${escapeHtml(profile.id)}">${isEditing ? 'Editando' : 'Editar'}</button>
					<button type="button" class="environment-profile-delete-button" data-profile-id="${escapeHtml(profile.id)}">Eliminar</button>
				</div>
			</article>
		`
	}).join('')
}

const openEnvironmentProfilesModal = (projectId) => {
	const project = currentProjects.find((item) => item.id === projectId)
	if (!project) {
		setFeedback('No se encontro el proyecto para administrar perfiles.', 'error')
		return
	}

	environmentProfilesTargetProjectId = projectId
	environmentProfilesModalProject.textContent = `${project.name} | ${project.path}`
	loadProjectProfilesIntoForm(project)
	environmentProfilesModal.classList.remove('is-hidden')
	environmentProfilesModal.setAttribute('aria-hidden', 'false')
}

const closeEnvironmentProfilesModal = () => {
	environmentProfilesTargetProjectId = ''
	environmentProfilesModal.classList.add('is-hidden')
	environmentProfilesModal.setAttribute('aria-hidden', 'true')
	resetEnvironmentProfileForm()
	projectEnvironmentProfiles = []
	projectDefaultEnvironmentProfileId = ''
	environmentProfilesModalProject.textContent = 'Selecciona un proyecto para administrar sus variables.'
}

const resetEnvironmentProfileForm = () => {
	editingEnvironmentProfileId = null
	environmentProfileNameInput.value = ''
	environmentProfileVariablesInput.value = ''
	environmentProfileSaveButton.textContent = 'Guardar perfil'
	environmentProfileCancelButton.hidden = true
}

const loadProjectProfilesIntoForm = (project) => {
	projectEnvironmentProfiles = Array.isArray(project?.environmentProfiles)
		? project.environmentProfiles.map((profile) => ({
			id: profile.id,
			name: profile.name,
			environment: { ...(profile.environment || {}) }
		}))
		: []
	projectDefaultEnvironmentProfileId = String(project?.defaultEnvironmentProfileId || projectEnvironmentProfiles[0]?.id || '')

	resetEnvironmentProfileForm()
	renderEnvironmentProfiles()
}

const startEnvironmentProfileEdit = (profileId) => {
	const profile = projectEnvironmentProfiles.find((item) => item.id === profileId)
	if (!profile) {
		return
	}

	editingEnvironmentProfileId = profileId
	environmentProfileNameInput.value = profile.name || ''
	environmentProfileVariablesInput.value = serializeEnvironmentVariables(profile.environment)
	environmentProfileSaveButton.textContent = 'Actualizar perfil'
	environmentProfileCancelButton.hidden = false
	renderEnvironmentProfiles()
}

const upsertEnvironmentProfile = () => {
	const name = environmentProfileNameInput.value.trim()
	const environment = parseEnvironmentVariablesText(environmentProfileVariablesInput.value)

	if (!name) {
		setFeedback('El nombre del perfil es obligatorio.', 'error')
		return
	}

	const nextProfile = {
		id: editingEnvironmentProfileId || `profile-${Date.now().toString(36)}`,
		name,
		environment
	}

	if (editingEnvironmentProfileId) {
		projectEnvironmentProfiles = projectEnvironmentProfiles.map((profile) => profile.id === editingEnvironmentProfileId ? nextProfile : profile)
	} else {
		projectEnvironmentProfiles = [...projectEnvironmentProfiles, nextProfile]
	}

	if (!projectDefaultEnvironmentProfileId) {
		projectDefaultEnvironmentProfileId = nextProfile.id
	}

	return persistEnvironmentProfilesToProject('Perfil de entorno guardado.')
}

const persistEnvironmentProfilesToProject = async (successMessage = 'Perfil de entorno guardado.') => {
	if (!environmentProfilesTargetProjectId) {
		setFeedback('No hay un proyecto seleccionado para guardar perfiles.', 'error')
		return
	}

	const project = currentProjects.find((item) => item.id === environmentProfilesTargetProjectId)
	if (!project) {
		setFeedback('No se encontro el proyecto seleccionado.', 'error')
		return
	}

	try {
		await window.projectsApi.update(environmentProfilesTargetProjectId, {
			...project,
			environmentProfiles: projectEnvironmentProfiles,
			defaultEnvironmentProfileId: projectDefaultEnvironmentProfileId || projectEnvironmentProfiles[0]?.id || ''
		})
		resetEnvironmentProfileForm()
		await loadProjects()
		openEnvironmentProfilesModal(environmentProfilesTargetProjectId)
		setFeedback(successMessage, 'success')
	} catch (error) {
		setFeedback(error?.message || 'No se pudieron guardar los perfiles de entorno.', 'error')
	}
}

const deleteEnvironmentProfile = async (profileId) => {
	projectEnvironmentProfiles = projectEnvironmentProfiles.filter((profile) => profile.id !== profileId)
	if (projectDefaultEnvironmentProfileId === profileId) {
		projectDefaultEnvironmentProfileId = projectEnvironmentProfiles[0]?.id || ''
	}
	if (editingEnvironmentProfileId === profileId) {
		resetEnvironmentProfileForm()
	}
	renderEnvironmentProfiles()
	await persistEnvironmentProfilesToProject('Perfil eliminado correctamente.')
}

const setDefaultEnvironmentProfile = async (profileId) => {
	projectDefaultEnvironmentProfileId = profileId
	renderEnvironmentProfiles()
	await persistEnvironmentProfilesToProject('Perfil predeterminado actualizado.')
}

const setFeedback = (message, type = 'info') => {
	feedback.textContent = message
	feedback.dataset.type = type
}

const setButtonLoading = (button, loading, label = '') => {
	if (!button) {
		return
	}

	if (!button.dataset.defaultLabel) {
		button.dataset.defaultLabel = button.textContent || ''
	}

	button.classList.toggle('is-loading', loading)
	button.disabled = loading
	button.textContent = loading ? label || button.dataset.defaultLabel : button.dataset.defaultLabel
}

const escapeHtml = (value) => {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
}

const formatCommands = (commands) => {
	return commands.map((command) => `<li>${escapeHtml(command)}</li>`).join('')
}

const formatCommandOptions = (commands) => {
	return commands
		.map((command) => `<option value="${escapeHtml(command)}">${escapeHtml(command)}</option>`)
		.join('')
}

const toFileUrl = (inputPath) => {
	const normalizedPath = inputPath.trim().replaceAll('\\', '/')
	const withLeadingSlash = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
	return encodeURI(`file://${withLeadingSlash}`)
}

const normalizeIconInput = (raw) => {
	const value = String(raw ?? '').trim()

	if (!value) {
		return ''
	}

	if (value.startsWith('devicon:')) {
		const name = value.replace('devicon:', '').trim().toLowerCase()
		return name ? `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${name}/${name}-original.svg` : ''
	}

	if (value.startsWith('simple:')) {
		const name = value.replace('simple:', '').trim().toLowerCase()
		return name ? `https://cdn.simpleicons.org/${name}` : ''
	}

	if (/^(https?:|file:|data:)/i.test(value)) {
		return value
	}

	if (value.includes('\\') || /^[A-Za-z]:\//.test(value) || /^[A-Za-z]:\\/.test(value)) {
		return toFileUrl(value)
	}

	return value
}

const getProjectInitial = (name) => {
	const clean = String(name ?? '').trim()
	return clean ? escapeHtml(clean.charAt(0).toUpperCase()) : 'P'
}

const getProjectNameById = (projectId) => {
	const project = currentProjects.find((item) => item.id === projectId)
	return project ? project.name : 'Proyecto'
}

const toDisplayProjects = (projects) => {
	const searchTerm = projectSearchTerm.trim().toLowerCase()

	return projects
		.filter((project) => {
			if (favoritesOnly && !project.favorite) {
				return false
			}

			if (!searchTerm) {
				return true
			}

			const name = String(project.name || '').toLowerCase()
			const path = String(project.path || '').toLowerCase()
			return name.includes(searchTerm) || path.includes(searchTerm)
		})
		.sort((a, b) => {
			const favDelta = Number(Boolean(b.favorite)) - Number(Boolean(a.favorite))
			if (favDelta !== 0) {
				return favDelta
			}

			return String(a.name).localeCompare(String(b.name))
		})
}

const getGitSummary = (projectId) => {
	const snapshot = gitSnapshots.get(projectId)

	if (!snapshot) {
		return 'Git: sin datos'
	}

	if (!snapshot.hasGit) {
		return 'Git: no es repositorio'
	}

	const dirtyLabel = snapshot.dirtyCount > 0 ? `${snapshot.dirtyCount} cambios` : 'limpio'
	return `Git: ${snapshot.branch || '(sin rama)'} | ${dirtyLabel}`
}

const refreshGitStatusForProject = async (projectId) => {
	try {
		const status = await window.projectsApi.gitStatus(projectId)
		gitSnapshots.set(projectId, status)
	} catch {
		gitSnapshots.set(projectId, {
			projectId,
			hasGit: false,
			branch: '',
			dirtyCount: 0
		})
	}
}

const refreshGitStatusForAll = async (projects) => {
	await Promise.all(projects.map((project) => refreshGitStatusForProject(project.id)))
}

const closeDetectModal = () => {
	detectModal.classList.add('is-hidden')
	detectModal.setAttribute('aria-hidden', 'true')
	detectList.innerHTML = ''
	detectedCandidates = []
	setButtonLoading(detectApplyButton, false)
}

const renderDetectList = () => {
	if (!detectedCandidates.length) {
		detectList.innerHTML = `
			<article class="empty-state">
				<h3>Sin carpetas detectadas</h3>
				<p>No se encontraron proyectos validos en el primer nivel.</p>
			</article>
		`
		return
	}

	detectList.innerHTML = detectedCandidates
		.map((project, index) => {
			return `
				<label class="detect-item">
					<input type="checkbox" data-detect-index="${index}" checked />
					<div>
						<strong>${escapeHtml(project.name)}</strong>
						<p>${escapeHtml(project.path)}</p>
					</div>
				</label>
			`
		})
		.join('')
}

const openDetectModal = (basePath, detected) => {
	detectedCandidates = Array.isArray(detected) ? detected : []
	detectSubtitle.textContent = `Base: ${basePath}. Marca las carpetas a importar.`
	renderDetectList()
	detectModal.classList.remove('is-hidden')
	detectModal.setAttribute('aria-hidden', 'false')
}

const toStatusLabel = (status) => {
	if (status === 'running') return 'En ejecucion'
	if (status === 'stopping') return 'Deteniendo'
	if (status === 'stopped') return 'Detenido'
	if (status === 'failed') return 'Con error'
	if (status === 'log') return 'Salida'
	if (status === 'error-log') return 'Error'
	return 'Sin estado'
}

const formatTimestamp = (value) => {
	if (!value) {
		return '-'
	}

	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return '-'
	}

	return date.toLocaleTimeString()
}

const setTerminalStatus = (message) => {
	terminalStatus.textContent = message
}

const getTerminalProjectOptions = () => {
	if (!currentProjects.length) {
		return '<option value="">Sin proyectos guardados</option>'
	}

	return currentProjects
		.map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`)
		.join('')
}

const getTerminalProfileOptions = () => {
	const projectId = terminalProjectSelect.value
	const project = currentProjects.find((item) => item.id === projectId)

	if (!project || !Array.isArray(project.environmentProfiles) || project.environmentProfiles.length === 0) {
		return '<option value="">Sin perfil</option>'
	}

	const activeProfileId = getNormalizedProfileId(project)
	return project.environmentProfiles
		.map((profile) => {
			const isSelected = profile.id === activeProfileId ? 'selected' : ''
			return `<option value="${escapeHtml(profile.id)}" ${isSelected}>${escapeHtml(profile.name || 'Perfil')}</option>`
		})
		.join('')
}

const syncTerminalProjectOptions = () => {
	const previous = terminalProjectSelect.value
	terminalProjectSelect.innerHTML = getTerminalProjectOptions()

	if (previous && currentProjects.some((project) => project.id === previous)) {
		terminalProjectSelect.value = previous
		return
	}

	if (currentProjects.length > 0) {
		terminalProjectSelect.value = currentProjects[0].id
	}
}

const syncTerminalProfileOptions = () => {
	const project = currentProjects.find((item) => item.id === terminalProjectSelect.value)
	terminalProfileSelect.innerHTML = getTerminalProfileOptions()

	if (!project) {
		terminalProfileSelect.value = ''
		return
	}

	const profileId = getNormalizedProfileId(project)
	if (profileId) {
		terminalProfileSelect.value = profileId
	}
}

const ensureTerminalInstance = () => {
	if (terminalInitialized) {
		return
	}

	if (!window.Terminal) {
		setTerminalStatus('No se pudo cargar la terminal embebida.')
		return
	}

	const terminal = new window.Terminal({
		cursorBlink: true,
		fontSize: 14,
		fontFamily: 'Consolas, "Courier New", monospace',
		theme: {
			background: '#050805',
			foreground: '#ebf6eb',
			cursor: '#39ff14',
			selectionBackground: 'rgba(57, 255, 20, 0.25)'
		},
		drawBoldTextInBrightColors: true,
		disallowProposedApi: false
	})

	const FitAddonClass = window.FitAddon?.FitAddon || window.FitAddon
	terminalFitAddon = FitAddonClass ? new FitAddonClass() : null

	if (terminalFitAddon) {
		terminal.loadAddon(terminalFitAddon)
	}

	terminal.open(terminalContainer)
	terminal.write('FluxDev terminal lista. Usa el boton Abrir terminal.\r\n')
	terminalInstance = terminal
	terminalInitialized = true

	terminalKeyListener = terminal.onData((data) => {
		if (terminalSessionId) {
			window.terminalApi.write({ sessionId: terminalSessionId, data })
		}
	})

	window.addEventListener('resize', fitTerminal)
}

const fitTerminal = () => {
	if (!terminalFitAddon || !terminalInstance) {
		return
	}

	try {
		terminalFitAddon.fit()
		if (terminalSessionId) {
			window.terminalApi.resize({
				sessionId: terminalSessionId,
				cols: terminalInstance.cols,
				rows: terminalInstance.rows
			})
		}
	} catch {
		// no-op
	}
}

const appendTerminalData = (data) => {
	if (!terminalInstance || !data) {
		return
	}

	terminalInstance.write(String(data))
}

const openTerminalSession = async () => {
	ensureTerminalInstance()

	if (!terminalInstance) {
		return
	}

	const projectId = terminalProjectSelect.value
	const profileId = terminalProfileSelect.value
	if (!projectId) {
		setTerminalStatus('Selecciona un proyecto antes de abrir la terminal.')
		return
	}

	if (terminalSessionId) {
		await window.terminalApi.close({ sessionId: terminalSessionId })
	}

	terminalInstance.clear()
	terminalInstance.writeln('Abriendo terminal...')
	setTerminalStatus('Iniciando sesion en la carpeta del proyecto...')

	const sessionId = `terminal-${Date.now().toString(36)}`
	terminalSessionId = sessionId

	try {
		await window.terminalApi.create({ sessionId, projectId, profileId })
		fitTerminal()
		terminalInstance.focus()
	} catch (error) {
		terminalSessionId = null
		setTerminalStatus(error?.message || 'No se pudo abrir la terminal.')
		terminalInstance.writeln(`\r\n${error?.message || 'No se pudo abrir la terminal.'}\r\n`)
	}
}

const closeTerminalSession = async () => {
	if (!terminalSessionId) {
		setTerminalStatus('No hay una sesion activa.')
		return
	}

	const sessionId = terminalSessionId
	terminalSessionId = null
	await window.terminalApi.close({ sessionId })
	setTerminalStatus('Terminal cerrada.')
}

const clearTerminalSession = async () => {
	if (!terminalInstance) {
		return
	}

	terminalInstance.clear()
	if (terminalSessionId) {
		await window.terminalApi.clear({ sessionId: terminalSessionId })
	}
	setTerminalStatus('Terminal limpiada.')
}

const upsertProcessSnapshot = (payload) => {
	const projectId = String(payload?.projectId ?? '').trim()
	if (!projectId) {
		return
	}

	const previous = processSnapshots.get(projectId) || {
		projectId,
		projectName: getProjectNameById(projectId),
		command: '',
		pid: null,
		status: 'idle',
		logs: []
	}

	const next = {
		...previous,
		projectName: getProjectNameById(projectId),
		command: payload.command || previous.command,
		pid: typeof payload.pid === 'number' ? payload.pid : previous.pid,
		status: payload.status || previous.status,
		updatedAt: new Date().toISOString()
	}

	processSnapshots.set(projectId, next)
}

const appendProcessLog = (projectId, message, kind = 'log') => {
	if (!projectId || !message) {
		return
	}

	const snapshot = processSnapshots.get(projectId)
	if (!snapshot) {
		return
	}

	const cleanLine = String(message).trim()
	if (!cleanLine) {
		return
	}

	const logLine = `[${kind}] ${cleanLine}`
	const logs = [...snapshot.logs, logLine].slice(-12)
	processSnapshots.set(projectId, {
		...snapshot,
		logs,
		updatedAt: new Date().toISOString()
	})
}

const renderProcessesView = () => {
	const snapshots = Array.from(processSnapshots.values()).sort((a, b) => {
		const aTime = new Date(a.updatedAt || 0).getTime()
		const bTime = new Date(b.updatedAt || 0).getTime()
		return bTime - aTime
	})

	if (!snapshots.length) {
		processesView.innerHTML = `
			<article class="empty-state">
				<h3>Sin procesos aun</h3>
				<p>Aqui veras PID, estado y salida reciente al ejecutar comandos.</p>
			</article>
		`
		return
	}

	processesView.innerHTML = snapshots
		.map((item) => {
			const statusClass = item.status === 'running' ? 'status running' : 'status idle'
			const statusLabel = toStatusLabel(item.status)
			const lastLogs = item.logs.length
				? item.logs.map((line) => escapeHtml(line)).join('\n')
				: 'Sin salida aun.'

			return `
				<article class="process-card">
					<header>
						<h3>${escapeHtml(item.projectName)}</h3>
						<span class="${statusClass}">${statusLabel}</span>
					</header>
					<p><strong>PID:</strong> ${item.pid ?? '-'}</p>
					<p><strong>Comando:</strong> ${escapeHtml(item.command || '-')}</p>
					<p><strong>Ultima actualizacion:</strong> ${escapeHtml(formatTimestamp(item.updatedAt))}</p>
					<pre>${lastLogs}</pre>
				</article>
			`
		})
		.join('')
}

const setActiveTab = (tabName) => {
	activeTab = tabName
	const showProjects = tabName === 'projects'
	const showProcesses = tabName === 'processes'
	const showTerminal = tabName === 'terminal'
	const showSettings = tabName === 'settings'

	projectFilters.classList.toggle('is-hidden', !showProjects)
	projectsList.classList.toggle('is-hidden', !showProjects)
	processesView.classList.toggle('is-hidden', !showProcesses)
	terminalView.classList.toggle('is-hidden', !showTerminal)
	settingsView.classList.toggle('is-hidden', !showSettings)

	tabButtons.forEach((button) => {
		const isSelected = button.dataset.tab === tabName
		button.classList.toggle('is-active', isSelected)
		button.setAttribute('aria-selected', String(isSelected))
	})

	if (showTerminal) {
		ensureTerminalInstance()
		fitTerminal()
	}
}

const resetFormMode = () => {
	editingProjectId = null
	formTitle.textContent = 'Agrega proyectos locales'
	formSubtitle.textContent = 'Guarda nombre, ruta, varios comandos e icono para ejecutar mas rapido.'
	submitProjectButton.textContent = 'Guardar proyecto'
	cancelEditButton.hidden = true
}

const startEditMode = (projectId) => {
	const project = currentProjects.find((item) => item.id === projectId)
	if (!project) {
		setFeedback('No se encontro el proyecto para editar.', 'error')
		return
	}

	editingProjectId = projectId
	nameInput.value = project.name
	pathInput.value = project.path
	iconInput.value = project.icon || ''
	commandsInput.value = project.commands.join('\n')
	formTitle.textContent = `Editando: ${project.name}`
	formSubtitle.textContent = 'Actualiza nombre, ruta, comandos o icono y guarda los cambios.'
	submitProjectButton.textContent = 'Guardar cambios'
	cancelEditButton.hidden = false
	setFeedback('Modo edicion activo.', 'info')
	nameInput.focus()
}

const renderProjects = (projects) => {
	if (!projects.length) {
		projectsList.innerHTML = `
			<article class="empty-state">
				<h3>Aun no hay proyectos</h3>
				<p>Agrega tu primer proyecto para empezar a ejecutarlo con un clic.</p>
			</article>
		`
		return
	}

	const visibleProjects = toDisplayProjects(projects)

	if (!visibleProjects.length) {
		projectsList.innerHTML = `
			<article class="empty-state">
				<h3>Sin resultados</h3>
				<p>Ajusta filtros o agrega nuevos proyectos.</p>
			</article>
		`
		return
	}

	projectsList.innerHTML = visibleProjects
		.map((project) => {
			const isRunning = runningProjectIds.has(project.id)
			const isFavorite = Boolean(project.favorite)
			const activeProfileId = getNormalizedProfileId(project)
			const iconUrl = normalizeIconInput(project.icon)
			const iconMarkup = iconUrl
				? `<img class="project-icon" src="${escapeHtml(iconUrl)}" alt="Icono de ${escapeHtml(project.name)}" />`
				: `<div class="project-icon project-icon-fallback">${getProjectInitial(project.name)}</div>`
			const iconLabel = iconUrl ? escapeHtml(iconUrl) : 'Sin icono'
			const environmentProfiles = Array.isArray(project.environmentProfiles) ? project.environmentProfiles : []
			const runStateClass = isRunning ? 'status running' : 'status idle'
			const runStateText = isRunning ? 'En ejecucion' : 'Detenido'

			return `
				<article class="project-card" data-project-id="${escapeHtml(project.id)}">
					<header>
						<div class="card-title-wrap">
							${iconMarkup}
							<div>
								<h3>${escapeHtml(project.name)}</h3>
								<p>${escapeHtml(project.path)}</p>
								<span class="${runStateClass}">${runStateText}</span>
							</div>
						</div>
					</header>
					<section>
						<h4>Comandos</h4>
						<div class="run-controls">
							<select class="command-select">${formatCommandOptions(project.commands)}</select>
							<button type="button" class="run-button" ${isRunning ? 'disabled' : ''}>Ejecutar</button>
							<button type="button" class="run-all-button" ${isRunning ? 'disabled' : ''}>Todo</button>
							<button type="button" class="stop-button" ${isRunning ? '' : 'disabled'}>Detener</button>
						</div>
						<div class="manage-controls">
							<button type="button" class="favorite-button ${isFavorite ? 'is-favorite' : ''}">${isFavorite ? '★ Favorito' : '☆ Favorito'}</button>
							<button type="button" class="view-process-button">Ver proceso</button>
							<button type="button" class="environment-profiles-button">Perfiles</button>
							<button type="button" class="edit-button">Editar</button>
							<button type="button" class="delete-button">Eliminar</button>
						</div>
						<div class="project-profile-runner">
							<label>Perfil de entorno</label>
							<select class="profile-select">
								${environmentProfiles.length ? environmentProfiles.map((profile) => `<option value="${escapeHtml(profile.id)}" ${profile.id === activeProfileId ? 'selected' : ''}>${escapeHtml(profile.name || 'Perfil')}</option>`).join('') : '<option value="">Sin perfil</option>'}
							</select>
						</div>
						<p class="project-meta">${escapeHtml(getGitSummary(project.id))}</p>
						<ul>${formatCommands(project.commands)}</ul>
					</section>
					<footer>
						<span>Icono: ${iconLabel}</span>
					</footer>
				</article>
			`
		})
		.join('')
}

const loadProjects = async () => {
	const projects = await window.projectsApi.list()
	currentProjects = projects
	currentProjects.forEach((project) => {
		const existingSelected = selectedEnvironmentProfileByProjectId.get(project.id)
		const availableProfiles = Array.isArray(project.environmentProfiles) ? project.environmentProfiles : []
		const validSelected = availableProfiles.some((profile) => profile.id === existingSelected)
		if (!validSelected) {
			selectedEnvironmentProfileByProjectId.set(project.id, project.defaultEnvironmentProfileId || availableProfiles[0]?.id || '')
		}
	})
	syncTerminalProjectOptions()
	syncTerminalProfileOptions()
	terminalOpenButton.disabled = currentProjects.length === 0
	processSnapshots.forEach((snapshot, projectId) => {
		processSnapshots.set(projectId, {
			...snapshot,
			projectName: getProjectNameById(projectId)
		})
	})
	await refreshGitStatusForAll(currentProjects)
	renderProjects(currentProjects)
	renderProcessesView()
}

const updateRunningFromSystem = async () => {
	const runningIds = await window.projectsApi.running()
	runningProjectIds.clear()
	runningIds.forEach((projectId) => runningProjectIds.add(projectId))
	runningIds.forEach((projectId) => {
		upsertProcessSnapshot({ projectId, status: 'running' })
	})
	renderProjects(currentProjects)
	renderProcessesView()
}

browsePathButton.addEventListener('click', async () => {
	const selectedPath = await window.projectsApi.pickDirectory()
	if (selectedPath) {
		pathInput.value = selectedPath
	}
})

browseIconButton.addEventListener('click', async () => {
	const selectedIcon = await window.projectsApi.pickIcon()
	if (selectedIcon) {
		iconInput.value = toFileUrl(selectedIcon)
	}
})

terminalProjectSelect.addEventListener('change', () => {
	syncTerminalProfileOptions()
	if (activeTab === 'terminal') {
		setTerminalStatus(`Proyecto seleccionado: ${terminalProjectSelect.options[terminalProjectSelect.selectedIndex]?.textContent || 'Proyecto'}`)
	}
})

terminalProfileSelect.addEventListener('change', () => {
	const projectId = terminalProjectSelect.value
	if (projectId) {
		selectedEnvironmentProfileByProjectId.set(projectId, terminalProfileSelect.value)
	}
})

terminalOpenButton.addEventListener('click', openTerminalSession)
terminalClearButton.addEventListener('click', clearTerminalSession)
terminalCloseButton.addEventListener('click', closeTerminalSession)

projectSearchInput.addEventListener('input', () => {
	projectSearchTerm = projectSearchInput.value
	renderProjects(currentProjects)
})

favoritesOnlyInput.addEventListener('change', () => {
	favoritesOnly = favoritesOnlyInput.checked
	renderProjects(currentProjects)
})

iconTemplateButtons.forEach((button) => {
	button.addEventListener('click', () => {
		iconInput.value = button.dataset.template || ''
	})
})

tabButtons.forEach((button) => {
	button.addEventListener('click', () => {
		setActiveTab(button.dataset.tab || 'projects')
	})
})

form.addEventListener('submit', async (event) => {
	event.preventDefault()

	const payload = {
		name: nameInput.value,
		path: pathInput.value,
		icon: normalizeIconInput(iconInput.value),
		commands: parseCommands(commandsInput.value)
	}

	try {
		if (editingProjectId) {
			await window.projectsApi.update(editingProjectId, payload)
			setFeedback('Proyecto actualizado correctamente.', 'success')
		} else {
			await window.projectsApi.add(payload)
			setFeedback('Proyecto guardado correctamente.', 'success')
		}

		form.reset()
		resetFormMode()
		await loadProjects()
	} catch (error) {
		const message = error?.message || 'No se pudo guardar el proyecto.'
		setFeedback(message, 'error')
	}
})

cancelEditButton.addEventListener('click', () => {
	form.reset()
	resetFormMode()
	setFeedback('Edicion cancelada.', 'info')
})

environmentProfileSaveButton.addEventListener('click', async () => {
	await upsertEnvironmentProfile()
})

environmentProfileCancelButton.addEventListener('click', () => {
	resetEnvironmentProfileForm()
	renderEnvironmentProfiles()
})

environmentProfilesCloseButton.addEventListener('click', closeEnvironmentProfilesModal)

environmentProfilesModal.addEventListener('click', (event) => {
	if (event.target === environmentProfilesModal) {
		closeEnvironmentProfilesModal()
	}
})

environmentProfilesList.addEventListener('click', async (event) => {
	const profileId = event.target.dataset.profileId
	if (!profileId) {
		return
	}

	if (event.target.classList.contains('environment-profile-edit-button')) {
		startEnvironmentProfileEdit(profileId)
	}

	if (event.target.classList.contains('environment-profile-delete-button')) {
		await deleteEnvironmentProfile(profileId)
	}

	if (event.target.classList.contains('environment-profile-default-button')) {
		await setDefaultEnvironmentProfile(profileId)
	}
})

autoDetectButton.addEventListener('click', async () => {
	setButtonLoading(autoDetectButton, true, 'Escaneando...')
	setFeedback('Escaneando proyectos en carpeta base...', 'info')

	try {
		const result = await window.projectsApi.autoDetectScan()

		if (result?.canceled) {
			setFeedback('Auto-deteccion cancelada.', 'info')
			return
		}

		if (!result.foundCount) {
			setFeedback('No se detectaron proyectos en el primer nivel de la carpeta elegida.', 'info')
			return
		}

		openDetectModal(result.basePath, result.detected)
		setFeedback(`Escaneo listo: ${result.foundCount} proyecto(s) detectado(s).`, 'success')
	} catch (error) {
		setFeedback(error?.message || 'No se pudo auto-detectar proyectos.', 'error')
	} finally {
		setButtonLoading(autoDetectButton, false)
	}
})

detectCancelButton.addEventListener('click', () => {
	closeDetectModal()
	setFeedback('Auto-deteccion cancelada.', 'info')
})

detectSelectAllButton.addEventListener('click', () => {
	detectList.querySelectorAll('input[type="checkbox"][data-detect-index]').forEach((input) => {
		input.checked = true
	})
})

detectApplyButton.addEventListener('click', async () => {
	const checkedIndexes = Array.from(detectList.querySelectorAll('input[type="checkbox"][data-detect-index]:checked'))
		.map((input) => Number(input.dataset.detectIndex))
		.filter((index) => Number.isInteger(index) && index >= 0)

	if (!checkedIndexes.length) {
		setFeedback('Selecciona al menos un proyecto para agregar.', 'info')
		return
	}

	const selectedProjects = checkedIndexes
		.map((index) => detectedCandidates[index])
		.filter(Boolean)

	setButtonLoading(detectApplyButton, true, 'Agregando...')

	try {
		const result = await window.projectsApi.autoDetectApply(selectedProjects)
		closeDetectModal()
		await loadProjects()
		setFeedback(`Auto-deteccion aplicada: ${result.addedCount}/${result.selectedCount} proyectos agregados.`, 'success')
	} catch (error) {
		setFeedback(error?.message || 'No se pudo agregar la seleccion detectada.', 'error')
		setButtonLoading(detectApplyButton, false)
	}
})

exportDataButton.addEventListener('click', async () => {
	try {
		const result = await window.projectsApi.exportData()

		if (result?.canceled) {
			setFeedback('Exportacion cancelada.', 'info')
			return
		}

		setFeedback(`Datos exportados (${result.count} proyectos).`, 'success')
	} catch (error) {
		setFeedback(error?.message || 'No se pudo exportar la informacion.', 'error')
	}
})

importDataButton.addEventListener('click', async () => {
	try {
		const result = await window.projectsApi.importData()

		if (result?.canceled) {
			setFeedback('Importacion cancelada.', 'info')
			return
		}

		if (editingProjectId) {
			form.reset()
			resetFormMode()
		}

		await loadProjects()
		await updateRunningFromSystem()
		setFeedback(`Datos importados (${result.count} proyectos).`, 'success')
	} catch (error) {
		setFeedback(error?.message || 'No se pudo importar la informacion.', 'error')
	}
})

clearAllButton.addEventListener('click', async () => {
	const confirmed = window.confirm('Se eliminaran todos los proyectos guardados y se detendran procesos activos. Deseas continuar?')
	if (!confirmed) {
		return
	}

	try {
		const result = await window.projectsApi.clearAll()

		if (editingProjectId) {
			form.reset()
			resetFormMode()
		}

		runningProjectIds.clear()
		processSnapshots.clear()
		gitSnapshots.clear()
		await loadProjects()
		renderProcessesView()
		setFeedback(`Se eliminaron ${result.deletedCount} proyectos.`, 'success')
	} catch (error) {
		setFeedback(error?.message || 'No se pudo borrar todo.', 'error')
	}
})

projectsList.addEventListener('change', (event) => {
	const card = event.target.closest('.project-card')
	if (!card) {
		return
	}

	const projectId = card.dataset.projectId
	const profileSelect = card.querySelector('.profile-select')
	if (event.target.classList.contains('profile-select')) {
		selectedEnvironmentProfileByProjectId.set(projectId, profileSelect?.value || '')
		renderProjects(currentProjects)
	}
})

projectsList.addEventListener('click', async (event) => {
	const card = event.target.closest('.project-card')
	if (!card) {
		return
	}

	const projectId = card.dataset.projectId
	const commandSelect = card.querySelector('.command-select')
	const profileSelect = card.querySelector('.profile-select')
	const command = commandSelect?.value || ''
	const profileId = profileSelect?.value || ''

	if (event.target.classList.contains('run-button')) {
		try {
			const runResult = await window.projectsApi.run(projectId, command, profileId)
			runningProjectIds.add(projectId)
			selectedEnvironmentProfileByProjectId.set(projectId, profileId)
			upsertProcessSnapshot(runResult)
			appendProcessLog(projectId, `Ejecutando: ${command}`, 'sys')
			renderProjects(currentProjects)
			renderProcessesView()
			setFeedback(`Comando lanzado: ${command}`, 'success')
		} catch (error) {
			setFeedback(error?.message || 'No se pudo ejecutar el comando.', 'error')
		}
	}

	if (event.target.classList.contains('run-all-button')) {
		try {
			await window.projectsApi.runAll(projectId, profileId)
			selectedEnvironmentProfileByProjectId.set(projectId, profileId)
			setFeedback('Multi-run iniciado correctamente.', 'success')
		} catch (error) {
			setFeedback(error?.message || 'No se pudo iniciar el multi-run.', 'error')
		}
	}

	if (event.target.classList.contains('stop-button')) {
		try {
			await window.projectsApi.stop(projectId)
			runningProjectIds.delete(projectId)
			upsertProcessSnapshot({ projectId, status: 'stopping' })
			appendProcessLog(projectId, 'Solicitud de detencion enviada.', 'sys')
			renderProjects(currentProjects)
			renderProcessesView()
			setFeedback('Solicitud de detencion enviada.', 'info')
		} catch (error) {
			setFeedback(error?.message || 'No se pudo detener el comando.', 'error')
		}
	}

	if (event.target.classList.contains('view-process-button')) {
		setActiveTab('processes')
	}

	if (event.target.classList.contains('environment-profiles-button')) {
		openEnvironmentProfilesModal(projectId)
	}

	if (event.target.classList.contains('favorite-button')) {
		try {
			await window.projectsApi.toggleFavorite(projectId)
			await loadProjects()
			setFeedback('Favorito actualizado.', 'success')
		} catch (error) {
			setFeedback(error?.message || 'No se pudo actualizar favorito.', 'error')
		}
	}

	if (event.target.classList.contains('edit-button')) {
		startEditMode(projectId)
	}

	if (event.target.classList.contains('delete-button')) {
		const confirmDelete = window.confirm('Este proyecto se eliminara. Deseas continuar?')
		if (!confirmDelete) {
			return
		}

		try {
			await window.projectsApi.delete(projectId)
			if (editingProjectId === projectId) {
				form.reset()
				resetFormMode()
			}
			processSnapshots.delete(projectId)
			await loadProjects()
			setFeedback('Proyecto eliminado correctamente.', 'success')
		} catch (error) {
			setFeedback(error?.message || 'No se pudo eliminar el proyecto.', 'error')
		}
	}
})

window.projectsApi.onRunUpdate((event) => {
	upsertProcessSnapshot(event)

	if (event.status === 'running') {
		runningProjectIds.add(event.projectId)
		renderProjects(currentProjects)
	}

	if (event.status === 'stopping' || event.status === 'stopped' || event.status === 'failed') {
		runningProjectIds.delete(event.projectId)
		renderProjects(currentProjects)
	}

	if (event.status === 'deleted') {
		runningProjectIds.delete(event.projectId)
		processSnapshots.delete(event.projectId)
		renderProjects(currentProjects)
	}

	if (event.status === 'log') {
		appendProcessLog(event.projectId, event.message, 'out')
	}

	if (event.status === 'error-log') {
		appendProcessLog(event.projectId, event.message, 'err')
	}

	if (event.status === 'running' || event.status === 'stopping' || event.status === 'stopped' || event.status === 'failed') {
		appendProcessLog(event.projectId, event.message, 'sys')
	}

	renderProcessesView()

	if (event.status === 'running' || event.status === 'failed' || event.status === 'stopped') {
		setFeedback(event.message, event.status === 'failed' ? 'error' : 'info')
	}
})

window.terminalApi.onUpdate((event) => {
	if (!event || (terminalSessionId && event.sessionId !== terminalSessionId)) {
		return
	}

	if (event.type === 'ready') {
		setTerminalStatus(event.data)
		appendTerminalData(`${event.data}\r\n`)
		appendTerminalData('> ')
		fitTerminal()
		return
	}

	if (event.type === 'stdout' || event.type === 'stderr') {
		appendTerminalData(event.data)
		return
	}

	if (event.type === 'clear') {
		terminalInstance?.clear()
		return
	}

	if (event.type === 'exit') {
		setTerminalStatus(event.data)
		appendTerminalData(`\r\n${event.data}\r\n`)
		terminalSessionId = null
		return
	}

	if (event.type === 'closed') {
		setTerminalStatus(event.data)
		terminalSessionId = null
		return
	}

	if (event.type === 'error') {
		setTerminalStatus(event.data)
		appendTerminalData(`\r\n${event.data}\r\n`)
		terminalSessionId = null
	}
})

runtimeInfo.textContent = `Chrome ${window.versions.chrome()} | Node ${window.versions.node()} | Electron ${window.versions.electron()}`
setFeedback('Guarda iconos por URL (Devicon/Simple Icons) o selecciona un archivo local.', 'info')
resetFormMode()
setActiveTab(activeTab)
loadProjects().then(updateRunningFromSystem)
