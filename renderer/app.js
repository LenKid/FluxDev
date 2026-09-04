const form = document.getElementById('project-form')
const nameInput = document.getElementById('name')
const pathInput = document.getElementById('path')
const iconInput = document.getElementById('icon')
const commandsInput = document.getElementById('commands')
const projectTagsInput = document.getElementById('project-tags')
const projectTagFilter = document.getElementById('project-tag-filter')
const projectTagFilterMode = document.getElementById('project-tag-filter-mode')
const projectTagsOptions = document.getElementById('project-tags-options')
const environmentProfileNameInput = document.getElementById('environment-profile-name')
const environmentProfileVariablesInput = document.getElementById('environment-profile-variables')
const environmentProfileActivateInput = document.getElementById('environment-profile-activate')
const environmentProfileCwdInput = document.getElementById('environment-profile-cwd')
const environmentProfileSaveButton = document.getElementById('environment-profile-save')
const environmentProfileCancelButton = document.getElementById('environment-profile-cancel')
const environmentProfilesList = document.getElementById('environment-profiles-list')
const browsePathButton = document.getElementById('browse-path')
const browseIconButton = document.getElementById('browse-icon')
const iconPreview = document.getElementById('icon-preview')
const addProjectEnvironmentProfilesButton = document.getElementById('new-project-environment-profiles')
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
const globalSearchModal = document.getElementById('global-search-modal')
const globalSearchInput = document.getElementById('global-search-input')
const globalSearchResults = document.getElementById('global-search-results')
const globalSearchCloseButton = document.getElementById('global-search-close')
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
const projectSortSelect = document.getElementById('project-sort')
const projectFilters = document.querySelector('.project-filters')
const projectsList = document.getElementById('projects-list')
const processesView = document.getElementById('processes-view')
const terminalView = document.getElementById('terminal-view')
const settingsView = document.getElementById('settings-view')
const terminalProjectSelect = document.getElementById('terminal-project-select')
const terminalProfileSelect = document.getElementById('terminal-profile-select')
const terminalOpenExternalButton = document.getElementById('terminal-open-external')
const terminalOpenButton = document.getElementById('terminal-open')
const terminalClearButton = document.getElementById('terminal-clear')
const terminalCloseButton = document.getElementById('terminal-close')
const terminalContainer = document.getElementById('terminal-container')
const terminalStatus = document.getElementById('terminal-status')
const tabButtons = document.querySelectorAll('.tab-button')
const runtimeInfo = document.getElementById('runtime-info')
const viewModeGridBtn = document.getElementById('view-mode-grid')
const viewModeCompactBtn = document.getElementById('view-mode-compact')
const panelForm = document.getElementById('panel-form')
const dashboardContent = document.getElementById('dashboard-content')
const dashboardHeader = document.getElementById('dashboard-header')
const formHeader = document.getElementById('form-header')
const toggleDashboardBtn = document.getElementById('toggle-dashboard')
const dashboardAddProjectBtn = document.getElementById('dashboard-add-project')
const dashboardAutoDetectBtn = document.getElementById('dashboard-auto-detect')
const dashboardHistoryLink = document.getElementById('dashboard-history-link')
const globalTagForm = document.getElementById('global-tag-form')
const globalTagInput = document.getElementById('global-tag-input')
const globalTagsList = document.getElementById('global-tags-list')
const globalTagsEmpty = document.getElementById('global-tags-empty')
const dashboardQuickRunList = document.getElementById('dashboard-quick-run-list')
const dashboardQuickRunEmpty = document.getElementById('dashboard-quick-run-empty')
const statTotal = document.getElementById('stat-total')
const statRunning = document.getElementById('stat-running')
const statFavorites = document.getElementById('stat-favorites')
const welcomeOverlay = document.getElementById('welcome-overlay')
const welcomeStartBtn = document.getElementById('welcome-start')
const historyView = document.getElementById('history-view')
const historyList = document.getElementById('history-list')
const historyEmpty = document.getElementById('history-empty')
const historySearchInput = document.getElementById('history-search')
const historyFilterStatus = document.getElementById('history-filter-status')
const historyClearBtn = document.getElementById('history-clear')
const processSearchInput = document.getElementById('process-search')
const processFilterStatus = document.getElementById('process-filter-status')
const aboutView = document.getElementById('about-view')
const aboutVersion = document.getElementById('about-version')
const aboutElectron = document.getElementById('about-electron')
const aboutNode = document.getElementById('about-node')
const aboutChrome = document.getElementById('about-chrome')
const aboutOs = document.getElementById('about-os')
const aboutShell = document.getElementById('about-shell')
const runningProjectIds = new Set()
const processSnapshots = new Map()
const closedProcessKeys = new Set()
const gitSnapshots = new Map()
const selectedEnvironmentProfileByProjectId = new Map()
const uiState = window.FluxDevStateStore ? window.FluxDevStateStore.createStateStore({
	currentProjects: [],
	editingProjectId: null,
	editingEnvironmentProfileId: null,
	projectEnvironmentProfiles: [],
	projectDefaultEnvironmentProfileId: '',
	environmentProfilesTargetProjectId: '',
	activeTab: 'projects',
	projectSearchTerm: '',
	favoritesOnly: false,
	projectSortBy: 'name',
	projectViewMode: localStorage.getItem('fluxdev_project_view_mode') || 'grid',
	projectTagFilter: [],
	projectTagFilterMode: 'any',
	historyFilterTerm: '',
	historyFilterStatusValue: 'all',
	processFilterTerm: '',
	processFilterStatusValue: 'all',
	showDashboard: true,
}) : null

const setUiState = (patch = {}) => {
	if (uiState) {
		uiState.setState(patch)
	}

	Object.entries(patch).forEach(([key, value]) => {
		switch (key) {
			case 'currentProjects': currentProjects = value; break
			case 'editingProjectId': editingProjectId = value; break
			case 'editingEnvironmentProfileId': editingEnvironmentProfileId = value; break
			case 'projectEnvironmentProfiles': projectEnvironmentProfiles = value; break
			case 'projectDefaultEnvironmentProfileId': projectDefaultEnvironmentProfileId = value; break
			case 'environmentProfilesTargetProjectId': environmentProfilesTargetProjectId = value; break
			case 'activeTab': activeTab = value; break
			case 'projectSearchTerm': projectSearchTerm = value; break
			case 'favoritesOnly': favoritesOnly = value; break
			case 'projectSortBy': projectSortBy = value; break
			case 'projectViewMode': projectViewMode = value; break
			case 'projectTagFilter': projectTagFilterValues = value; break
			case 'projectTagFilterMode': projectTagFilterModeValue = value; break
			case 'historyFilterTerm': historyFilterTerm = value; break
			case 'historyFilterStatusValue': historyFilterStatusValue = value; break
			case 'processFilterTerm': processFilterTerm = value; break
			case 'processFilterStatusValue': processFilterStatusValue = value; break
			case 'showDashboard': showDashboard = value; break
		}
	})
}

let currentProjects = uiState ? uiState.getState().currentProjects : []
let editingProjectId = uiState ? uiState.getState().editingProjectId : null
let editingEnvironmentProfileId = uiState ? uiState.getState().editingEnvironmentProfileId : null
let projectEnvironmentProfiles = uiState ? uiState.getState().projectEnvironmentProfiles : []
let projectDefaultEnvironmentProfileId = uiState ? uiState.getState().projectDefaultEnvironmentProfileId : ''
let environmentProfilesTargetProjectId = uiState ? uiState.getState().environmentProfilesTargetProjectId : ''
let activeTab = uiState ? uiState.getState().activeTab : 'projects'
let projectSearchTerm = uiState ? uiState.getState().projectSearchTerm : ''
let favoritesOnly = uiState ? uiState.getState().favoritesOnly : false
let projectSortBy = uiState ? uiState.getState().projectSortBy : 'name'
let projectViewMode = uiState ? uiState.getState().projectViewMode : (localStorage.getItem('fluxdev_project_view_mode') || 'grid')
let projectTagFilterValues = uiState ? uiState.getState().projectTagFilter : []
let projectTagFilterModeValue = uiState ? uiState.getState().projectTagFilterMode : 'any'
let historyFilterTerm = uiState ? uiState.getState().historyFilterTerm : ''
let historyFilterStatusValue = uiState ? uiState.getState().historyFilterStatusValue : 'all'
let processFilterTerm = uiState ? uiState.getState().processFilterTerm : ''
let processFilterStatusValue = uiState ? uiState.getState().processFilterStatusValue : 'all'
const expandedProjectIds = new Set()
let detectedCandidates = []
let terminalSessionId = null
let terminalInstance = null
let terminalFitAddon = null
let terminalUpdateUnsubscribe = null
let terminalKeyListener = null
let terminalInitialized = false
let terminalEngineState = 'loading'
let terminalEngineError = ''
const TABLER_ICON_BASE = '../public/icons/tabler'
const executionHistory = []
const MAX_HISTORY = 100
let showDashboard = uiState ? uiState.getState().showDashboard : true
let renderRefreshTimer = null

const scheduleProjectUiRefresh = () => {
	if (renderRefreshTimer) {
		clearTimeout(renderRefreshTimer)
	}

	renderRefreshTimer = setTimeout(() => {
		renderRefreshTimer = null
		renderProjects(currentProjects)
		renderProcessesView()
		if (showDashboard) {
			renderDashboard()
		}
	}, 40)
}

