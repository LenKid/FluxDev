const path = require("node:path");
const fsSync = require("node:fs");

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

const normalizeCommands = (commands) => {
  if (!Array.isArray(commands)) {
    return [];
  }

  return commands.map((command) => String(command).trim()).filter(Boolean);
};

const normalizeProjectTags = (tags) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  const seen = new Set();
  return tags
    .map((tag) => String(tag ?? "").trim())
    .filter((tag) => {
      const key = tag.toLocaleLowerCase();
      if (!tag || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
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

const stripEdgeSeparators = (text) => String(text || "")
  .trim()
  .replace(/^(?:&&?|\|\|?|;)+\s*/, "")
  .replace(/\s*(?:&&?|\|\|?|;)+$/, "");

const resolveRuntimeEnvironmentForRun = (project, profileIds = []) => {
  const ids = Array.isArray(profileIds)
    ? profileIds.map((id) => String(id ?? "").trim()).filter(Boolean)
    : [];
  const profiles = Array.isArray(project?.environmentProfiles)
    ? project.environmentProfiles
    : [];
  const matched = profiles.filter((profile) => ids.includes(String(profile.id)));
  let activate = "";
  let cwd = "";
  const env = { ...process.env };

  matched.forEach((profile) => {
    Object.assign(env, profile?.environment || {});
    const rawActivate = stripEdgeSeparators(profile?.activate);
    if (rawActivate) {
      activate = activate ? `${activate} && ${rawActivate}` : rawActivate;
    }
    const rawCwd = String(profile?.cwd || "").trim();
    if (rawCwd) {
      cwd = rawCwd;
    }
  });

  const resolvedCwd = cwd ? path.resolve(project.path, cwd) : project.path;
  let safeCwd = project.path;

  try {
    safeCwd = fsSync.statSync(resolvedCwd).isDirectory() ? resolvedCwd : project.path;
  } catch {
    safeCwd = project.path;
  }

  return { profiles: matched, activate, env, cwd: safeCwd };
};

const validateProjectInput = (project) => {
  const name = String(project?.name ?? "").trim();
  const projectPath = String(project?.path ?? "").trim();
  const icon = String(project?.icon ?? "").trim();
  const commands = normalizeCommands(project?.commands);
  const favorite = Boolean(project?.favorite);
  const tags = normalizeProjectTags(project?.tags);
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
  const requestedLastUsedProfileId = String(
    project?.lastUsedEnvironmentProfileId ?? "",
  ).trim();
  const lastUsedEnvironmentProfileId = environmentProfiles.some(
    (profile) => profile.id === requestedLastUsedProfileId,
  )
    ? requestedLastUsedProfileId
    : "";

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
    tags,
    environmentProfiles,
    defaultEnvironmentProfileId,
    lastUsedEnvironmentProfileId,
  };
};

module.exports = {
  stripAnsiCodes,
  normalizeCommands,
  normalizeProjectTags,
  parseEnvironmentText,
  normalizeEnvironmentProfile,
  normalizeEnvironmentProfiles,
  resolveProjectEnvironmentProfile,
  resolveRuntimeEnvironment,
  stripEdgeSeparators,
  resolveRuntimeEnvironmentForRun,
  validateProjectInput,
};
