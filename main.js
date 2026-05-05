const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron/main");
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn, spawnSync } = require("node:child_process");
const ElectronStore = require("electron-store");
const Store = ElectronStore.default || ElectronStore;

let pty = null;
const USE_PTY = false;

const PROJECTS_FILE = "projects.json";
const runningProcesses = new Map();
const activeCommands = new Map();
const runningSequences = new Map();
const terminalSessions = new Map();
const isWindows = process.platform === "win32";

const stripAnsiCodes = (text) => {
  if (!text || typeof text !== "string") {
    return "";
  }
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
    .replace(/\x1b\][^\x07]*\x07/g, "")
    .replace(/\x1b\[[^a-zA-Z]*[a-zA-Z]/g, "")
    .replace(/[\x1b\x9b][?][0-9]*[a-zA-Z]/g, "")
    .replace(/[\x1b\x9b][0-9]*[a-zA-Z]/g, "");
};

app.setName("FluxDev");

if (isWindows && typeof app.setAppUserModelId === "function") {
  app.setAppUserModelId("LenKid.FluxDev");
}

const store = new Store({
  name: "fluxdev",
  defaults: {
    projects: [],
  },
});

const getLegacyProjectsFilePath = () =>
  path.join(app.getPath("userData"), PROJECTS_FILE);

const normalizeCommands = (commands) => {
  if (!Array.isArray(commands)) {
    return [];
  }

  return commands.map((command) => String(command).trim()).filter(Boolean);
};

const parseEnvironmentText = (value) => {
  const environment = {};
  const raw = String(value ?? "");

  raw.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const entryValue = trimmed.slice(separatorIndex + 1).trim();

    if (!key) {
      return;
    }

    environment[key] = entryValue;
  });

  return environment;
};

const normalizeEnvironmentProfile = (profile, index = 0) => {
  const name = String(profile?.name ?? "").trim();
  const id = String(
    profile?.id || `profile-${Date.now().toString(36)}-${index}`,
  ).trim();
  const environmentSource =
    profile?.environment ??
    profile?.env ??
    profile?.variables ??
    profile?.environmentText ??
    "";
  const environment =
    typeof environmentSource === "string"
      ? parseEnvironmentText(environmentSource)
      : Object.fromEntries(
          Object.entries(environmentSource || {})
            .map(([key, value]) => [
              String(key).trim(),
              String(value ?? "").trim(),
            ])
            .filter(([key]) => Boolean(key)),
        );
  const activate = String(profile?.activate || "").trim();

  return {
    id,
    name,
    environment,
    activate: activate || undefined,
  };
};

const normalizeEnvironmentProfiles = (profiles) => {
  if (!Array.isArray(profiles)) {
    return [];
  }

  return profiles
    .map((profile, index) => normalizeEnvironmentProfile(profile, index))
    .filter(
      (profile) => profile.name || Object.keys(profile.environment).length > 0,
    );
};

const resolveProjectEnvironmentProfile = (project, profileId) => {
  const profiles = Array.isArray(project?.environmentProfiles)
    ? project.environmentProfiles
    : [];

  if (!profiles.length) {
    return null;
  }

  const normalizedProfileId = String(
    profileId ?? project?.defaultEnvironmentProfileId ?? profiles[0].id ?? "",
  ).trim();
  return (
    profiles.find((profile) => profile.id === normalizedProfileId) ||
    profiles[0] ||
    null
  );
};

const resolveRuntimeEnvironment = (project, profileId) => {
  const profile = resolveProjectEnvironmentProfile(project, profileId);

  return {
    profile,
    activate: profile?.activate || "",
    env: {
      ...process.env,
      ...(profile?.environment || {}),
    },
  };
};

const readProjects = async () => {
  const projects = store.get("projects", []);
  return Array.isArray(projects) ? projects : [];
};

const hasProjectWithPath = async (projectPath, excludeProjectId = "") => {
  const normalizedPath = toPathKey(projectPath);
  const projects = await readProjects();

  return projects.some((project) => {
    if (excludeProjectId && project.id === excludeProjectId) {
      return false;
    }

    return toPathKey(project.path) === normalizedPath;
  });
};

const assertUniqueProjectPath = async (projectPath, excludeProjectId = "") => {
  const duplicateExists = await hasProjectWithPath(
    projectPath,
    excludeProjectId,
  );

  if (duplicateExists) {
    throw new Error("Ya existe un proyecto agregado con esa ruta.");
  }
};

const saveProjects = async (projects) => {
  store.set("projects", projects);
};

const sanitizeImportedProjects = (payloadProjects) => {
  if (!Array.isArray(payloadProjects)) {
    throw new Error("El archivo no contiene una lista valida de proyectos.");
  }

  const seenIds = new Set();
  const seenPaths = new Set();
  const normalizedProjects = [];

  payloadProjects.forEach((rawProject, index) => {
    const validated = validateProjectInput(rawProject);
    const createdAt = String(rawProject?.createdAt || new Date().toISOString());
    const updatedAt = rawProject?.updatedAt
      ? String(rawProject.updatedAt)
      : undefined;
    let id = String(
      rawProject?.id || `imported-${Date.now().toString(36)}-${index}`,
    );
    const normalizedPath = toPathKey(validated.path);

    if (seenPaths.has(normalizedPath)) {
      return;
    }

    if (seenIds.has(id) || seenPaths.has(normalizedPath)) {
      id = `imported-${Date.now().toString(36)}-${index}`;
    }

    seenIds.add(id);
    seenPaths.add(normalizedPath);

    normalizedProjects.push({
      id,
      ...validated,
      createdAt,
      updatedAt,
    });
  });

  return normalizedProjects;
};