const renderButtonIcon = (name, label, showMobileLabel = false, showLabel = false) => {
	const mobileLabel = showMobileLabel ? `<span class="label-on-mobile">${escapeHtml(label)}</span>` : ''
	const visibleLabel = showLabel ? `<span class="button-label">${escapeHtml(label)}</span>` : ''
	return `<img class="ui-icon" src="${TABLER_ICON_BASE}/${escapeHtml(name)}.svg" alt="" aria-hidden="true" />${visibleLabel}${mobileLabel}<span class="sr-only">${escapeHtml(label)}</span>`
}

const renderProjectMenu = (projectId) => {
	return `
		<div class="project-menu">
			<button type="button" class="project-menu-trigger icon-button" title="Mas opciones" aria-label="Mas opciones" data-menu-project="${escapeHtml(projectId)}">${renderButtonIcon('dots-vertical', 'Opciones')}</button>
			<div class="project-menu-dropdown" data-menu-dropdown="${escapeHtml(projectId)}">
				<button type="button" class="project-menu-item edit-button" data-menu-action="edit">${renderButtonIcon('edit', 'Editar')} Editar</button>
				<button type="button" class="project-menu-item" data-menu-action="redetect">${renderButtonIcon('refresh', 'Re-detectar')} Re-detectar</button>
				<button type="button" class="project-menu-item" data-menu-action="open-folder">${renderButtonIcon('folder', 'Abrir carpeta')} Abrir carpeta</button>
				<button type="button" class="project-menu-item danger" data-menu-action="delete">${renderButtonIcon('trash', 'Eliminar')} Eliminar</button>
			</div>
		</div>
	`
}

const parseCommands = (commandsRaw) => {
	return commandsRaw
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
}

const parseProjectTags = (tagsRaw) => {
	const seen = new Set()
	return String(tagsRaw ?? '')
		.split(',')
		.map((tag) => tag.trim())
		.filter((tag) => {
			const key = tag.toLocaleLowerCase()
			if (!tag || seen.has(key)) {
				return false
			}
			seen.add(key)
			return true
		})
}

const getProjectTags = (project) => Array.isArray(project?.tags) ? project.tags : []


const syncProjectTagOptions = async () => {
	let globalTags = []
	if (window.projectsApi?.listTags) {
		try {
			globalTags = (await window.projectsApi.listTags()).map((tag) => tag.name)
		} catch {
			globalTags = []
		}
	}

	const tags = Array.from(new Map(
		currentProjects
			.flatMap((project) => getProjectTags(project))
			.concat(globalTags)
			.map((tag) => [tag.toLocaleLowerCase(), tag])
	).values()).sort((a, b) => a.localeCompare(b))

	if (projectTagsOptions) {
		projectTagsOptions.innerHTML = tags.map((tag) => `<option value="${escapeHtml(tag)}"></option>`).join('')
	}

	if (projectTagFilter) {
		const selected = new Set(projectTagFilterValues.map((tag) => tag.toLocaleLowerCase()))
		projectTagFilter.innerHTML = tags.map((tag) => `<option value="${escapeHtml(tag)}" ${selected.has(tag.toLocaleLowerCase()) ? 'selected' : ''}>${escapeHtml(tag)}</option>`).join('')
	}
}

const renderProjectTags = (project) => getProjectTags(project).map((tag) => `<span class="project-tag">${escapeHtml(tag)}</span>`).join('')

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

const getNormalizedProfileIds = (project) => {
	const profiles = Array.isArray(project?.environmentProfiles) ? project.environmentProfiles : []
	if (!profiles.length) {
		return []
	}
	const stored = selectedEnvironmentProfileByProjectId.get(project?.id)
	let selected
	if (stored === undefined) {
		selected = []
	} else if (Array.isArray(stored)) {
		selected = stored
	} else {
		selected = stored ? [String(stored)] : []
	}
	return selected.filter((id) => profiles.some((profile) => profile.id === id))
}

const persistLastUsedEnvironmentProfile = async (projectId, profileId) => {
	const project = currentProjects.find((item) => item.id === projectId)
	if (!project || !profileId) {
		return
	}

	const profiles = Array.isArray(project.environmentProfiles) ? project.environmentProfiles : []
	if (!profiles.some((profile) => profile.id === profileId)) {
		return
	}

	if (project.lastUsedEnvironmentProfileId === profileId) {
		return
	}

	try {
		await window.projectsApi.update(projectId, {
			...project,
			lastUsedEnvironmentProfileId: profileId
		})
		project.lastUsedEnvironmentProfileId = profileId
	} catch (error) {
		setFeedback(error?.message || 'No se pudo guardar el ultimo perfil usado.', 'error')
	}
}

const getNormalizedProfileId = (project) => {
	return getNormalizedProfileIds(project)[0] || ''
}

