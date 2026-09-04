const path = require("node:path");
const fs = require("node:fs/promises");
const ElectronStore = require("electron-store");
const Store = ElectronStore.default || ElectronStore;
const { validateProjectInput, normalizeProjectTags } = require("./project-helpers");

const PROJECTS_FILE = "projects.json";

const store = new Store({
  name: "fluxdev",
  defaults: {
    projects: [],
    history: [],
    globalTags: [],
  },
});

const toPathKey = (inputPath) => {
  return path.resolve(String(inputPath || "")).toLowerCase();
};

const readProjects = async () => {
  const projects = store.get("projects", []);
  return Array.isArray(projects) ? projects : [];
};

const readHistory = async () => {
  const history = store.get("history", []);
  return Array.isArray(history) ? history : [];
};

const saveHistory = async (history) => {
  store.set("history", history);
};

const readGlobalTags = async () => {
  return normalizeProjectTags(store.get("globalTags", []));
};

const saveGlobalTags = async (tags) => {
  store.set("globalTags", normalizeProjectTags(tags));
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
  const duplicateExists = await hasProjectWithPath(projectPath, excludeProjectId);

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

const exportProjectsToFile = async (dialog) => {
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
    globalTags: await readGlobalTags(),
  };

  await fs.writeFile(result.filePath, JSON.stringify(payload, null, 2), "utf8");

  return {
    canceled: false,
    filePath: result.filePath,
    count: projects.length,
  };
};

const importProjectsFromFile = async (dialog) => {
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

  const selectedPath = result.filePaths[0];
  const raw = await fs.readFile(selectedPath, "utf8");
  const parsed = JSON.parse(raw);

  const projectsPayload = Array.isArray(parsed) ? parsed : parsed?.projects;
  const importedProjects = sanitizeImportedProjects(projectsPayload);

  await saveProjects(importedProjects);
  await saveGlobalTags([...(Array.isArray(parsed?.globalTags) ? parsed.globalTags : []), ...importedProjects.flatMap((project) => project.tags || [])]);

  return {
    canceled: false,
    filePath: selectedPath,
    count: importedProjects.length,
  };
};

module.exports = {
  PROJECTS_FILE,
  store,
  toPathKey,
  readProjects,
  readHistory,
  saveHistory,
  readGlobalTags,
  saveGlobalTags,
  saveProjects,
  hasProjectWithPath,
  assertUniqueProjectPath,
  sanitizeImportedProjects,
  exportProjectsToFile,
  importProjectsFromFile,
};