const exportProjectsToFile = async () => {
  const projects = await readProjects();
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);

  const result = await dialog.showSaveDialog({
    title: "Exportar proyectos FluxDev",
    defaultPath: `fluxdev-backup-${stamp}.json`,
    filters: [
      {
        name: "JSON",
        extensions: ["json"],
      },
    ],
  });

  if (result.canceled || !result.filePath) {
    return {
      canceled: true,
    };
  }

  const payload = {
    app: "FluxDev",
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    projects,
  };

  await fs.writeFile(result.filePath, JSON.stringify(payload, null, 2), "utf8");

  return {
    canceled: false,
    filePath: result.filePath,
    count: projects.length,
  };
};

const importProjectsFromFile = async () => {
  const result = await dialog.showOpenDialog({
    title: "Importar proyectos FluxDev",
    properties: ["openFile"],
    filters: [
      {
        name: "JSON",
        extensions: ["json"],
      },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return {
      canceled: true,
    };
  }

  if (runningProcesses.size > 0) {
    throw new Error("Deten los procesos en ejecucion antes de importar datos.");
  }

  const selectedPath = result.filePaths[0];
  const raw = await fs.readFile(selectedPath, "utf8");
  const parsed = JSON.parse(raw);

  const projectsPayload = Array.isArray(parsed) ? parsed : parsed?.projects;
  const importedProjects = sanitizeImportedProjects(projectsPayload);

  await saveProjects(importedProjects);

  return {
    canceled: false,
    filePath: selectedPath,
    count: importedProjects.length,
  };
};

const broadcastRunUpdate = (payload) => {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send("projects:run-update", payload);
  });
};

const broadcastTerminalUpdate = (payload) => {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send("terminal:update", payload);
  });
};

const killTreeWindows = (pid) => {
  return new Promise((resolve) => {
    const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
      windowsHide: true,
    });

    killer.on("close", () => resolve());
    killer.on("error", () => resolve());
  });
};

const terminateChildProcess = async (child) => {
  if (!child || !child.pid) {
    return;
  }

  if (isWindows) {
    await killTreeWindows(child.pid);
    return;
  }

  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGTERM");

    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill("SIGKILL");
        }
        resolve();
      }, 1200);

      child.once("close", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
};

const terminateChildProcessSync = (child) => {
  if (!child || !child.pid) {
    return;
  }

  if (isWindows) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      windowsHide: true,
    });
    return;
  }

  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGTERM");
    child.kill("SIGKILL");
  }
};

const getInteractiveShell = () => {
  if (isWindows) {
    return {
      command: "powershell.exe",
      args: [
        "-NoLogo",
        "-NoExit",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "[Console]::InputEncoding=[System.Text.UTF8Encoding]::new($false); [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); chcp 65001 > $null; if (Test-Path -LiteralPath $PROFILE) { . $PROFILE }",
      ],
    };
  }

  return {
    command: process.env.SHELL || "/bin/bash",
    args: ["-i"],
  };
};

const getProjectById = async (projectId) => {
  const projects = await readProjects();
  return projects.find((item) => item.id === projectId) || null;
};

const writeTerminalOutput = (sessionId, data, isError = false) => {
  broadcastTerminalUpdate({
    sessionId,
    type: isError ? "stderr" : "stdout",
    data: String(data),
  });
};

const toPowerShellEncodedCommand = (script) => {
  return Buffer.from(String(script || ""), "utf16le").toString("base64");
};

const normalizeTerminalInput = (data) => {
  const value = String(data || "");

  if (!value) {
    return value;
  }

  if (!isWindows || USE_PTY) {
    return value;
  }

  // In Windows without PTY, PowerShell can mis-handle DEL (\x7f).
  // Map it to Backspace (\b) to keep cursor movement consistent.
  return value.replace(/\x7f/g, "\b");
};

const createTerminalSession = async (payload = {}) => {
  if (USE_PTY && pty) {
    // Código pty original
  } else {
    // Sin pty - usar child_process spawn con pseudo-terminal
  }

  const sessionId = String(payload.sessionId || Date.now().toString(36));
  const requestedProjectId = String(payload.projectId || "").trim();
  const requestedProfileId = String(payload.profileId || "").trim();
  const customCwd = String(payload.cwd || "").trim();
  const initialCommand = String(payload.initialCommand || "").trim();

  if (terminalSessions.has(sessionId)) {
    return {
      sessionId,
      reused: true,
    };
  }

  let cwd = app.getPath("home");
  let runtimeEnv = process.env;
  const shell = getInteractiveShell();

  if (requestedProjectId) {
    const project = await getProjectById(requestedProjectId);
    if (!project) {
      throw new Error("Proyecto no encontrado para la terminal.");
    }

    cwd = project.path;
    runtimeEnv = resolveRuntimeEnvironment(project, requestedProfileId).env;
  } else if (customCwd) {
    cwd = customCwd;
  }

  if (isWindows) {
    runtimeEnv = {
      ...runtimeEnv,
      TERM: runtimeEnv.TERM || "xterm-256color",
      LANG: runtimeEnv.LANG || "en_US.UTF-8",
      LC_ALL: runtimeEnv.LC_ALL || "en_US.UTF-8",
    };
  }

  let child;
  try {
    if (initialCommand) {
      child = spawn(initialCommand, [], {
        cwd,
        env: runtimeEnv,
        shell: true,
        windowsHide: false,
      });
    } else {
      child = spawn(shell.command, shell.args, {
        cwd,
        env: runtimeEnv,
        shell: false,
        windowsHide: false,
      });
    }
  } catch (error) {
    throw new Error(error.message || "No se pudo iniciar la terminal.");
  }

  terminalSessions.set(sessionId, child);

  child.stdout?.on("data", (chunk) =>
    writeTerminalOutput(sessionId, chunk, false),
  );
  child.stderr?.on("data", (chunk) =>
    writeTerminalOutput(sessionId, chunk, true),
  );

  child.on("close", (code) => {
    terminalSessions.delete(sessionId);
    broadcastTerminalUpdate({
      sessionId,
      type: "exit",
      data: `Terminal cerrada (code: ${code ?? "null"})`,
    });
  });

  child.on("error", (error) => {
    writeTerminalOutput(sessionId, `Error: ${error.message}`, true);
  });

  broadcastTerminalUpdate({
    sessionId,
    type: "ready",
    data: `Terminal lista en ${cwd}`,
    cwd,
  });

  return {
    sessionId,
    cwd,
  };
};

