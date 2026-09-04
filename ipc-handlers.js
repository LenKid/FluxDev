const { ipcMain } = require("electron/main");

const registerIpcHandlers = (deps) => {
  const {
    dialog,
    shell,
    processManager,
    readProjects,
    readHistory,
    saveHistory,
    readGlobalTags,
    saveGlobalTags,
    saveProjects,
    assertUniqueProjectPath,
    validateProjectInput,
    autoDetectScanProjects,
    autoDetectApplyProjects,
    detectEnvironmentProfilesFromProject,
    guessCommandsFromPackageJson,
    detectFrameworkIcon,
    getGitStatusForProject,
    exportProjectsToFile,
    importProjectsFromFile,
    broadcastRunUpdate,
    runningProcesses,
    getProjectById,
    createTerminalSession,
    openExternalTerminalSession,
    writeToTerminalSession,
    resizeTerminalSession,
    clearTerminalSession,
    closeTerminalSession,
    toPathKey,
    normalizeProjectTags,
  } = deps;

  const mergeProjectTagsIntoGlobal = async (projects) => {
    const globalTags = await readGlobalTags();
    await saveGlobalTags([...globalTags, ...projects.flatMap((project) => project.tags || [])]);
  };

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
    await mergeProjectTagsIntoGlobal([project]);
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
      if (project.tags !== undefined) current.tags = project.tags;
      if (project.environmentProfiles)
        current.environmentProfiles = project.environmentProfiles;
      if (project.defaultEnvironmentProfileId !== undefined)
        current.defaultEnvironmentProfileId =
          project.defaultEnvironmentProfileId;
      if (project.lastUsedEnvironmentProfileId !== undefined)
        current.lastUsedEnvironmentProfileId =
          project.lastUsedEnvironmentProfileId;
    }

    if (redetect) {
      const packageJsonPath = require("node:path").join(current.path, "package.json");
      let parsed = null;
      try {
        const raw = await require("node:fs/promises").readFile(packageJsonPath, "utf8");
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
    await mergeProjectTagsIntoGlobal([updatedProject]);
    return updatedProject;
  });

  ipcMain.handle("tags:list", async () => {
    const projects = await readProjects();
    const globalTags = await readGlobalTags();
    const names = normalizeProjectTags([
      ...globalTags,
      ...projects.flatMap((project) => project.tags || []),
    ]);

    return names
      .map((name) => ({
        name,
        count: projects.filter((project) =>
          (project.tags || []).some((tag) => String(tag).toLocaleLowerCase() === name.toLocaleLowerCase()),
        ).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  ipcMain.handle("tags:create", async (_event, payload) => {
    const name = normalizeProjectTags([payload?.name])[0];
    if (!name) {
      throw new Error("El nombre de la etiqueta es obligatorio.");
    }

    const globalTags = await readGlobalTags();
    const existing = globalTags.find((tag) => tag.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (existing) {
      return { name: existing, created: false };
    }

    await saveGlobalTags([...globalTags, name]);
    return { name, created: true };
  });

  ipcMain.handle("tags:rename", async (_event, payload) => {
    const oldName = normalizeProjectTags([payload?.oldName])[0];
    const newName = normalizeProjectTags([payload?.newName])[0];
    if (!oldName || !newName) {
      throw new Error("Debes indicar la etiqueta actual y la nueva.");
    }

    const projects = await readProjects();
    const updatedProjects = projects.map((project) => ({
      ...project,
      tags: normalizeProjectTags((project.tags || []).map((tag) =>
        String(tag).toLocaleLowerCase() === oldName.toLocaleLowerCase() ? newName : tag,
      )),
    }));
    const globalTags = await readGlobalTags();
    await saveProjects(updatedProjects);
    await saveGlobalTags([...globalTags.filter((tag) => tag.toLocaleLowerCase() !== oldName.toLocaleLowerCase()), newName]);
    return { oldName, newName, updatedProjects: updatedProjects.length };
  });

  ipcMain.handle("tags:delete", async (_event, payload) => {
    const name = normalizeProjectTags([payload?.name])[0];
    if (!name) {
      throw new Error("Debes indicar la etiqueta a eliminar.");
    }

    const projects = await readProjects();
    const usedBy = projects.filter((project) =>
      (project.tags || []).some((tag) => String(tag).toLocaleLowerCase() === name.toLocaleLowerCase()),
    );
    if (usedBy.length) {
      throw new Error(`No se puede eliminar: la etiqueta esta asignada a ${usedBy.length} proyecto(s).`);
    }

    const globalTags = await readGlobalTags();
    await saveGlobalTags(globalTags.filter((tag) => tag.toLocaleLowerCase() !== name.toLocaleLowerCase()));
    return { name, deleted: true };
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

    await processManager.stopProjectCommand({ projectId });

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
      projects.map((project) => processManager.stopProjectCommand({ projectId: project.id })),
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
    const profileIds = Array.isArray(payload?.profileIds)
      ? payload.profileIds.map((id) => String(id ?? "").trim()).filter(Boolean)
      : [];

    if (!projectId || !command) {
      throw new Error("Proyecto y comando son obligatorios.");
    }

    const processKey = `${projectId}:${Date.now().toString(36)}`;
    return processManager.runProjectCommand(projectId, command, profileIds, processKey);
  });

  ipcMain.handle("projects:run-all", async (_event, payload) => {
    const projectId = String(payload?.projectId ?? "").trim();
    const profileIds = Array.isArray(payload?.profileIds)
      ? payload.profileIds.map((id) => String(id ?? "").trim()).filter(Boolean)
      : [];

    if (!projectId) {
      throw new Error("Debes indicar el proyecto a ejecutar.");
    }

    return processManager.runProjectCommandSequence(projectId, profileIds);
  });

  ipcMain.handle("projects:stop", async (_event, payload) => {
    const projectId = String(payload?.projectId ?? "").trim();
    const processKey = String(payload?.processKey ?? "").trim();
    const command = String(payload?.command ?? "").trim();

    if (!projectId && !processKey) {
      throw new Error("Debes indicar el proyecto o proceso a detener.");
    }

    return processManager.stopProjectCommand({ projectId, processKey, command });
  });

  ipcMain.handle("projects:running", async () => {
    return processManager.getRunningProcesses();
  });

  ipcMain.handle("projects:export", async () => exportProjectsToFile(dialog));

  ipcMain.handle("projects:import", async () => {
    if (runningProcesses.size > 0) {
      throw new Error("Deten los procesos en ejecucion antes de importar datos.");
    }

    return importProjectsFromFile(dialog);
  });

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

  ipcMain.handle("history:list", async () => readHistory());

  ipcMain.handle("history:save", async (_event, payload) => {
    const history = Array.isArray(payload?.history) ? payload.history : [];
    await saveHistory(history);
    return { saved: true, count: history.length };
  });

  ipcMain.handle("shell:open-external", async (_event, payload) => {
    const url = String(payload?.url ?? "").trim();
    if (!url) return { opened: false };
    await shell.openExternal(url);
    return { opened: true };
  });
};

module.exports = { registerIpcHandlers };
