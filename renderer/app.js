const form = document.getElementById('project-form')
const nameInput = document.getElementById('name')
const pathInput = document.getElementById('path')
const iconInput = document.getElementById('icon')
const commandsInput = document.getElementById('commands')
const browsePathButton = document.getElementById('browse-path')
const browseIconButton = document.getElementById('browse-icon')
const iconTemplateButtons = document.querySelectorAll('.icon-template')
const submitProjectButton = document.getElementById('submit-project')
const cancelEditButton = document.getElementById('cancel-edit')
const formTitle = document.getElementById('form-title')
const formSubtitle = document.getElementById('form-subtitle')
const feedback = document.getElementById('feedback')
const projectsList = document.getElementById('projects-list')
const processesView = document.getElementById('processes-view')
const tabButtons = document.querySelectorAll('.tab-button')
const runtimeInfo = document.getElementById('runtime-info')
const runningProjectIds = new Set()
const processSnapshots = new Map()
let currentProjects = []
let editingProjectId = null
let activeTab = 'projects'

const parseCommands = (commandsRaw) => {
	return commandsRaw
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
}

const setFeedback = (message, type = 'info') => {
	feedback.textContent = message
	feedback.dataset.type = type
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

	projectsList.classList.toggle('is-hidden', !showProjects)
	processesView.classList.toggle('is-hidden', showProjects)

	tabButtons.forEach((button) => {
		const isSelected = button.dataset.tab === tabName
		button.classList.toggle('is-active', isSelected)
		button.setAttribute('aria-selected', String(isSelected))
	})
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

	projectsList.innerHTML = projects
		.map((project) => {
			const isRunning = runningProjectIds.has(project.id)
			const iconUrl = normalizeIconInput(project.icon)
			const iconMarkup = iconUrl
				? `<img class="project-icon" src="${escapeHtml(iconUrl)}" alt="Icono de ${escapeHtml(project.name)}" />`
				: `<div class="project-icon project-icon-fallback">${getProjectInitial(project.name)}</div>`
			const iconLabel = iconUrl ? escapeHtml(iconUrl) : 'Sin icono'
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
							<button type="button" class="stop-button" ${isRunning ? '' : 'disabled'}>Detener</button>
						</div>
						<div class="manage-controls">
							<button type="button" class="view-process-button">Ver proceso</button>
							<button type="button" class="edit-button">Editar</button>
							<button type="button" class="delete-button">Eliminar</button>
						</div>
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
	processSnapshots.forEach((snapshot, projectId) => {
		processSnapshots.set(projectId, {
			...snapshot,
			projectName: getProjectNameById(projectId)
		})
	})
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

projectsList.addEventListener('click', async (event) => {
	const card = event.target.closest('.project-card')
	if (!card) {
		return
	}

	const projectId = card.dataset.projectId
	const commandSelect = card.querySelector('.command-select')
	const command = commandSelect?.value || ''

	if (event.target.classList.contains('run-button')) {
		try {
			const runResult = await window.projectsApi.run(projectId, command)
			runningProjectIds.add(projectId)
			upsertProcessSnapshot(runResult)
			appendProcessLog(projectId, `Ejecutando: ${command}`, 'sys')
			renderProjects(currentProjects)
			renderProcessesView()
			setFeedback(`Comando lanzado: ${command}`, 'success')
		} catch (error) {
			setFeedback(error?.message || 'No se pudo ejecutar el comando.', 'error')
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

runtimeInfo.textContent = `Chrome ${window.versions.chrome()} | Node ${window.versions.node()} | Electron ${window.versions.electron()}`
setFeedback('Guarda iconos por URL (Devicon/Simple Icons) o selecciona un archivo local.', 'info')
resetFormMode()
setActiveTab(activeTab)
loadProjects().then(updateRunningFromSystem)