const openExternalTerminalSession = async (payload = {}) => {
  const requestedProjectId = String(payload.projectId || "").trim();
  const requestedProfileId = String(payload.profileId || "").trim();
  const requestedCwd = String(payload.cwd || "").trim();
  const initialCommand = String(payload.initialCommand || "").trim();

  if (!requestedProjectId) {
    throw new Error(
      "Debes seleccionar un proyecto para abrir terminal externa.",
    );
  }

  const project = await getProjectById(requestedProjectId);
  if (!project) {
    throw new Error("Proyecto no encontrado para la terminal externa.");
  }

  const cwd = requestedCwd || project.path;

  try {
    const stats = await fs.stat(cwd);
    if (!stats.isDirectory()) {
      throw new Error("La ruta de terminal externa no es valida.");
    }
  } catch {
    throw new Error("No se encontro la ruta para abrir la terminal externa.");
  }

  const runtimeEnv = {
    ...resolveRuntimeEnvironment(project, requestedProfileId).env,
    FLUXDEV_INITIAL_COMMAND: initialCommand || "",
  };
  const psCwd = cwd.replace(/'/g, "''");
  const psInit = [
    "[Console]::InputEncoding=[System.Text.UTF8Encoding]::new($false)",
    "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)",
    "chcp 65001 > $null",
    `Set-Location -LiteralPath '${psCwd}'`,
    "if (Test-Path -LiteralPath $PROFILE) { . $PROFILE }",
    "if ($env:FLUXDEV_INITIAL_COMMAND) { Invoke-Expression $env:FLUXDEV_INITIAL_COMMAND }",
  ].join("; ");
  const encodedPsInit = toPowerShellEncodedCommand(psInit);

  if (isWindows) {
    const hasWindowsTerminal =
      spawnSync("where", ["wt"], {
        windowsHide: true,
        stdio: "ignore",
      }).status === 0;

    if (hasWindowsTerminal) {
      const wt = spawn(
        "wt",
        [
          "-d",
          cwd,
          "powershell.exe",
          "-NoLogo",
          "-NoExit",
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-EncodedCommand",
          encodedPsInit,
        ],
        {
          cwd,
          env: runtimeEnv,
          detached: true,
          stdio: "ignore",
          windowsHide: false,
        },
      );
      wt.unref();
    } else {
      const fallback = spawn(
        "powershell.exe",
        [
          "-NoLogo",
          "-NoExit",
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-EncodedCommand",
          encodedPsInit,
        ],
        {
          cwd,
          env: runtimeEnv,
          detached: true,
          stdio: "ignore",
          windowsHide: false,
        },
      );
      fallback.unref();
    }
  } else {
    const shell = getInteractiveShell();
    const child = spawn(shell.command, shell.args, {
      cwd,
      env: runtimeEnv,
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });
    child.unref();
  }

  return {
    opened: true,
    projectId: requestedProjectId,
    cwd,
  };
};

const writeToTerminalSession = async (payload = {}) => {
  const sessionId = String(payload.sessionId || "").trim();
  const data = normalizeTerminalInput(payload.data);

  if (!sessionId) {
    throw new Error("Debes indicar la terminal destino.");
  }

  const child = terminalSessions.get(sessionId);
  if (!child) {
    throw new Error("La terminal ya no existe.");
  }

  if (child.stdin) {
    child.stdin.write(data);
  } else if (child.write) {
    child.write(data);
  }
};

const resizeTerminalSession = async (payload = {}) => {
  const sessionId = String(payload.sessionId || "").trim();
  if (!sessionId) {
    return;
  }
};

const clearTerminalSession = async (payload = {}) => {
  const sessionId = String(payload.sessionId || "").trim();
  if (!sessionId) {
    return;
  }

  broadcastTerminalUpdate({
    sessionId,
    type: "clear",
  });
};

const closeTerminalSession = async (payload = {}) => {
  const sessionId = String(payload.sessionId || "").trim();

  if (!sessionId) {
    return {
      closed: false,
    };
  }

  const ptyProcess = terminalSessions.get(sessionId);
  if (!ptyProcess) {
    return {
      closed: false,
    };
  }

  try {
    ptyProcess.kill();
  } catch {
    // no-op
  }
  terminalSessions.delete(sessionId);

  broadcastTerminalUpdate({
    sessionId,
    type: "closed",
    data: "Terminal cerrada manualmente.",
  });

  return {
    closed: true,
  };
};

const runProjectCommand = async (
  projectId,
  command,
  profileId = "",
  processKey = "",
) => {
  const projects = await readProjects();
  const project = projects.find((item) => item.id === projectId);

  if (!project) {
    throw new Error("Proyecto no encontrado.");
  }

  if (!project.commands.includes(command)) {
    throw new Error("El comando no pertenece al proyecto.");
  }

  for (const [existingKey, child] of runningProcesses.entries()) {
    if (existingKey.startsWith(projectId + ":")) {
      const existingProcess = activeCommands.get(existingKey);
      if (existingProcess && existingProcess.command === command) {
        throw new Error(`El comando "${command}" ya esta en ejecucion.`);
      }
    }
  }

  const key = processKey || `${projectId}:${Date.now().toString(36)}`;

  const stats = await fs.stat(project.path);
  if (!stats.isDirectory()) {
    throw new Error("La ruta configurada no es una carpeta valida.");
  }

  const startPromise = spawnProjectCommandProcess(project, command, {
    profileId,
    processKey: key,
  });
  void startPromise.catch(() => {
    // El estado final se comunica por eventos broadcastRunUpdate.
  });

  const runningChild = runningProcesses.get(key);

  return {
    projectId,
    processKey: key,
    pid: runningChild?.pid,
    command,
    status: "running",
  };
};

const stopProjectCommand = async (payload = {}) => {
  const projectId = String(payload?.projectId ?? "").trim();
  const processKey = String(payload?.processKey ?? "").trim();
  const command = String(payload?.command ?? "").trim();

  if (processKey) {
    const child = runningProcesses.get(processKey);
    if (child) {
      const cmdInfo = activeCommands.get(processKey);
      await terminateChildProcess(child);
      runningProcesses.delete(processKey);
      activeCommands.delete(processKey);
      broadcastRunUpdate({
        projectId,
        processKey,
        command: cmdInfo?.command || "",
        status: "stopping",
        message: "Proceso detenido.",
      });
      return {
        projectId,
        processKey,
        stopped: true,
        status: "stopping",
      };
    }
    return { projectId, processKey, stopped: false, status: "idle" };
  }

  if (projectId) {
    let stoppedCount = 0;
    for (const [key, child] of runningProcesses.entries()) {
      if (key.startsWith(projectId + ":")) {
        await terminateChildProcess(child);
        runningProcesses.delete(key);
        activeCommands.delete(key);
        stoppedCount++;
      }
    }

    const sequenceController = runningSequences.get(projectId);
    if (sequenceController) {
      sequenceController.canceled = true;
      runningSequences.delete(projectId);
      stoppedCount++;
    }

    if (stoppedCount > 0) {
      broadcastRunUpdate({
        projectId,
        status: "stopping",
        message: `${stoppedCount} proceso(s) detenido(s).`,
      });
    }

    return {
      projectId,
      stopped: stoppedCount > 0,
      stoppedCount,
      status: stoppedCount > 0 ? "stopping" : "idle",
    };
  }

  return { projectId, stopped: false, status: "idle" };
};

const validateProjectInput = (project) => {
  const name = String(project?.name ?? "").trim();
  const projectPath = String(project?.path ?? "").trim();
  const icon = String(project?.icon ?? "").trim();
  const commands = normalizeCommands(project?.commands);
  const favorite = Boolean(project?.favorite);
  const environmentProfiles = normalizeEnvironmentProfiles(
    project?.environmentProfiles,
  );
  const requestedDefaultProfileId = String(
    project?.defaultEnvironmentProfileId ?? "",
  ).trim();
  const defaultEnvironmentProfileId = environmentProfiles.some(
    (profile) => profile.id === requestedDefaultProfileId,
  )
    ? requestedDefaultProfileId
    : environmentProfiles[0]?.id || "";

  if (!name) {
    throw new Error("El nombre del proyecto es obligatorio.");
  }

  if (!projectPath) {
    throw new Error("La ruta del proyecto es obligatoria.");
  }

  if (commands.length === 0) {
    throw new Error("Debes ingresar al menos un comando.");
  }

  return {
    name,
    path: projectPath,
    commands,
    icon,
    favorite,
    environmentProfiles,
    defaultEnvironmentProfileId,
  };
};

const runCommandInProject = async (cwd, command, args = []) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => reject(error));

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || stdout || `Command failed: ${command}`));
    });
  });
};

