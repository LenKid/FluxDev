const { spawn, spawnSync } = require("node:child_process");
const { stripAnsiCodes } = require("./project-helpers");

const createProcessManager = (deps) => {
  const {
    showNotification,
    broadcastRunUpdate,
    runningProcesses,
    activeCommands,
    runningSequences,
    getProjectById,
    resolveRuntimeEnvironmentForRun,
    isWindows,
  } = deps;

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

  const spawnProjectCommandProcess = async (project, command, options = {}) => {
    const {
      emitCloseStatus = true,
      startMessage = `Ejecutando: ${command}`,
      controller = null,
      profileIds = [],
      processKey = "",
    } = options;
    const key = processKey || `${project.id}:${Date.now().toString(36)}`;
    const runtime = resolveRuntimeEnvironmentForRun(project, profileIds);

    const finalCommand = runtime.activate
      ? `${runtime.activate} && ${command}`
      : command;

    return new Promise((resolve, reject) => {
      const child = spawn(finalCommand, {
        cwd: runtime.cwd || project.path,
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

        const processName = project?.name || "Proyecto";
        const outcomeMessage = code === 0
          ? `Comando completado: ${processName}`
          : `Comando fallido: ${processName}`;

        if (code === 0) {
          showNotification("FluxDev: proceso completado", `${processName} · ${command}`);
        } else {
          showNotification("FluxDev: proceso fallido", `${processName} · ${command}`);
        }

        if (emitCloseStatus) {
          broadcastRunUpdate({
            projectId: project.id,
            processKey: key,
            command,
            status: "stopped",
            code,
            signal,
            message: outcomeMessage,
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

  const runProjectCommand = async (
    projectId,
    command,
    profileIds = [],
    processKey = "",
  ) => {
    const project = await getProjectById(projectId);

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

    const startPromise = spawnProjectCommandProcess(project, command, {
      profileIds,
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
          status: "stopped",
          message: "Proceso detenido.",
        });
        return {
          projectId,
          processKey,
          stopped: true,
          status: "stopped",
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
          status: "stopped",
          message: `${stoppedCount} proceso(s) detenido(s).`,
        });
      }

      return {
        projectId,
        stopped: stoppedCount > 0,
        stoppedCount,
        status: stoppedCount > 0 ? "stopped" : "idle",
      };
    }

    return { projectId, stopped: false, status: "idle" };
  };

  const runProjectCommandSequence = async (projectId, profileIds = []) => {
    const project = await getProjectById(projectId);

    if (!project) {
      throw new Error("Proyecto no encontrado.");
    }

    if (runningProcesses.has(projectId) || runningSequences.has(projectId)) {
      throw new Error("Este proyecto ya esta en ejecucion.");
    }

    const commands = Array.isArray(project.commands) ? project.commands : [];
    const normalizedProfileIds = Array.isArray(profileIds)
      ? profileIds.map((id) => String(id ?? '').trim()).filter(Boolean)
      : [];
    const selectedProfileIds = normalizedProfileIds.length
      ? normalizedProfileIds
      : (project?.defaultEnvironmentProfileId ? [String(project.defaultEnvironmentProfileId)] : []);

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
            profileIds: selectedProfileIds,
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

  const getRunningProcesses = () => {
    const running = [];
    for (const [key, child] of runningProcesses.entries()) {
      const [projectId, timestamp] = key.split(":");
      running.push({ processKey: key, projectId, pid: child.pid, timestamp });
    }
    return running;
  };

  const cleanupAllProcesses = async () => {
    for (const child of runningProcesses.values()) {
      terminateChildProcessSync(child);
    }
    runningProcesses.clear();
  };

  return {
    spawnProjectCommandProcess,
    runProjectCommand,
    stopProjectCommand,
    runProjectCommandSequence,
    getRunningProcesses,
    cleanupAllProcesses,
    terminateChildProcess,
    terminateChildProcessSync,
  };
};

module.exports = { createProcessManager };