const readSelectedProfileIds = (container) => {
	if (!container) {
		return []
	}
	return Array.from(container.querySelectorAll('.profile-checkbox:checked'))
		.map((checkbox) => checkbox.value)
		.filter(Boolean)
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

const openEnvironmentProfilesModal = (projectId = '') => {
	if (projectId) {
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
		return
	}

	environmentProfilesTargetProjectId = ''
	environmentProfilesModalProject.textContent = 'Nuevo proyecto · perfiles de entorno'
	resetEnvironmentProfileForm()
	renderEnvironmentProfiles()
	environmentProfilesModal.classList.remove('is-hidden')
	environmentProfilesModal.setAttribute('aria-hidden', 'false')
}

const closeEnvironmentProfilesModal = () => {
	const wasProjectScoped = Boolean(environmentProfilesTargetProjectId)
	environmentProfilesTargetProjectId = ''
	environmentProfilesModal.classList.add('is-hidden')
	environmentProfilesModal.setAttribute('aria-hidden', 'true')
	resetEnvironmentProfileForm()
	if (wasProjectScoped) {
		projectEnvironmentProfiles = []
		projectDefaultEnvironmentProfileId = ''
		environmentProfilesModalProject.textContent = 'Selecciona un proyecto para administrar sus variables.'
	}
}

const resetEnvironmentProfileForm = () => {
	editingEnvironmentProfileId = null
	environmentProfileNameInput.value = ''
	environmentProfileVariablesInput.value = ''
	environmentProfileActivateInput.value = ''
	environmentProfileCwdInput.value = ''
	environmentProfileSaveButton.textContent = 'Guardar perfil'
	environmentProfileCancelButton.hidden = true
}

const loadProjectProfilesIntoForm = (project) => {
	projectEnvironmentProfiles = Array.isArray(project?.environmentProfiles)
		? project.environmentProfiles.map((profile) => ({
			id: profile.id,
			name: profile.name,
			environment: { ...(profile.environment || {}) },
			activate: profile.activate || '',
			cwd: profile.cwd || ''
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
	environmentProfileActivateInput.value = profile.activate || ''
	environmentProfileCwdInput.value = profile.cwd || ''
	environmentProfileSaveButton.textContent = 'Actualizar perfil'
	environmentProfileCancelButton.hidden = false
	renderEnvironmentProfiles()
}

const upsertEnvironmentProfile = () => {
	const name = environmentProfileNameInput.value.trim()
	const environment = parseEnvironmentVariablesText(environmentProfileVariablesInput.value)
	const activate = environmentProfileActivateInput.value.trim()
	const cwd = environmentProfileCwdInput.value.trim()

	if (!name) {
		setFeedback('El nombre del perfil es obligatorio.', 'error')
		return
	}

	const nextProfile = {
		id: editingEnvironmentProfileId || `profile-${Date.now().toString(36)}`,
		name,
		environment,
		activate,
		cwd
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
		resetEnvironmentProfileForm()
		renderEnvironmentProfiles()
		setFeedback('Perfil de entorno guardado en este proyecto nuevo.', 'success')
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
	if (!environmentProfilesTargetProjectId) {
		setFeedback('Perfil eliminado del proyecto nuevo.', 'success')
		return
	}
	await persistEnvironmentProfilesToProject('Perfil eliminado correctamente.')
}

const setDefaultEnvironmentProfile = async (profileId) => {
	projectDefaultEnvironmentProfileId = profileId
	renderEnvironmentProfiles()
	if (!environmentProfilesTargetProjectId) {
		setFeedback('Perfil predeterminado actualizado para este proyecto nuevo.', 'success')
		return
	}
	await persistEnvironmentProfilesToProject('Perfil predeterminado actualizado.')
}

const setFeedback = (message, type = 'info') => {
	feedback.textContent = message
	feedback.dataset.type = type
}

const showToast = (message, type = 'info', duration = 4000, actions = []) => {
	const container = document.getElementById('toast-container')
	const toast = document.createElement('div')
	toast.className = `toast toast-${type}`
	toast.textContent = message

	if (actions.length > 0) {
		const actionsDiv = document.createElement('div')
		actionsDiv.className = 'toast-actions'
		actions.forEach((action) => {
			const btn = document.createElement('button')
			btn.textContent = action.label
			btn.onclick = () => {
				action.onClick()
				toast.remove()
			}
			actionsDiv.appendChild(btn)
		})
		toast.appendChild(actionsDiv)
	}

	container.appendChild(toast)

	if (duration > 0) {
		setTimeout(() => {
			toast.classList.add('toast-exit')
			setTimeout(() => toast.remove(), 250)
		}, duration)
	}

	return toast
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

const URL_REGEX = /https?:\/\/[^\s<>"'`\]]+/gi

const linkifyUrls = (rawText) => {
	let lastIndex = 0
	let match
	let output = ''
	URL_REGEX.lastIndex = 0
	while ((match = URL_REGEX.exec(rawText)) !== null) {
		const before = rawText.slice(lastIndex, match.index)
		if (before) {
			output += escapeHtml(before)
		}
		const url = match[0]
		output += `<a href="#" class="process-link" data-url="${escapeHtml(url)}">${escapeHtml(url)}</a>`
		lastIndex = match.index + url.length
	}
	const tail = rawText.slice(lastIndex)
	if (tail) {
		output += escapeHtml(tail)
	}
	return output
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

const renderIconPreview = (rawValue) => {
	if (!iconPreview) {
		return
	}

	const normalized = normalizeIconInput(rawValue)
	iconPreview.innerHTML = ''
	iconPreview.classList.toggle('is-empty', !normalized)

	if (!normalized) {
		iconPreview.textContent = 'Sin icono'
		return
	}

	const previewImage = new Image()
	previewImage.src = normalized
	previewImage.alt = 'Previsualización del icono'
	previewImage.className = 'icon-preview-image'
	previewImage.onerror = () => {
		iconPreview.textContent = 'Icono no disponible'
		iconPreview.classList.add('is-empty')
	}
	iconPreview.appendChild(previewImage)
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
	const selectedTags = projectTagFilterValues.map((tag) => tag.toLocaleLowerCase())

	return projects
		.filter((project) => {
			if (favoritesOnly && !project.favorite) {
				return false
			}

			if (!searchTerm) {
				if (!selectedTags.length) {
					return true
				}
			} else {
				const name = String(project.name || '').toLowerCase()
				const path = String(project.path || '').toLowerCase()
				if (!name.includes(searchTerm) && !path.includes(searchTerm)) {
					return false
				}
			}

			if (!selectedTags.length) {
				return true
			}

			const projectTags = getProjectTags(project).map((tag) => tag.toLocaleLowerCase())
			return projectTagFilterModeValue === 'all'
				? selectedTags.every((tag) => projectTags.includes(tag))
				: selectedTags.some((tag) => projectTags.includes(tag))
		})
		.sort((a, b) => {
			const sortBy = projectSortSelect?.value || projectSortBy

			if (sortBy === 'favorite') {
				const favDelta = Number(Boolean(b.favorite)) - Number(Boolean(a.favorite))
				if (favDelta !== 0) {
					return favDelta
				}
			}

			if (sortBy === 'path') {
				return String(a.path).localeCompare(String(b.path))
			}
			if (sortBy === 'updatedAt') {
				const dateA = new Date(a.updatedAt || 0).getTime()
				const dateB = new Date(b.updatedAt || 0).getTime()
				return dateB - dateA
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
		if (terminalEngineState === 'failed') {
			setTerminalStatus(`Terminal integrada no disponible: ${terminalEngineError || 'No se pudo inicializar ghostty-web.'}`)
		} else {
			setTerminalStatus('Cargando motor de terminal...')
		}
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
		}
	})

	terminal.open(terminalContainer)
	terminal.write('FluxDev | Visor de procesos (solo lectura)\r\n')
	terminal.write('Usa "Externa" para interactuar con la terminal del sistema.\r\n\r\n')
	terminalInstance = terminal
	terminalInitialized = true

	terminalFitAddon = { fit: fitTerminal }
	fitTerminal()

	terminalKeyListener = terminal.onData(() => {
		// Modo visor: sin escritura en la terminal embebida.
	})

	window.addEventListener('resize', fitTerminal)
}

const fitTerminal = () => {
	if (!terminalInstance || !terminalContainer) {
		return
	}

	try {
		const container = terminalContainer
		const rect = container.getBoundingClientRect()
		const cellW = 8
		const cellH = 16
		const cols = Math.max(80, Math.floor(rect.width / cellW))
		const rows = Math.max(24, Math.floor(rect.height / cellH))

		terminalInstance.resize(cols, rows)
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

const openExternalTerminalSession = async () => {
	const projectId = terminalProjectSelect.value
	const profileId = terminalProfileSelect.value

	if (!projectId) {
		setTerminalStatus('Selecciona un proyecto antes de abrir terminal externa.')
		return
	}

	try {
		await window.terminalApi.openExternal({ projectId, profileId })
		setTerminalStatus('Terminal externa abierta en la carpeta del proyecto seleccionado.')
	} catch (error) {
		setTerminalStatus(error?.message || 'No se pudo abrir la terminal externa.')
	}
}

const appendProcessEventToTerminalViewer = (event) => {
	if (!terminalInstance || !event) {
		return
	}

	const projectName = getProjectNameById(event.projectId)
	const status = String(event.status || 'log').toUpperCase()
	const message = String(event.message || '').trim()
	const lines = message ? message.split(/\r?\n/).filter(Boolean) : []
	const timestamp = new Date().toLocaleTimeString()

	if (!lines.length) {
		terminalInstance.writeln(`[${timestamp}] [${status}] ${projectName}`)
		return
	}

	lines.forEach((line) => {
		terminalInstance.writeln(`[${timestamp}] [${status}] ${projectName}: ${line}`)
	})
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
	const processKey = String(payload?.processKey || `${projectId}:${Date.now().toString(36)}`).trim()
	if (!projectId) {
		return
	}

	const incomingStatus = String(payload?.status || '').trim()
	const isLogEvent = incomingStatus === 'log' || incomingStatus === 'error-log'

	const key = processKey || projectId
	const previous = processSnapshots.get(key) || {
		projectId,
		processKey: key,
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
		status: isLogEvent ? previous.status : (incomingStatus || previous.status),
		updatedAt: new Date().toISOString()
	}

	processSnapshots.set(key, next)
}

const appendProcessLog = (payload, message, kind = 'log') => {
	const projectId = String(payload?.projectId || '').trim()
	const processKey = String(payload?.processKey || '').trim()
	if (!projectId || !message) {
		return
	}

	const key = processKey || projectId
	const snapshot = processSnapshots.get(key)
	if (!snapshot) {
		return
	}

	const cleanLine = String(message).trim()
	if (!cleanLine) {
		return
	}

	const logLine = `[${kind}] ${cleanLine}`
	const logs = [...snapshot.logs, logLine].slice(-12)
	processSnapshots.set(key, {
		...snapshot,
		logs,
		updatedAt: new Date().toISOString()
	})
}

const renderProcessesView = () => {
	const snapshots = Array.from(processSnapshots.values())
		.filter((item) => {
			const projectName = String(item.projectName || '').toLowerCase()
			const command = String(item.command || '').toLowerCase()
			const processKey = String(item.processKey || '').toLowerCase()
			const text = `${projectName} ${command} ${processKey}`.trim()
			const matchesTerm = !processFilterTerm || text.includes(processFilterTerm)
			const currentStatus = item.status === 'stopping' ? 'stopping' : (runningProjectIds.has(item.projectId) || item.status === 'running' ? 'running' : (item.status || 'stopped'))
			const matchesStatus = processFilterStatusValue === 'all' || currentStatus === processFilterStatusValue
			return matchesTerm && matchesStatus
		})
		.sort((a, b) => {
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
			const processKey = item.processKey || `${item.projectId}:${Date.now().toString(36)}`
			const isRunning = runningProjectIds.has(item.projectId) || item.status === 'running' || item.status === 'stopping'
			const effectiveStatus = isRunning ? (item.status === 'stopping' ? 'stopping' : 'running') : (item.status || 'idle')
			const statusClass = effectiveStatus === 'running' ? 'status running' : 'status idle'
			const statusLabel = toStatusLabel(effectiveStatus)
			const lastLogs = item.logs.length
				? item.logs.map((line) => linkifyUrls(line)).join('\n')
				: 'Sin salida aun.'
			const stopButton = isRunning
				? `<button type="button" class="process-stop-button" data-project-id="${item.projectId}" data-process-key="${processKey}" data-command="${escapeHtml(item.command || '')}">${renderButtonIcon('player-stop', 'Detener')}</button>`
				: `<button type="button" class="process-stop-button" data-project-id="${item.projectId}" data-process-key="${processKey}" data-command="${escapeHtml(item.command || '')}" disabled>${renderButtonIcon('player-stop', 'Detener')}</button>`
			const rerunButton = item.command
				? `<button type="button" class="process-rerun-button" data-project-id="${item.projectId}" data-process-key="${processKey}" data-command="${escapeHtml(item.command || '')}">${renderButtonIcon('refresh', 'Re-ejecutar')}</button>`
				: ''
			const closeButton = `<button type="button" class="process-close-button" data-project-id="${item.projectId}" data-process-key="${processKey}" title="Cerrar">${renderButtonIcon('x', 'Cerrar')}</button>`

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
					<div class="process-actions">
						${rerunButton}
						${stopButton}
						${closeButton}
					</div>
				</article>
			`
		})
		.join('')

	processesView.querySelectorAll('.process-stop-button').forEach((button) => {
		button.addEventListener('click', async (event) => {
			const projectId = event.target.dataset.projectId
			const processKey = event.target.dataset.processKey
			try {
				await window.projectsApi.stop({ projectId, processKey })
			} catch (error) {
				// El estado se actualiza via onRunUpdate
			}
		})
	})

	processesView.querySelectorAll('.process-rerun-button').forEach((button) => {
		button.addEventListener('click', async (event) => {
			const projectId = event.target.dataset.projectId
			const processKey = event.target.dataset.processKey
			const command = event.target.dataset.command
			try {
				const stopResult = await window.projectsApi.stop({ projectId, processKey })
				if (stopResult?.stopped) {
					runningProjectIds.delete(projectId)
					await new Promise((resolve) => setTimeout(resolve, 400))
				}
				const runResult = await window.projectsApi.run(projectId, command, '')
				runningProjectIds.add(projectId)
				upsertProcessSnapshot(runResult)
				appendProcessLog({ projectId, processKey: runResult.processKey }, `Reiniciando: ${command}`, 'sys')
				renderProjects(currentProjects)
				renderProcessesView()
			} catch (error) {
				showToast(error?.message || 'No se pudo reiniciar el comando.', 'error')
			}
		})
	})

	processesView.querySelectorAll('.process-close-button').forEach((button) => {
		button.addEventListener('click', async (event) => {
			const projectId = event.target.dataset.projectId
			const processKey = event.target.dataset.processKey
			closedProcessKeys.add(processKey)
			try {
				await window.projectsApi.stop({ projectId, processKey })
			} catch (error) {
				// Ya detenido
			}
			processSnapshots.delete(processKey)
			runningProjectIds.delete(projectId)
			closedProcessKeys.delete(processKey)
			renderProjects(currentProjects)
			renderProcessesView()
		})
	})

	processesView.querySelectorAll('.process-link').forEach((link) => {
		link.addEventListener('click', (event) => {
			event.preventDefault()
			const url = link.dataset.url
			if (!url) {
				return
			}
			window.projectsApi.openExternal(url)
		})
	})
}

const setActiveTab = (tabName) => {
	setUiState({ activeTab: tabName })
	const showProjects = tabName === 'projects'
	const showProcesses = tabName === 'processes'
	const showTerminal = tabName === 'terminal'
	const showSettings = tabName === 'settings'
	const showHistory = tabName === 'history'
	const showAbout = tabName === 'about'

	projectFilters.classList.toggle('is-hidden', !showProjects)
	projectsList.classList.toggle('is-hidden', !showProjects)
	processesView.classList.toggle('is-hidden', !showProcesses)
	terminalView.classList.toggle('is-hidden', !showTerminal)
	settingsView.classList.toggle('is-hidden', !showSettings)
	historyView.classList.toggle('is-hidden', !showHistory)
	aboutView.classList.toggle('is-hidden', !showAbout)

	if (!showProjects && showDashboard) {
		toggleDashboard()
	}

	tabButtons.forEach((button) => {
		const isSelected = button.dataset.tab === tabName
		button.classList.toggle('is-active', isSelected)
		button.setAttribute('aria-selected', String(isSelected))
	})

	if (showTerminal) {
		ensureTerminalInstance()
		fitTerminal()
	}

	if (showAbout) {
		populateAboutInfo()
	}

	if (showHistory) {
		setUiState({ historyFilterTerm: '', historyFilterStatusValue: 'all' })
		if (historySearchInput) historySearchInput.value = ''
		if (historyFilterStatus) historyFilterStatus.value = 'all'
		renderHistoryView()
	}
}

const resetDraftEnvironmentProfiles = () => {
	setUiState({ projectEnvironmentProfiles: [], projectDefaultEnvironmentProfileId: '' })
}

const resetFormMode = () => {
	setUiState({ editingProjectId: null })
	formTitle.textContent = 'Agrega proyectos locales'
	formSubtitle.textContent = 'Guarda nombre, ruta, varios comandos e icono para ejecutar mas rapido.'
	submitProjectButton.textContent = 'Guardar proyecto'
	cancelEditButton.hidden = true
	autoDetectButton.hidden = false
	resetDraftEnvironmentProfiles()
}

const startEditMode = (projectId) => {
	const project = currentProjects.find((item) => item.id === projectId)
	if (!project) {
		setFeedback('No se encontro el proyecto para editar.', 'error')
		return
	}

	if (showDashboard) {
		toggleDashboard()
	}

	setActiveTab('projects')

	setUiState({ editingProjectId: projectId })
	nameInput.value = project.name
	pathInput.value = project.path
	iconInput.value = project.icon || ''
	commandsInput.value = project.commands.join('\n')
	projectTagsInput.value = getProjectTags(project).join(', ')
	formTitle.textContent = `Editando: ${project.name}`
	formSubtitle.textContent = 'Actualiza nombre, ruta, comandos o icono y guarda los cambios.'
	submitProjectButton.textContent = 'Guardar cambios'
	cancelEditButton.hidden = false
	autoDetectButton.hidden = true
	resetDraftEnvironmentProfiles()
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

	projectsList.classList.toggle('view-grid', projectViewMode === 'grid')
	projectsList.classList.toggle('view-compact', projectViewMode === 'compact')

	projectsList.innerHTML = visibleProjects
		.map((project) => {
			const isFavorite = Boolean(project.favorite)
			const isRunning = runningProjectIds.has(project.id)
			const activeProfileIds = getNormalizedProfileIds(project)
			const iconUrl = normalizeIconInput(project.icon)
			const iconMarkup = iconUrl
				? `<img class="project-icon" src="${escapeHtml(iconUrl)}" alt="Icono de ${escapeHtml(project.name)}" />`
				: `<div class="project-icon project-icon-fallback">${getProjectInitial(project.name)}</div>`
			const iconLabel = iconUrl ? escapeHtml(iconUrl) : 'Sin icono'
			const environmentProfiles = Array.isArray(project.environmentProfiles) ? project.environmentProfiles : []

			if (projectViewMode === 'compact') {
				const isExpanded = expandedProjectIds.has(project.id)
				const expandClass = isExpanded ? 'is-expanded' : ''
				const statusClass = isRunning ? 'status running' : 'status idle'
				const statusLabel = isRunning ? 'En ejecucion' : 'Detenido'
				const favoriteClass = isFavorite ? 'is-favorite' : ''

				return `
					<article class="project-card view-compact ${expandClass} ${favoriteClass}" data-project-id="${escapeHtml(project.id)}" title="${escapeHtml(project.path)}">
						<header class="compact-header">
							<div class="card-title-wrap">
								${iconMarkup}
								<div>
									<h3>${escapeHtml(project.name)}</h3>
									<p class="project-path-label">${escapeHtml(project.path)}</p>
									<div class="project-tags">${renderProjectTags(project)}</div>
								</div>
							</div>
							<div class="compact-header-meta">
								<span class="${statusClass}">${statusLabel}</span>
								<span class="compact-git-badge">${escapeHtml(getGitSummary(project.id))}</span>
								<svg class="chevron-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<polyline points="6 9 12 15 18 9"></polyline>
								</svg>
							</div>
						</header>
						<div class="compact-details">
							<section>
								<h4>Comandos</h4>
								<div class="run-controls">
									<select class="command-select">${formatCommandOptions(project.commands)}</select>
									<button type="button" class="run-button icon-button" title="Ejecutar comando" aria-label="Ejecutar comando">${renderButtonIcon('player-play', 'Ejecutar')}</button>
									<button type="button" class="run-all-button icon-button" title="Ejecutar todos" aria-label="Ejecutar todos">${renderButtonIcon('player-track-next', 'Multi-run')}</button>
									<button type="button" class="stop-button icon-button has-mobile-label" ${isRunning ? '' : 'disabled'} title="Detener" aria-label="Detener">${renderButtonIcon('player-stop', 'Detener', true)}</button>
								</div>
								<div class="manage-controls">
									<button type="button" class="favorite-button icon-button ${isFavorite ? 'is-favorite' : ''}" title="${isFavorite ? 'Quitar favorito' : 'Marcar favorito'}" aria-label="${isFavorite ? 'Quitar favorito' : 'Marcar favorito'}">${renderButtonIcon('star', isFavorite ? 'Quitar' : 'Favorito')}</button>
									<button type="button" class="view-process-button icon-button icon-text" title="Ver proceso" aria-label="Ver proceso">${renderButtonIcon('screen-share', 'Proceso', false, true)}</button>
									<button type="button" class="environment-profiles-button icon-button icon-text" title="Perfiles de entorno" aria-label="Perfiles de entorno">${renderButtonIcon('binary-tree-2', 'Perfiles', false, true)}</button>
									${renderProjectMenu(project.id)}
								</div>
								<div class="project-profile-runner">
									<label>Perfiles de entorno</label>
									<div class="profile-checkboxes">
										${environmentProfiles.length ? environmentProfiles.map((profile) => `
											<label class="profile-check">
												<input type="checkbox" class="profile-checkbox" value="${escapeHtml(profile.id)}" ${activeProfileIds.includes(profile.id) ? 'checked' : ''} />
												<span>${escapeHtml(profile.name || 'Perfil')}</span>
											</label>`).join('') : '<span class="profile-empty">Sin perfiles</span>'}
									</div>
									<p class="profile-hint">Marca uno o varios. Ninguno = sin perfil.</p>
								</div>
								<p class="project-meta">${escapeHtml(getGitSummary(project.id))}</p>
							</section>
							<footer>
								<span>Icono: ${iconLabel}</span>
							</footer>
						</div>
					</article>
				`
			} else {
				const favoriteClass = isFavorite ? 'is-favorite' : ''
				return `
					<article class="project-card ${favoriteClass}" data-project-id="${escapeHtml(project.id)}" title="${escapeHtml(project.path)}">
						<header>
							<div class="card-title-wrap">
								${iconMarkup}
								<div>
									<h3>${escapeHtml(project.name)}</h3>
									<p class="project-path-label">${escapeHtml(project.path)}</p>
									<div class="project-tags">${renderProjectTags(project)}</div>
								</div>
							</div>
						</header>
						<section>
							<h4>Comandos</h4>
							<div class="run-controls">
								<select class="command-select">${formatCommandOptions(project.commands)}</select>
								<button type="button" class="run-button icon-button" title="Ejecutar comando" aria-label="Ejecutar comando">${renderButtonIcon('player-play', 'Ejecutar comando')}</button>
								<button type="button" class="run-all-button icon-button" title="Ejecutar todos" aria-label="Ejecutar todos">${renderButtonIcon('player-track-next', 'Ejecutar todos')}</button>
								<button type="button" class="stop-button icon-button has-mobile-label" ${isRunning ? '' : 'disabled'} title="Detener" aria-label="Detener">${renderButtonIcon('player-stop', 'Detener', true)}</button>
							</div>
							<div class="manage-controls">
								<button type="button" class="favorite-button icon-button ${isFavorite ? 'is-favorite' : ''}" title="${isFavorite ? 'Quitar favorito' : 'Marcar favorito'}" aria-label="${isFavorite ? 'Quitar favorito' : 'Marcar favorito'}">${renderButtonIcon('star', isFavorite ? 'Quitar favorito' : 'Marcar favorito')}</button>
								<button type="button" class="view-process-button icon-button icon-text" title="Ver proceso" aria-label="Ver proceso">${renderButtonIcon('screen-share', 'Ver proceso', false, true)}</button>
								<button type="button" class="environment-profiles-button icon-button icon-text" title="Perfiles de entorno" aria-label="Perfiles de entorno">${renderButtonIcon('binary-tree-2', 'Perfiles de entorno', false, true)}</button>
								${renderProjectMenu(project.id)}
							</div>
							<div class="project-profile-runner">
								<label>Perfiles de entorno</label>
								<div class="profile-checkboxes">
									${environmentProfiles.length ? environmentProfiles.map((profile) => `
										<label class="profile-check">
											<input type="checkbox" class="profile-checkbox" value="${escapeHtml(profile.id)}" ${activeProfileIds.includes(profile.id) ? 'checked' : ''} />
											<span>${escapeHtml(profile.name || 'Perfil')}</span>
										</label>`).join('') : '<span class="profile-empty">Sin perfiles</span>'}
								</div>
								<p class="profile-hint">Marca uno o varios. Ninguno = sin perfil.</p>
							</div>
							<p class="project-meta">${escapeHtml(getGitSummary(project.id))}</p>
						</section>
						<footer>
							<span>Icono: ${iconLabel}</span>
						</footer>
					</article>
				`
			}
		})
		.join('')

	if (projectViewMode === 'compact') {
		projectsList.querySelectorAll('.compact-header').forEach((header) => {
			header.addEventListener('click', (event) => {
				const card = header.closest('.project-card')
				const projectId = card.dataset.projectId
				const isExpanded = expandedProjectIds.has(projectId)

				if (isExpanded) {
					expandedProjectIds.delete(projectId)
					card.classList.remove('is-expanded')
				} else {
					expandedProjectIds.add(projectId)
					card.classList.add('is-expanded')
				}
			})
		})
	}
}

const loadProjects = async () => {
	const projects = await window.projectsApi.list()
	setUiState({ currentProjects: projects })
	currentProjects.forEach((project) => {
		const existingSelected = selectedEnvironmentProfileByProjectId.get(project.id)
		const availableProfiles = Array.isArray(project.environmentProfiles) ? project.environmentProfiles : []
		const validSelected = availableProfiles.some((profile) => profile.id === existingSelected)
		if (!validSelected) {
			selectedEnvironmentProfileByProjectId.set(project.id, project.lastUsedEnvironmentProfileId || project.defaultEnvironmentProfileId || availableProfiles[0]?.id || '')
		}
	})
	await syncProjectTagOptions()
	syncTerminalProjectOptions()
	syncTerminalProfileOptions()
	if (terminalOpenButton) {
		terminalOpenButton.disabled = true
	}
	if (terminalClearButton) {
		terminalClearButton.disabled = true
	}
	if (terminalCloseButton) {
		terminalCloseButton.disabled = true
	}
	if (terminalOpenExternalButton) {
		terminalOpenExternalButton.disabled = currentProjects.length === 0
	}
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
		renderIconPreview(iconInput.value)
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
		persistLastUsedEnvironmentProfile(projectId, terminalProfileSelect.value)
	}
})

terminalOpenExternalButton?.addEventListener('click', openExternalTerminalSession)
terminalOpenButton?.addEventListener('click', openTerminalSession)
terminalClearButton?.addEventListener('click', clearTerminalSession)
terminalCloseButton?.addEventListener('click', closeTerminalSession)

const syncViewSwitcherButtons = () => {
	if (viewModeGridBtn && viewModeCompactBtn) {
		viewModeGridBtn.classList.toggle('is-active', projectViewMode === 'grid')
		viewModeCompactBtn.classList.toggle('is-active', projectViewMode === 'compact')
	}
}

viewModeGridBtn?.addEventListener('click', () => {
	setUiState({ projectViewMode: 'grid' })
	localStorage.setItem('fluxdev_project_view_mode', 'grid')
	syncViewSwitcherButtons()
	renderProjects(currentProjects)
})

viewModeCompactBtn?.addEventListener('click', () => {
	setUiState({ projectViewMode: 'compact' })
	localStorage.setItem('fluxdev_project_view_mode', 'compact')
	syncViewSwitcherButtons()
	renderProjects(currentProjects)
})

projectSearchInput.addEventListener('input', () => {
	setUiState({ projectSearchTerm: projectSearchInput.value })
	renderProjects(currentProjects)
})

favoritesOnlyInput.addEventListener('change', () => {
	setUiState({ favoritesOnly: favoritesOnlyInput.checked })
	renderProjects(currentProjects)
})

projectSortSelect?.addEventListener('change', () => {
	setUiState({ projectSortBy: projectSortSelect.value })
	renderProjects(currentProjects)
})

projectTagFilter?.addEventListener('change', () => {
	setUiState({
		projectTagFilter: Array.from(projectTagFilter.selectedOptions).map((option) => option.value),
	})
	renderProjects(currentProjects)
})

projectTagFilter?.addEventListener('mousedown', (event) => {
	const option = event.target.closest('option')
	if (!option) {
		return
	}

	event.preventDefault()
	option.selected = !option.selected
	projectTagFilter.dispatchEvent(new Event('change', { bubbles: true }))
})

projectTagFilterMode?.addEventListener('change', () => {
	setUiState({ projectTagFilterMode: projectTagFilterMode.value })
	renderProjects(currentProjects)
})

iconTemplateButtons.forEach((button) => {
	const template = button.dataset.template || ''
	const label = button.dataset.label || button.textContent.trim() || 'Icono'
	const iconUrl = normalizeIconInput(template)
	button.innerHTML = `
		<img class="icon-template-preview" src="${escapeHtml(iconUrl || '')}" alt="${escapeHtml(label)}" />
		<span>${escapeHtml(label)}</span>
	`
	button.addEventListener('click', () => {
		iconInput.value = template
		renderIconPreview(template)
	})
})

iconInput.addEventListener('input', () => {
	renderIconPreview(iconInput.value)
})

addProjectEnvironmentProfilesButton?.addEventListener('click', () => {
	openEnvironmentProfilesModal()
})

if (iconInput.value) {
	renderIconPreview(iconInput.value)
}

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
		commands: parseCommands(commandsInput.value),
		tags: parseProjectTags(projectTagsInput.value),
		environmentProfiles: projectEnvironmentProfiles,
		defaultEnvironmentProfileId: projectDefaultEnvironmentProfileId || projectEnvironmentProfiles[0]?.id || '',
		lastUsedEnvironmentProfileId: editingProjectId
			? currentProjects.find((project) => project.id === editingProjectId)?.lastUsedEnvironmentProfileId || ''
			: ''
	}

	try {
		if (editingProjectId) {
			await window.projectsApi.update(editingProjectId, payload)
			setFeedback('Proyecto actualizado correctamente.', 'success')
			showToast('Proyecto actualizado', 'success')
		} else {
			await window.projectsApi.add(payload)
			setFeedback('Proyecto guardado correctamente.', 'success')
			showToast('Proyecto guardado', 'success')
		}

		form.reset()
		resetFormMode()
		await loadProjects()
	} catch (error) {
		const message = error?.message || 'No se pudo guardar el proyecto.'
		setFeedback(message, 'error')
		showToast(message, 'error')
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
	if (event.target.classList.contains('profile-checkbox')) {
		const profileIds = readSelectedProfileIds(card)
		selectedEnvironmentProfileByProjectId.set(projectId, profileIds)
		persistLastUsedEnvironmentProfile(projectId, profileIds[profileIds.length - 1])
		renderProjects(currentProjects)
	}
})

projectsList.addEventListener('click', async (event) => {
	const card = event.target.closest('.project-card')
	if (!card) {
		return
	}

	const actionButton = event.target.closest('button')
	if (!actionButton) {
		return
	}

	const projectId = card.dataset.projectId
	const commandSelect = card.querySelector('.command-select')
	const command = commandSelect?.value || ''
	const profileIds = readSelectedProfileIds(card)

	if (actionButton.classList.contains('run-button')) {
		try {
			const runResult = await window.projectsApi.run(projectId, command, profileIds)
			runningProjectIds.add(projectId)
			selectedEnvironmentProfileByProjectId.set(projectId, profileIds)
			persistLastUsedEnvironmentProfile(projectId, profileIds[profileIds.length - 1])
			upsertProcessSnapshot(runResult)
			appendProcessLog({ projectId, processKey: runResult.processKey }, `Ejecutando: ${command}`, 'sys')
			const project = currentProjects.find((p) => p.id === projectId)
			addToHistory(projectId, project?.name || projectId, command, 'running')
			renderProjects(currentProjects)
			renderProcessesView()
			setFeedback(`Comando lanzado: ${command}`, 'success')
		} catch (error) {
			setFeedback(error?.message || 'No se pudo ejecutar el comando.', 'error')
			showToast(error?.message || 'No se pudo ejecutar el comando.', 'error')
		}
	}

	if (actionButton.classList.contains('run-all-button')) {
		try {
			await window.projectsApi.runAll(projectId, profileIds)
			selectedEnvironmentProfileByProjectId.set(projectId, profileIds)
			persistLastUsedEnvironmentProfile(projectId, profileIds[profileIds.length - 1])
			setFeedback('Multi-run iniciado correctamente.', 'success')
		} catch (error) {
			setFeedback(error?.message || 'No se pudo iniciar el multi-run.', 'error')
		}
	}

	if (actionButton.classList.contains('stop-button')) {
		try {
			await window.projectsApi.stop({ projectId })
			runningProjectIds.delete(projectId)
			upsertProcessSnapshot({ projectId, status: 'stopping' })
			appendProcessLog({ projectId }, 'Solicitud de detencion enviada para todos los procesos.', 'sys')
			renderProjects(currentProjects)
			renderProcessesView()
		} catch (error) {
			setFeedback(error?.message || 'No se pudo detener el comando.', 'error')
		}
	}

	if (actionButton.classList.contains('view-process-button')) {
		setActiveTab('processes')
	}

	if (actionButton.classList.contains('open-folder-button')) {
		try {
			await window.projectsApi.openFolder(projectId)
		} catch (error) {
			// Silently fail
		}
	}

	if (actionButton.classList.contains('environment-profiles-button')) {
		openEnvironmentProfilesModal(projectId)
	}

	if (actionButton.classList.contains('redetect-button')) {
		try {
			setFeedback('Re-detectando comandos y perfiles...', 'info')
			await window.projectsApi.update(projectId, {}, true)
			await loadProjects()
			setFeedback('Comandos y perfiles re-detectados.', 'success')
			showToast('Proyecto actualizado', 'success')
		} catch (error) {
			setFeedback(error?.message || 'No se pudo re-detectar.', 'error')
			showToast(error?.message || 'No se pudo re-detectar.', 'error')
		}
	}

	if (actionButton.classList.contains('favorite-button')) {
		try {
			await window.projectsApi.toggleFavorite(projectId)
			await loadProjects()
			setFeedback('Favorito actualizado.', 'success')
			showToast('Favorito actualizado', 'success')
		} catch (error) {
			setFeedback(error?.message || 'No se pudo actualizar favorito.', 'error')
			showToast(error?.message || 'No se pudo actualizar favorito.', 'error')
		}
	}

	if (actionButton.classList.contains('project-menu-trigger')) {
		const dropdown = card.querySelector(`.project-menu-dropdown[data-menu-dropdown="${projectId}"]`)
		if (dropdown) {
			const wasOpen = dropdown.classList.contains('is-open')
			document.querySelectorAll('.project-menu-dropdown.is-open').forEach((d) => d.classList.remove('is-open'))
			if (!wasOpen) {
				dropdown.classList.add('is-open')
			}
		}
		return
	}

	if (actionButton.closest('.project-menu-item')) {
		const menuItem = actionButton.closest('.project-menu-item')
		const action = menuItem.dataset.menuAction

		if (action === 'edit') {
			startEditMode(projectId)
		}

		if (action === 'redetect') {
			try {
				setFeedback('Re-detectando comandos y perfiles...', 'info')
				await window.projectsApi.update(projectId, {}, true)
				await loadProjects()
				setFeedback('Comandos y perfiles re-detectados.', 'success')
				showToast('Proyecto actualizado', 'success')
			} catch (error) {
				setFeedback(error?.message || 'No se pudo re-detectar.', 'error')
				showToast(error?.message || 'No se pudo re-detectar.', 'error')
			}
		}

		if (action === 'open-folder') {
			try {
				await window.projectsApi.openFolder(projectId)
			} catch (error) {
				// Silently fail
			}
		}

		if (action === 'delete') {
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
				showToast('Proyecto eliminado', 'success')
			} catch (error) {
				setFeedback(error?.message || 'No se pudo eliminar el proyecto.', 'error')
				showToast(error?.message || 'No se pudo eliminar el proyecto.', 'error')
			}
		}

		document.querySelectorAll('.project-menu-dropdown.is-open').forEach((d) => d.classList.remove('is-open'))
		return
	}
})

window.addEventListener('error', (event) => {
	const errorMessage = event?.error?.message || 'Error inesperado en la interfaz.'
	console.error('Renderer error:', errorMessage)
	showToast(errorMessage, 'error')
})

window.addEventListener('unhandledrejection', (event) => {
	const reason = event?.reason instanceof Error ? event.reason.message : String(event?.reason || 'Error no controlado.')
	console.error('Unhandled renderer rejection:', reason)
	showToast(reason, 'error')
})

window.projectsApi.onRunUpdate((event) => {
	const eventKey = String(event?.processKey || event?.projectId || '').trim()
	const eventProjectId = String(event?.projectId || '').trim()
	const eventStatus = String(event?.status || '').trim()

	if (eventStatus === 'stopping') {
		upsertProcessSnapshot({ projectId: eventProjectId, processKey: eventKey || undefined, status: 'stopping' })
		if (eventProjectId) {
			runningProjectIds.delete(eventProjectId)
		}
		scheduleProjectUiRefresh()
		return
	}

	if (eventStatus === 'running' && eventKey) {
		closedProcessKeys.delete(eventKey)
	}

	if (eventKey && closedProcessKeys.has(eventKey)) {
		return
	}

	if (eventStatus === 'stopped' || eventStatus === 'failed') {
		const existingSnapshot = processSnapshots.get(eventKey || eventProjectId)
		if (existingSnapshot) {
			existingSnapshot.status = eventStatus
			existingSnapshot.updatedAt = new Date().toISOString()
		} else {
			upsertProcessSnapshot(event)
		}
		if (eventProjectId) {
			runningProjectIds.delete(eventProjectId)
		}
		const historyStatus = eventStatus === 'failed' ? 'error' : 'complete'
		const existingEntry = executionHistory.find((e) => e.projectId === eventProjectId && e.status === 'running')
		if (existingEntry) {
			existingEntry.status = historyStatus
		}
		scheduleProjectUiRefresh()
		return
	}

	upsertProcessSnapshot(event)

	if (event.status === 'running') {
		runningProjectIds.add(event.projectId)
	}

	if (event.status === 'deleted') {
		runningProjectIds.delete(event.projectId)
		processSnapshots.delete(event.projectId)
	}

	if (event.status === 'log') {
		appendProcessLog({ projectId: event.projectId, processKey: event.processKey }, event.message, 'out')
	}

	if (event.status === 'error-log') {
		appendProcessLog({ projectId: event.projectId, processKey: event.processKey }, event.message, 'err')
	}

	if (event.status === 'running' || event.status === 'stopping' || event.status === 'stopped' || event.status === 'failed') {
		appendProcessLog({ projectId: event.projectId, processKey: event.processKey }, event.message, 'sys')
		upsertProcessSnapshot(event)
	}

	appendProcessEventToTerminalViewer(event)

	scheduleProjectUiRefresh()

	if (event.status === 'running') {
		showToast(event.message, 'success', 3000)
	}

	if (event.status === 'failed') {
		showToast(event.message, 'error')
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

window.addEventListener('terminal-unavailable', (event) => {
	const reason = event?.detail?.reason || 'No se pudo inicializar ghostty-web.'
	terminalEngineState = 'failed'
	terminalEngineError = reason
	setTerminalStatus(`Terminal integrada no disponible: ${reason}`)
	setFeedback('La terminal integrada requiere ghostty-web disponible en node_modules.', 'error')
})

window.addEventListener('terminal-loaded', () => {
	terminalEngineState = 'ready'
	terminalEngineError = ''

	if (activeTab !== 'terminal') {
		return
	}

	ensureTerminalInstance()
	fitTerminal()
})

const populateAboutInfo = () => {
	const pkg = { version: '1.0.0' }
	aboutVersion.textContent = `v${pkg.version}`
	aboutElectron.textContent = window.versions.electron()
	aboutNode.textContent = window.versions.node()
	aboutChrome.textContent = window.versions.chrome()
	aboutOs.textContent = window.projectsApi?.getPlatform?.() || window.versions.platform?.() || 'N/A'
	aboutShell.textContent = 'PowerShell'
}

const persistHistory = () => {
	try {
		window.projectsApi?.saveHistory(executionHistory)
	} catch (error) {
		// Silenciar errores de persistencia
	}
}

const addToHistory = (projectId, projectName, command, status) => {
	const entry = {
		id: Date.now(),
		projectId,
		projectName,
		command,
		status,
		timestamp: new Date().toISOString()
	}
	executionHistory.unshift(entry)
	if (executionHistory.length > MAX_HISTORY) {
		executionHistory.pop()
	}
	persistHistory()
	if (activeTab === 'history') {
		renderHistoryView()
	}
	if (activeTab === 'dashboard') {
		renderDashboard()
	}
}

const renderHistoryView = () => {
	const filtered = executionHistory.filter((entry) => {
		const matchesSearch = !historyFilterTerm ||
			entry.projectName.toLowerCase().includes(historyFilterTerm) ||
			entry.command.toLowerCase().includes(historyFilterTerm)
		const matchesStatus = historyFilterStatusValue === 'all' || entry.status === historyFilterStatusValue
		return matchesSearch && matchesStatus
	})

	if (filtered.length === 0) {
		historyList.innerHTML = ''
		historyEmpty.hidden = false
		return
	}

	historyEmpty.hidden = true
	historyList.innerHTML = filtered.map((entry) => {
		const time = new Date(entry.timestamp)
		const timeStr = time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
		const dateStr = time.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
		return `<div class="history-item">
			<span class="history-status ${escapeHtml(entry.status)}"></span>
			<div class="history-info">
				<div class="history-project">${escapeHtml(entry.projectName)}</div>
				<div class="history-command">${escapeHtml(entry.command)}</div>
			</div>
			<span class="history-time">${dateStr} ${timeStr}</span>
		</div>`
	}).join('')
}

const openGlobalSearchModal = () => {
	if (!globalSearchModal) {
		return
	}

	globalSearchModal.classList.remove('is-hidden')
	globalSearchModal.setAttribute('aria-hidden', 'false')
	renderGlobalSearchResults()
	setTimeout(() => globalSearchInput?.focus(), 20)
}

const closeGlobalSearchModal = () => {
	if (!globalSearchModal) {
		return
	}

	globalSearchModal.classList.add('is-hidden')
	globalSearchModal.setAttribute('aria-hidden', 'true')
	if (globalSearchInput) {
		globalSearchInput.value = ''
	}
	renderGlobalSearchResults()
}

const renderGlobalSearchResults = () => {
	if (!globalSearchResults || !currentProjects.length) {
		if (globalSearchResults) {
			globalSearchResults.innerHTML = `
				<article class="empty-state">
					<h3>Sin proyectos</h3>
					<p>Agrega un proyecto para lanzar comandos desde aqui.</p>
				</article>
			`
		}
		return
	}

	const query = (globalSearchInput?.value || '').trim().toLowerCase()
	const results = []

	currentProjects.forEach((project) => {
		const commands = Array.isArray(project.commands) ? project.commands : []
		const projectMatches = !query || `${project.name} ${project.path}`.toLowerCase().includes(query)
		const commandMatches = !query ? commands.slice(0, 4) : commands.filter((command) => command.toLowerCase().includes(query))

		if (projectMatches) {
			const selectedCommands = commandMatches.length ? commandMatches : commands.slice(0, 1)
			selectedCommands.forEach((command) => {
				results.push({
					projectId: project.id,
					projectName: project.name,
					projectPath: project.path,
					command
				})
			})
		}
		if (!projectMatches && commandMatches.length) {
			commandMatches.forEach((command) => {
				results.push({
					projectId: project.id,
					projectName: project.name,
					projectPath: project.path,
					command
				})
			})
		}
	})

	if (!results.length) {
		globalSearchResults.innerHTML = `
			<article class="empty-state">
				<h3>Sin coincidencias</h3>
				<p>Prueba un nombre, ruta o comando distinto.</p>
			</article>
		`
		return
	}

	globalSearchResults.innerHTML = results.slice(0, 12).map((entry) => `
		<button type="button" class="global-search-item" data-project-id="${escapeHtml(entry.projectId)}" data-command="${escapeHtml(entry.command)}">
			<div>
				<strong>${escapeHtml(entry.projectName)}</strong>
				<small>${escapeHtml(entry.command)}</small>
			</div>
			<span class="global-search-badge">${escapeHtml(entry.projectPath)}</span>
		</button>
	`).join('')

	globalSearchResults.querySelectorAll('.global-search-item').forEach((button) => {
		button.addEventListener('click', async () => {
			const projectId = button.dataset.projectId
			const command = button.dataset.command
			if (!projectId || !command) {
				return
			}

			try {
				const project = currentProjects.find((item) => item.id === projectId)
				const profileIds = project ? getNormalizedProfileIds(project) : []
				const runResult = await window.projectsApi.run(projectId, command, profileIds)
				runningProjectIds.add(projectId)
				selectedEnvironmentProfileByProjectId.set(projectId, profileIds)
				upsertProcessSnapshot(runResult)
				appendProcessLog({ projectId, processKey: runResult.processKey }, `Ejecutando: ${command}`, 'sys')
				if (project) {
					addToHistory(projectId, project.name, command, 'running')
				}
				renderProjects(currentProjects)
				renderProcessesView()
				if (showDashboard) {
					renderDashboard()
				}
				closeGlobalSearchModal()
				setFeedback(`Comando lanzado: ${command}`, 'success')
			} catch (error) {
				setFeedback(error?.message || 'No se pudo ejecutar el comando.', 'error')
				showToast(error?.message || 'No se pudo ejecutar el comando.', 'error')
			}
		})
	})
}

const renderDashboard = () => {
	const total = currentProjects.length
	const running = runningProjectIds.size
	const favorites = currentProjects.filter((p) => p.favorite).length

	statTotal.textContent = total
	statRunning.textContent = running
	statFavorites.textContent = favorites
	renderGlobalTagsManager()

	const seen = new Set()
	const quickRunEntries = []
	for (const entry of executionHistory) {
		const key = `${entry.projectId}::${entry.command}`
		if (seen.has(key)) continue
		seen.add(key)
		quickRunEntries.push(entry)
		if (quickRunEntries.length >= 5) break
	}
	if (quickRunEntries.length === 0) {
		dashboardQuickRunList.innerHTML = ''
		dashboardQuickRunEmpty.hidden = false
	} else {
		dashboardQuickRunEmpty.hidden = true
		dashboardQuickRunList.innerHTML = quickRunEntries.map((entry) => {
			return `<div class="quick-run-item" data-project-id="${escapeHtml(entry.projectId)}" data-command="${escapeHtml(entry.command)}">
				<span class="quick-run-project">${escapeHtml(entry.projectName)}</span>
				<span class="quick-run-command">${escapeHtml(entry.command)}</span>
				<button type="button" class="quick-run-btn" title="Ejecutar">${renderButtonIcon('player-play', 'Ejecutar')}</button>
			</div>`
		}).join('')
	}

	renderStatusChart()
	renderTopProjectsChart()
}

const renderGlobalTagsManager = async () => {
	if (!globalTagsList || !globalTagsEmpty || !window.projectsApi?.listTags) {
		return
	}

	try {
		const tags = await window.projectsApi.listTags()
		globalTagsEmpty.hidden = tags.length > 0
		globalTagsList.innerHTML = tags.map((tag) => `
			<article class="global-tag-item" data-tag-name="${escapeHtml(tag.name)}">
				<div class="global-tag-info">
					<span class="project-tag">${escapeHtml(tag.name)}</span>
					<span class="global-tag-count">${tag.count} proyecto(s)</span>
				</div>
				<div class="global-tag-actions">
					<button type="button" class="icon-button global-tag-rename" title="Renombrar etiqueta" aria-label="Renombrar etiqueta">${renderButtonIcon('edit', 'Renombrar')}</button>
					<button type="button" class="icon-button global-tag-delete" title="Eliminar etiqueta" aria-label="Eliminar etiqueta">${renderButtonIcon('trash', 'Eliminar')}</button>
				</div>
			</article>
		`).join('')
	} catch (error) {
		setFeedback(error?.message || 'No se pudieron cargar las etiquetas globales.', 'error')
	}
}

globalTagForm?.addEventListener('submit', async (event) => {
	event.preventDefault()
	const name = globalTagInput.value.trim()
	if (!name) {
		return
	}

	try {
		await window.projectsApi.createTag(name)
		globalTagInput.value = ''
		await renderGlobalTagsManager()
		await syncProjectTagOptions()
		setFeedback('Etiqueta global creada.', 'success')
	} catch (error) {
		setFeedback(error?.message || 'No se pudo crear la etiqueta.', 'error')
	}
})

globalTagsList?.addEventListener('click', async (event) => {
	const item = event.target.closest('.global-tag-item')
	const button = event.target.closest('button')
	if (!item || !button) {
		return
	}

	const oldName = item.dataset.tagName
	try {
		if (button.classList.contains('global-tag-rename')) {
			const newName = window.prompt('Nuevo nombre de la etiqueta:', oldName)?.trim()
			if (!newName || newName === oldName) {
				return
			}
			await window.projectsApi.renameTag(oldName, newName)
			await loadProjects()
			await renderGlobalTagsManager()
			setFeedback('Etiqueta renombrada correctamente.', 'success')
		}

		if (button.classList.contains('global-tag-delete')) {
			if (!window.confirm(`Eliminar la etiqueta "${oldName}"?`)) {
				return
			}
			await window.projectsApi.deleteTag(oldName)
			await renderGlobalTagsManager()
			await syncProjectTagOptions()
			setFeedback('Etiqueta eliminada correctamente.', 'success')
		}
	} catch (error) {
		setFeedback(error?.message || 'No se pudo actualizar la etiqueta.', 'error')
	}
})

globalSearchInput?.addEventListener('input', () => {
	renderGlobalSearchResults()
})

globalSearchCloseButton?.addEventListener('click', closeGlobalSearchModal)

globalSearchModal?.addEventListener('click', (event) => {
	if (event.target === globalSearchModal) {
		closeGlobalSearchModal()
	}
})

let statusChartInstance = null
let topProjectsChartInstance = null

const renderStatusChart = () => {
	const ctx = document.getElementById('status-chart')
	if (!ctx) return

	const completed = executionHistory.filter((e) => e.status === 'complete').length
	const errors = executionHistory.filter((e) => e.status === 'error').length
	const runningCount = executionHistory.filter((e) => e.status === 'running').length

	const data = {
		labels: ['Completado', 'Error', 'Ejecutando'],
		datasets: [{
			data: [completed, errors, runningCount],
			backgroundColor: ['#2ecc71', '#ff5a5f', '#39ff14'],
			borderColor: ['#27ae60', '#e74c3c', '#2ecc71'],
			borderWidth: 2,
			hoverOffset: 8
		}]
	}

	if (statusChartInstance) {
		statusChartInstance.data = data
		statusChartInstance.update()
	} else {
		statusChartInstance = new Chart(ctx, {
			type: 'doughnut',
			data,
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'bottom',
						labels: {
							color: '#ebf6eb',
							padding: 12,
							font: { size: 11 }
						}
					}
				},
				cutout: '65%'
			}
		})
	}
}

const renderTopProjectsChart = () => {
	const ctx = document.getElementById('top-projects-chart')
	if (!ctx) return

	const projectCounts = {}
	executionHistory.forEach((entry) => {
		if (!projectCounts[entry.projectName]) {
			projectCounts[entry.projectName] = 0
		}
		projectCounts[entry.projectName]++
	})

	const sorted = Object.entries(projectCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)

	const labels = sorted.map(([name]) => name)
	const data = sorted.map(([, count]) => count)

	const chartData = {
		labels,
		datasets: [{
			label: 'Ejecuciones',
			data,
			backgroundColor: 'rgba(57, 255, 20, 0.3)',
			borderColor: '#39ff14',
			borderWidth: 2,
			borderRadius: 6
		}]
	}

	if (topProjectsChartInstance) {
		topProjectsChartInstance.data = chartData
		topProjectsChartInstance.update()
	} else {
		topProjectsChartInstance = new Chart(ctx, {
			type: 'bar',
			data: chartData,
			options: {
				responsive: true,
				maintainAspectRatio: false,
				indexAxis: 'y',
				plugins: {
					legend: { display: false }
				},
				scales: {
					x: {
						beginAtZero: true,
						ticks: {
							color: '#8fb09a',
							stepSize: 1
						},
						grid: {
							color: 'rgba(57, 255, 20, 0.08)'
						}
					},
					y: {
						ticks: {
							color: '#ebf6eb',
							font: { size: 11 }
						},
						grid: { display: false }
					}
				}
			}
		})
	}
}

const showWelcomeIfNeeded = () => {
	const onboarded = localStorage.getItem('fluxdev_onboarded')
	if (!onboarded) {
		welcomeOverlay.classList.remove('is-hidden')
		welcomeOverlay.setAttribute('aria-hidden', 'false')
	}
}

const dismissWelcome = () => {
	localStorage.setItem('fluxdev_onboarded', '1')
	welcomeOverlay.classList.add('is-hidden')
	welcomeOverlay.setAttribute('aria-hidden', 'true')
}

welcomeStartBtn?.addEventListener('click', dismissWelcome)

historySearchInput?.addEventListener('input', (event) => {
	setUiState({ historyFilterTerm: event.target.value.trim().toLowerCase() })
	renderHistoryView()
})

processSearchInput?.addEventListener('input', (event) => {
	setUiState({ processFilterTerm: event.target.value.trim().toLowerCase() })
	renderProcessesView()
})

processFilterStatus?.addEventListener('change', (event) => {
	setUiState({ processFilterStatusValue: event.target.value })
	renderProcessesView()
})

historyFilterStatus?.addEventListener('change', (event) => {
	setUiState({ historyFilterStatusValue: event.target.value })
	renderHistoryView()
})

historyClearBtn?.addEventListener('click', () => {
	executionHistory.length = 0
	persistHistory()
	renderHistoryView()
})

dashboardAddProjectBtn?.addEventListener('click', () => {
	if (showDashboard) {
		toggleDashboard()
	}
})

dashboardAutoDetectBtn?.addEventListener('click', () => {
	if (showDashboard) {
		toggleDashboard()
	}
	autoDetectButton?.click()
})

dashboardHistoryLink?.addEventListener('click', () => {
	setActiveTab('history')
})

dashboardQuickRunList?.addEventListener('click', async (event) => {
	const item = event.target.closest('.quick-run-item')
	if (!item) return
	const projectId = item.dataset.projectId
	const command = item.dataset.command
	if (!projectId || !command) return
	try {
		const runResult = await window.projectsApi.run(projectId, command, [])
		runningProjectIds.add(projectId)
		upsertProcessSnapshot(runResult)
		appendProcessLog({ projectId, processKey: runResult.processKey }, `Ejecutando: ${command}`, 'sys')
		const project = currentProjects.find((p) => p.id === projectId)
		addToHistory(projectId, project?.name || projectId, command, 'running')
		renderProjects(currentProjects)
		renderProcessesView()
		setFeedback(`Comando lanzado: ${command}`, 'success')
	} catch (error) {
		setFeedback(error?.message || 'No se pudo ejecutar el comando.', 'error')
	}
})

const toggleDashboard = () => {
	setUiState({ showDashboard: !showDashboard })
	form.classList.toggle('is-hidden', showDashboard)
	formHeader.classList.toggle('is-hidden', showDashboard)
	dashboardContent.classList.toggle('is-hidden', !showDashboard)
	dashboardHeader.classList.toggle('is-hidden', !showDashboard)
	if (showDashboard) {
		renderDashboard()
	}
}

toggleDashboardBtn?.addEventListener('click', toggleDashboard)

const refreshChartsBtn = document.getElementById('refresh-charts')
refreshChartsBtn?.addEventListener('click', () => {
	if (statusChartInstance) {
		statusChartInstance.destroy()
		statusChartInstance = null
	}
	if (topProjectsChartInstance) {
		topProjectsChartInstance.destroy()
		topProjectsChartInstance = null
	}
	renderDashboard()
})

runtimeInfo.textContent = `Chrome ${window.versions.chrome()} | Node ${window.versions.node()} | Electron ${window.versions.electron()}`
setFeedback('Guarda iconos por URL (Devicon/Simple Icons) o selecciona un archivo local.', 'info')
resetFormMode()
setActiveTab(activeTab)
syncViewSwitcherButtons()
showWelcomeIfNeeded()
window.projectsApi?.loadHistory?.().then((saved) => {
	if (Array.isArray(saved) && saved.length > 0) {
		executionHistory.length = 0
		executionHistory.push(...saved)
	}
}).catch(() => {})
loadProjects().then(() => {
	updateRunningFromSystem()
	if (showDashboard) {
		renderDashboard()
	}
})

document.addEventListener('click', (event) => {
	if (!event.target.closest('.project-menu')) {
		document.querySelectorAll('.project-menu-dropdown.is-open').forEach((d) => d.classList.remove('is-open'))
	}
})

document.addEventListener('keydown', (event) => {
	if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
		event.preventDefault()
		openGlobalSearchModal()
		return
	}

	if (event.key === 'Escape') {
		if (globalSearchModal && !globalSearchModal.classList.contains('is-hidden')) {
			closeGlobalSearchModal()
			return
		}
		document.querySelectorAll('.project-menu-dropdown.is-open').forEach((d) => d.classList.remove('is-open'))
	}
})

document.addEventListener('click', (event) => {
	const link = event.target.closest('[data-external-url]')
	if (link) {
		event.preventDefault()
		const url = link.dataset.externalUrl
		if (url) {
			window.projectsApi.openExternal(url)
		}
	}
})