const spawnProjectCommandProcess = async (project, command, options = {}) => {
  const {
    emitCloseStatus = true,
    startMessage = `Ejecutando: ${command}`,
    controller = null,
    profileId = "",
    processKey = "",
  } = options;
  const key = processKey || `${project.id}:${Date.now().toString(36)}`;
  const runtime = resolveRuntimeEnvironment(project, profileId);

  const finalCommand = runtime.activate
    ? `${runtime.activate}; ${command}`
    : command;

  return new Promise((resolve, reject) => {
    const child = spawn(finalCommand, {
      cwd: project.path,
      shell: true,
      windowsHide: true,
      env: runtime.env,
    });

    runningProcesses.set(key, child);
    activeCommands.set(key, { command, projectId: project.id });

    if (controller) {
      controller.child = child;
    }

    broadcastRunUpdate({
      projectId: project.id,
      processKey: key,
      command,
      status: "running",
      pid: child.pid,
      message: startMessage,
    });

    child.stdout?.on("data", (chunk) => {
      broadcastRunUpdate({
        projectId: project.id,
        processKey: key,
        command,
        status: "log",
        message: stripAnsiCodes(String(chunk)),
      });
    });

    child.stderr?.on("data", (chunk) => {
      broadcastRunUpdate({
        projectId: project.id,
        processKey: key,
        command,
        status: "error-log",
        message: stripAnsiCodes(String(chunk)),
      });
    });

    child.on("error", (error) => {
      runningProcesses.delete(key);
      activeCommands.delete(key);

      if (controller && controller.child === child) {
        controller.child = null;
      }

      broadcastRunUpdate({
        projectId: project.id,
        processKey: key,
        command,
        status: "failed",
        message: error.message || "No se pudo iniciar el comando.",
      });

      reject(error);
    });

    child.on("close", (code, signal) => {
      runningProcesses.delete(key);
      activeCommands.delete(key);

      if (controller && controller.child === child) {
        controller.child = null;
      }

      if (emitCloseStatus) {
        broadcastRunUpdate({
          projectId: project.id,
          processKey: key,
          command,
          status: "stopped",
          code,
          signal,
          message: `Proceso finalizado (code: ${code ?? "null"}).`,
        });
      }

      if (code === 0) {
        resolve({
          projectId: project.id,
          processKey: key,
          pid: child.pid,
          command,
          status: "running",
          code,
          signal,
        });
        return;
      }

      reject(new Error(`Command failed: ${command}`));
    });
  });
};

const runProjectCommandSequence = async (projectId, profileId = "") => {
  const project = await getProjectById(projectId);

  if (!project) {
    throw new Error("Proyecto no encontrado.");
  }

  if (runningProcesses.has(projectId) || runningSequences.has(projectId)) {
    throw new Error("Este proyecto ya esta en ejecucion.");
  }

  const commands = Array.isArray(project.commands) ? project.commands : [];
  const selectedProfileId = String(
    profileId || project?.defaultEnvironmentProfileId || "",
  ).trim();

  if (commands.length === 0) {
    throw new Error("El proyecto no tiene comandos para ejecutar.");
  }

  const controller = {
    canceled: false,
    child: null,
  };

  runningSequences.set(projectId, controller);

  void (async () => {
    try {
      for (let index = 0; index < commands.length; index += 1) {
        if (controller.canceled) {
          break;
        }

        const command = commands[index];
        await spawnProjectCommandProcess(project, command, {
          emitCloseStatus: false,
          controller,
          startMessage: `Paso ${index + 1}/${commands.length}: ${command}`,
          profileId: selectedProfileId,
        });
      }

      if (!controller.canceled) {
        broadcastRunUpdate({
          projectId,
          command: commands[commands.length - 1],
          status: "stopped",
          message: `Multi-run finalizado (${commands.length} pasos).`,
        });
      }
    } catch (error) {
      if (!controller.canceled) {
        broadcastRunUpdate({
          projectId,
          command: commands[commands.length - 1],
          status: "failed",
          message: error.message || "No se pudo completar el multi-run.",
        });
      }
    } finally {
      runningSequences.delete(projectId);
    }
  })();

  return {
    projectId,
    commandCount: commands.length,
    status: "running",
  };
};

const getGitStatusForProject = async (projectId) => {
  const project = await getProjectById(projectId);

  if (!project) {
    throw new Error("Proyecto no encontrado para consultar Git.");
  }

  try {
    await runCommandInProject(project.path, "git", [
      "rev-parse",
      "--is-inside-work-tree",
    ]);
  } catch {
    return {
      projectId,
      hasGit: false,
      branch: "",
      dirtyCount: 0,
    };
  }

  const branchResult = await runCommandInProject(project.path, "git", [
    "branch",
    "--show-current",
  ]);
  const statusResult = await runCommandInProject(project.path, "git", [
    "status",
    "--porcelain",
  ]);

  const branch = String(branchResult.stdout || "").trim();
  const dirtyCount = String(statusResult.stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;

  return {
    projectId,
    hasGit: true,
    branch,
    dirtyCount,
  };
};

const guessCommandsFromPackageJson = (packageJson) => {
  const scripts = packageJson?.scripts || {};
  const dependencyCount =
    Object.keys(packageJson?.dependencies || {}).length +
    Object.keys(packageJson?.devDependencies || {}).length;
  const scriptNames = Object.keys(scripts).filter(
    (scriptName) => typeof scripts[scriptName] === "string",
  );

  const preferredEntryScriptNames = [
    "dev",
    "start",
    "serve",
    "preview",
    "server",
    "watch",
  ];
  const selectedScriptNames = [];

  const pushSelectedScript = (scriptName) => {
    if (scriptName && !selectedScriptNames.includes(scriptName)) {
      selectedScriptNames.push(scriptName);
    }
  };

  preferredEntryScriptNames.forEach((scriptName) => {
    if (scriptNames.includes(scriptName)) {
      pushSelectedScript(scriptName);
    }
  });

  if (selectedScriptNames.length === 0) {
    const fallbackScriptNames = scriptNames.filter((scriptName) => {
      return (
        !scriptName.startsWith("pre") &&
        !scriptName.startsWith("post") &&
        scriptName !== "test" &&
        scriptName !== "lint" &&
        scriptName !== "format" &&
        scriptName !== "check"
      );
    });

    fallbackScriptNames.forEach((scriptName) => {
      if (selectedScriptNames.length < 3) {
        pushSelectedScript(scriptName);
      }
    });
  }

  const commands = [];

  if (dependencyCount > 0 || Object.keys(scripts).length > 0) {
    commands.push("npm install");
  }

  const uniqueCommands = new Set([
    ...selectedScriptNames,
    ...scriptNames.filter((s) => !s.startsWith("pre") && !s.startsWith("post")),
  ]);

  uniqueCommands.forEach((scriptName) => {
    if (scriptName) {
      const cmd =
        scriptName === "start" ? "npm start" : `npm run ${scriptName}`;
      if (!commands.includes(cmd)) {
        commands.push(cmd);
      }
    }
  });

  return commands.slice(0, 10);
};

const detectFrameworkIcon = (packageJson) => {
  const dependencies = {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {}),
  };

  const has = (pkgName) => typeof dependencies[pkgName] === "string";

  if (has("next")) return "devicon:nextjs";
  if (has("nuxt") || has("nuxt3")) return "devicon:nuxtjs";
  if (has("@angular/core")) return "devicon:angular";
  if (has("vue")) return "devicon:vuejs";
  if (has("svelte") || has("@sveltejs/kit")) return "devicon:svelte";
  if (has("react")) return "devicon:react";
  if (has("nestjs") || has("@nestjs/core")) return "devicon:nestjs";
  if (has("express")) return "devicon:express";
  if (has("fastify")) return "devicon:fastify";
  if (has("astro")) return "devicon:astro";
  if (has("vite")) return "devicon:vitejs";
  if (has("typescript")) return "devicon:typescript";
  if (has("javascript")) return "devicon:javascript";

  return "";
};

const detectEnvironmentProfilesFromProject = async (projectPath) => {
  const profiles = [];
  const envFiles = [
    ".env",
    ".env.local",
    ".env.example",
    ".env.development",
    ".env.production",
  ];

  for (const envFile of envFiles) {
    const envPath = path.join(projectPath, envFile);
    try {
      const stats = await fs.stat(envPath);
      if (stats.isFile()) {
        const content = await fs.readFile(envPath, "utf8");
        const variables = parseEnvironmentText(content);

        if (Object.keys(variables).length > 0) {
          const profileName =
            envFile.replace(".env.", "").replace(".", "") || "default";
          profiles.push({
            id: `auto-${envFile.replace(/[^a-zA-Z0-9]/g, "-")}`,
            name:
              profileName === "default"
                ? "Desarrollo"
                : profileName.charAt(0).toUpperCase() + profileName.slice(1),
            environment: variables,
          });
        }
      }
    } catch {
      // ignore missing files
    }
  }

  const venvFolders = ["venv", "virtualenv", ".venv", "env", "ENV", "pyenv"];
  const detectedVenvs = [];

  for (const venvName of venvFolders) {
    const venvPath = path.join(projectPath, venvName);

    try {
      const stats = await fs.stat(venvPath);
      if (stats.isDirectory()) {
        console.log("[DEBUG] Found venv folder:", venvPath);
        const activatePath =
          process.platform === "win32"
            ? path.join(venvPath, "Scripts", "activate.bat")
            : path.join(venvPath, "bin", "activate");

        let activateCommand = "";
        if (process.platform === "win32") {
          try {
            await fs.stat(activatePath);
            activateCommand = `& "${activatePath}"`;
          } catch {
            const ps1Path = path.join(venvPath, "Scripts", "Activate.ps1");
            try {
              await fs.stat(ps1Path);
              activateCommand = `. "${ps1Path}"`;
            } catch {
              continue;
            }
          }
        } else {
          try {
            await fs.stat(activatePath);
            activateCommand = `source "${activatePath}"`;
          } catch {
            continue;
          }
        }

        if (activateCommand) {
          const safeIdPart = venvName
            .replace(/[^a-zA-Z0-9]/g, "-")
            .toLowerCase();
          profiles.push({
            id: `venv-${safeIdPart}`,
            name: `venv (${venvName})`,
            environment: {},
            activate: activateCommand,
          });
        }
      }
    } catch {
      // ignore missing folders
    }
  }

  return profiles;
};

const toPathKey = (inputPath) => {
  return path.resolve(String(inputPath || "")).toLowerCase();
};

const collectDetectedProjects = async (rootPath) => {
  const ignoredFolders = new Set([
    "node_modules",
    ".git",
    "out",
    "dist",
    "build",
    ".next",
    ".nuxt",
    "coverage",
  ]);
  const bucket = [];
  const seenPaths = new Set();
  let entries = [];

  try {
    entries = await fs.readdir(rootPath, { withFileTypes: true });
  } catch {
    return bucket;
  }

  const folders = entries.filter(
    (entry) => entry.isDirectory() && !ignoredFolders.has(entry.name),
  );

  const tryAddProjectFromFolder = async (folderPath, fallbackName) => {
    const packagePath = path.join(folderPath, "package.json");

    try {
      const raw = await fs.readFile(packagePath, "utf8");
      const parsed = JSON.parse(raw);
      const key = toPathKey(folderPath);

      if (seenPaths.has(key)) {
        return;
      }

      const envProfiles =
        await detectEnvironmentProfilesFromProject(folderPath);

      seenPaths.add(key);
      bucket.push({
        path: folderPath,
        name: String(fallbackName).trim(),
        commands: guessCommandsFromPackageJson(parsed),
        icon: detectFrameworkIcon(parsed),
        environmentProfiles: envProfiles,
        defaultEnvironmentProfileId: envProfiles[0]?.id || "",
      });
    } catch {
      // ignore folders without valid package.json
    }
  };

  for (const folder of folders) {
    const folderPath = path.join(rootPath, folder.name);
    await tryAddProjectFromFolder(folderPath, folder.name);

    let childEntries = [];

    try {
      childEntries = await fs.readdir(folderPath, { withFileTypes: true });
    } catch {
      childEntries = [];
    }

    const childFolders = childEntries.filter(
      (entry) => entry.isDirectory() && !ignoredFolders.has(entry.name),
    );

    for (const child of childFolders) {
      const childPath = path.join(folderPath, child.name);
      await tryAddProjectFromFolder(childPath, child.name);
    }
  }

  return bucket;
};

const autoDetectScanProjects = async () => {
  const result = await dialog.showOpenDialog({
    title: "Selecciona carpeta base para auto-deteccion",
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return {
      canceled: true,
      foundCount: 0,
    };
  }

  const basePath = result.filePaths[0];
  const detected = await collectDetectedProjects(basePath);

  if (detected.length === 0) {
    return {
      canceled: false,
      basePath,
      foundCount: 0,
      detected: [],
    };
  }

  return {
    canceled: false,
    basePath,
    foundCount: detected.length,
    detected,
  };
};

const autoDetectApplyProjects = async (selectedDetected) => {
  const normalizedSelection = Array.isArray(selectedDetected)
    ? selectedDetected
        .map((project) => {
          try {
            const validated = validateProjectInput(project);
            return {
              ...validated,
              icon: validated.icon || "",
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    : [];

  const projects = await readProjects();
  const knownPaths = new Set(
    projects.map((project) => toPathKey(project.path)),
  );
  const now = Date.now();
  const selectedPaths = new Set();

  const additions = normalizedSelection
    .filter((project) => {
      const normalizedPath = toPathKey(project.path);

      if (knownPaths.has(normalizedPath) || selectedPaths.has(normalizedPath)) {
        return false;
      }

      selectedPaths.add(normalizedPath);
      return true;
    })
    .map((project, index) => {
      const validated = validateProjectInput(project);
      return {
        id: `${(now + index).toString(36)}-auto`,
        name: validated.name,
        path: validated.path,
        commands: validated.commands,
        icon: validated.icon || "",
        favorite: false,
        environmentProfiles:
          project.environmentProfiles || validated.environmentProfiles || [],
        defaultEnvironmentProfileId:
          project.defaultEnvironmentProfileId ||
          validated.defaultEnvironmentProfileId ||
          "",
        createdAt: new Date().toISOString(),
        detectedAt: new Date().toISOString(),
      };
    });

  if (additions.length > 0) {
    await saveProjects([...projects, ...additions]);
  }

  return {
    canceled: false,
    selectedCount: normalizedSelection.length,
    addedCount: additions.length,
  };
};

const registerIpcHandlers = () => {
  ipcMain.handle("projects:list", async () => readProjects());

  ipcMain.handle("projects:add", async (_event, payload) => {
    const projectData = validateProjectInput(payload);
    await assertUniqueProjectPath(projectData.path);
    const project = {
      id: Date.now().toString(36),
      ...projectData,
      createdAt: new Date().toISOString(),
    };
    const projects = await readProjects();
    projects.push(project);
    await saveProjects(projects);
    return project;
  });

  ipcMain.handle("projects:update", async (_event, payload) => {
    const projectId = String(payload?.projectId ?? "").trim();
    const project = payload?.project;
    const redetect = Boolean(payload?.redetect);

    if (!projectId) {
      throw new Error("Debes indicar el proyecto a editar.");
    }

    const projects = await readProjects();
    const index = projects.findIndex((item) => item.id === projectId);

    if (index < 0) {
      throw new Error("Proyecto no encontrado para editar.");
    }

    let current = { ...projects[index] };

    if (project) {
      if (project.name) current.name = project.name;
      if (project.path) current.path = project.path;
      if (project.commands) current.commands = project.commands;
      if (project.icon) current.icon = project.icon;
      if (project.favorite !== undefined) current.favorite = project.favorite;
      if (project.environmentProfiles)
        current.environmentProfiles = project.environmentProfiles;
      if (project.defaultEnvironmentProfileId)
        current.defaultEnvironmentProfileId =
          project.defaultEnvironmentProfileId;
    }

    if (redetect) {
      const packageJsonPath = path.join(current.path, "package.json");
      let parsed = null;
      try {
        const raw = await fs.readFile(packageJsonPath, "utf8");
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }

      const newCommands = parsed
        ? guessCommandsFromPackageJson(parsed)
        : current.commands;
      const existingProfiles = current.environmentProfiles || [];
      const newDetectedProfiles = await detectEnvironmentProfilesFromProject(
        current.path,
      );
      console.log(
        "[DEBUG] Redetect profiles:",
        newDetectedProfiles.map((p) => ({
          id: p.id,
          name: p.name,
          activate: p.activate,
        })),
      );
      const existingIds = new Set(existingProfiles.map((p) => p.id));
      const mergedProfiles = [
        ...existingProfiles,
        ...newDetectedProfiles.filter((p) => !existingIds.has(p.id)),
      ];
      const newIcon = parsed ? detectFrameworkIcon(parsed) : current.icon;

      current.commands = newCommands;
      current.environmentProfiles = mergedProfiles;
      current.icon = newIcon;
      current.defaultEnvironmentProfileId =
        mergedProfiles[0]?.id || current.defaultEnvironmentProfileId;
      current.updatedAt = new Date().toISOString();
    }

    const projectData = validateProjectInput(current);
    await assertUniqueProjectPath(projectData.path, current.id);
    const updatedProject = {
      ...current,
      ...projectData,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };

    projects[index] = updatedProject;
    await saveProjects(projects);
    return updatedProject;
  });

  ipcMain.handle("projects:delete", async (_event, payload) => {
    const projectId = String(payload?.projectId ?? "").trim();

    if (!projectId) {
      throw new Error("Debes indicar el proyecto a eliminar.");
    }

    const projects = await readProjects();
    const exists = projects.some((item) => item.id === projectId);

    if (!exists) {
      throw new Error("Proyecto no encontrado para eliminar.");
    }

    const sequenceController = runningSequences.get(projectId);
    const runningChild =
      runningProcesses.get(projectId) || sequenceController?.child;
    if (runningChild) {
      if (sequenceController) {
        sequenceController.canceled = true;
      }

      await terminateChildProcess(runningChild);
      runningProcesses.delete(projectId);
    }

    const filteredProjects = projects.filter((item) => item.id !== projectId);
    await saveProjects(filteredProjects);

    broadcastRunUpdate({
      projectId,
      status: "deleted",
      message: "Proyecto eliminado.",
    });

    return {
      projectId,
      deleted: true,
    };
  });

  ipcMain.handle("projects:toggle-favorite", async (_event, payload) => {
    const projectId = String(payload?.projectId ?? "").trim();

    if (!projectId) {
      throw new Error("Debes indicar el proyecto a marcar como favorito.");
    }

    const projects = await readProjects();
    const index = projects.findIndex((item) => item.id === projectId);

    if (index < 0) {
      throw new Error("Proyecto no encontrado para favorito.");
    }

    const current = projects[index];
    const updated = {
      ...current,
      favorite: !Boolean(current.favorite),
      updatedAt: new Date().toISOString(),
    };

    projects[index] = updated;
    await saveProjects(projects);

    return {
      projectId,
      favorite: updated.favorite,
    };
  });

  ipcMain.handle("projects:auto-detect-scan", async () =>
    autoDetectScanProjects(),
  );

  ipcMain.handle("projects:auto-detect-apply", async (_event, payload) => {
    return autoDetectApplyProjects(payload?.projects);
  });

  ipcMain.handle("projects:clear-all", async () => {
    const projects = await readProjects();

    await Promise.all(
      projects.map((project) => stopProjectCommand(project.id)),
    );

    for (const project of projects) {
      broadcastRunUpdate({
        projectId: project.id,
        status: "deleted",
        message: "Proyecto eliminado.",
      });
    }

    await saveProjects([]);

    return {
      cleared: true,
      deletedCount: projects.length,
    };
  });

  ipcMain.handle("projects:git-status", async (_event, payload) => {
    const projectId = String(payload?.projectId ?? "").trim();

    if (!projectId) {
      throw new Error("Debes indicar el proyecto para consultar Git.");
    }

    return getGitStatusForProject(projectId);
  });

  ipcMain.handle("projects:run", async (_event, payload) => {
    const projectId = String(payload?.projectId ?? "").trim();
    const command = String(payload?.command ?? "").trim();
    const profileId = String(payload?.profileId ?? "").trim();

    if (!projectId || !command) {
      throw new Error("Proyecto y comando son obligatorios.");
    }

    const processKey = `${projectId}:${Date.now().toString(36)}`;
    return runProjectCommand(projectId, command, profileId, processKey);
  });

  ipcMain.handle("projects:run-all", async (_event, payload) => {
    const projectId = String(payload?.projectId ?? "").trim();
    const profileId = String(payload?.profileId ?? "").trim();

    if (!projectId) {
      throw new Error("Debes indicar el proyecto a ejecutar.");
    }

    return runProjectCommandSequence(projectId, profileId);
  });

  ipcMain.handle("projects:stop", async (_event, payload) => {
    const projectId = String(payload?.projectId ?? "").trim();
    const processKey = String(payload?.processKey ?? "").trim();
    const command = String(payload?.command ?? "").trim();

    if (!projectId && !processKey) {
      throw new Error("Debes indicar el proyecto o proceso a detener.");
    }

    return stopProjectCommand({ projectId, processKey, command });
  });

  ipcMain.handle("projects:running", async () => {
    const running = [];
    for (const [key, child] of runningProcesses.entries()) {
      const [projectId, timestamp] = key.split(":");
      running.push({ processKey: key, projectId, pid: child.pid, timestamp });
    }
    return running;
  });
  ipcMain.handle("projects:export", async () => exportProjectsToFile());
  ipcMain.handle("projects:import", async () => importProjectsFromFile());

  ipcMain.handle("terminal:create", async (_event, payload) =>
    createTerminalSession(payload),
  );
  ipcMain.handle("terminal:open-external", async (_event, payload) =>
    openExternalTerminalSession(payload),
  );
  ipcMain.handle("terminal:write", async (_event, payload) =>
    writeToTerminalSession(payload),
  );
  ipcMain.handle("terminal:resize", async (_event, payload) =>
    resizeTerminalSession(payload),
  );
  ipcMain.handle("terminal:clear", async (_event, payload) =>
    clearTerminalSession(payload),
  );
  ipcMain.handle("terminal:close", async (_event, payload) =>
    closeTerminalSession(payload),
  );

  ipcMain.handle("dialog:pick-directory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return "";
    }

    return result.filePaths[0];
  });

  ipcMain.handle("dialog:pick-icon", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Images", extensions: ["png", "jpg", "jpeg", "svg", "ico"] },
      ],
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("projects:open-folder", async (_event, payload) => {
    const projectId = String(payload?.projectId ?? "").trim();

    if (!projectId) {
      throw new Error("Debes indicar el proyecto.");
    }

    const projects = await readProjects();
    const project = projects.find((item) => item.id === projectId);

    if (!project) {
      throw new Error("Proyecto no encontrado.");
    }

    await shell.openPath(project.path);
    return { opened: true };
  });
};

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 620,
    title: "FluxDev",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "public", "FluxLogo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: true,
    },
  });

  win.removeMenu();
  win.maximize();
  win.webContents.setWindowOpenHandler(() => ({ action: "allow" }));
  win.webContents.on("before-input-event", (_event, input) => {
    if (input.type === "keyDown") {
      if (
        (input.control && input.shift && input.key === "I") ||
        input.key === "F12"
      ) {
        win.webContents.toggleDevTools();
      }
    }
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
};

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  runningProcesses.forEach((child) => {
    terminateChildProcessSync(child);
  });
  runningProcesses.clear();

  terminalSessions.forEach((child) => {
    terminateChildProcessSync(child);
  });
  terminalSessions.clear();
});
