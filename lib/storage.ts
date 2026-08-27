// localStorage 持久化：收藏、备注、跟进状态，并保护损坏或未知版本的数据。
import type { CandidateProfile } from "./recruitment-types.ts";

export const STORAGE_SCHEMA_VERSION = 2;

const CONTAINER_KEY = "teacher-job-state";

export interface PersistedState {
  schemaVersion: number;
  favorites: string[];
  notes: Record<string, string>;
  followups: Record<string, string>;
  candidateProfile?: CandidateProfile;
  cityNotes?: Record<string, string>;
}

export type StorageLoadResult =
  | { ok: true; state: PersistedState; migrated: boolean; warnings: string[] }
  | {
      ok: false;
      reason: "newer_version" | "corrupted" | "migration_unsupported" | "unavailable";
      message: string;
    };

const LEGACY_KEYS = {
  favorites: "teacher-job-favorites",
  notes: "teacher-job-notes",
  followups: "teacher-job-followups",
} as const;

type RawReadResult = { ok: true; value: string | null } | { ok: false };

function readRaw(key: string): RawReadResult {
  try {
    if (!globalThis.localStorage) return { ok: false };
    return { ok: true, value: globalThis.localStorage.getItem(key) };
  } catch {
    return { ok: false };
  }
}

function setRaw(key: string, value: string): boolean {
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function parseJSON<T>(key: string, raw: string | null, warnings: string[]): { value: T | null; corrupt: boolean } {
  if (raw == null) return { value: null, corrupt: false };
  try {
    return { value: JSON.parse(raw) as T, corrupt: false };
  } catch {
    warnings.push(`本地数据 ${key} 已损坏，该部分被跳过`);
    return { value: null, corrupt: true };
  }
}

function sanitizeFavorites(input: unknown): { value: string[]; valid: boolean } {
  if (!Array.isArray(input)) return { value: [], valid: input == null };
  return { value: input.filter((id): id is string => typeof id === "string"), valid: true };
}

function sanitizeStringMap(input: unknown): { value: Record<string, string>; valid: boolean } {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return { value: {}, valid: input == null };
  }
  const value: Record<string, string> = {};
  for (const [key, entry] of Object.entries(input as Record<string, unknown>)) {
    if (typeof entry === "string") value[key] = entry;
  }
  return { value, valid: true };
}

function salvageFields(raw: unknown, warnings: string[]): {
  state: Omit<PersistedState, "schemaVersion">;
  validFieldCount: number;
} {
  const container = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const favorites = sanitizeFavorites(container.favorites);
  const notes = sanitizeStringMap(container.notes);
  const followups = sanitizeStringMap(container.followups);
  const cityNotes = sanitizeStringMap(container.cityNotes);
  const candidateProfile = container.candidateProfile != null && typeof container.candidateProfile === "object" && !Array.isArray(container.candidateProfile)
    ? container.candidateProfile as CandidateProfile
    : undefined;
  if (!favorites.valid) warnings.push("本地数据 favorites 字段格式异常，已重置为空");
  if (!notes.valid) warnings.push("本地数据 notes 字段格式异常，已重置为空");
  if (!followups.valid) warnings.push("本地数据 followups 字段格式异常，已重置为空");
  if (!cityNotes.valid) warnings.push("本地数据 cityNotes 字段格式异常，已重置为空");
  if (container.candidateProfile != null && !candidateProfile) warnings.push("本地数据 candidateProfile 字段格式异常，已跳过");
  const validFieldCount = [
    Array.isArray(container.favorites),
    container.notes != null && typeof container.notes === "object" && !Array.isArray(container.notes),
    container.followups != null && typeof container.followups === "object" && !Array.isArray(container.followups),
  ].filter(Boolean).length;
  return {
    state: {
      favorites: favorites.value,
      notes: notes.value,
      followups: followups.value,
      cityNotes: cityNotes.value,
      candidateProfile,
    },
    validFieldCount,
  };
}

const MIGRATIONS: Record<number, (state: PersistedState) => PersistedState> = {
  1: (state) => ({ ...state, schemaVersion: 2 }),
};

type MigrationResult =
  | { ok: true; state: PersistedState }
  | { ok: false; missingVersion: number };

function runMigrations(fromVersion: number, state: PersistedState): MigrationResult {
  let current = state;
  let version = fromVersion;
  while (version < STORAGE_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) return { ok: false, missingVersion: version };
    current = migrate(current);
    version += 1;
  }
  return { ok: true, state: current };
}

type LegacyMigrationResult =
  | { ok: true; state: PersistedState; presentKeyCount: number; validKeyCount: number }
  | { ok: false };

function migrateFromLegacyKeys(warnings: string[]): LegacyMigrationResult {
  const reads = {
    favorites: readRaw(LEGACY_KEYS.favorites),
    notes: readRaw(LEGACY_KEYS.notes),
    followups: readRaw(LEGACY_KEYS.followups),
  };
  if (!reads.favorites.ok || !reads.notes.ok || !reads.followups.ok) return { ok: false };

  const parsed = {
    favorites: parseJSON<unknown>(LEGACY_KEYS.favorites, reads.favorites.value, warnings),
    notes: parseJSON<unknown>(LEGACY_KEYS.notes, reads.notes.value, warnings),
    followups: parseJSON<unknown>(LEGACY_KEYS.followups, reads.followups.value, warnings),
  };
  const sanitized = {
    favorites: sanitizeFavorites(parsed.favorites.value),
    notes: sanitizeStringMap(parsed.notes.value),
    followups: sanitizeStringMap(parsed.followups.value),
  };
  const entries = [
    { raw: reads.favorites.value, parsed: parsed.favorites, sanitized: sanitized.favorites },
    { raw: reads.notes.value, parsed: parsed.notes, sanitized: sanitized.notes },
    { raw: reads.followups.value, parsed: parsed.followups, sanitized: sanitized.followups },
  ];
  const presentKeyCount = entries.filter((entry) => entry.raw != null).length;
  const validKeyCount = entries.filter(
    (entry) => entry.raw != null && !entry.parsed.corrupt && entry.sanitized.valid,
  ).length;
  if (reads.favorites.value != null && !sanitized.favorites.valid) warnings.push("旧 favorites 字段格式异常，未用于恢复");
  if (reads.notes.value != null && !sanitized.notes.valid) warnings.push("旧 notes 字段格式异常，未用于恢复");
  if (reads.followups.value != null && !sanitized.followups.valid) warnings.push("旧 followups 字段格式异常，未用于恢复");

  return {
    ok: true,
    state: {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      favorites: sanitized.favorites.value,
      notes: sanitized.notes.value,
      followups: sanitized.followups.value,
    },
    presentKeyCount,
    validKeyCount,
  };
}

function saveMigration(state: PersistedState, warnings: string[]): void {
  if (!saveStorageState(state)) warnings.push("本地数据已在本次会话恢复，但迁移结果未能写回浏览器");
}

export function loadStorageState(): StorageLoadResult {
  const warnings: string[] = [];
  const containerRead = readRaw(CONTAINER_KEY);
  if (!containerRead.ok) {
    return {
      ok: false,
      reason: "unavailable",
      message: "浏览器不允许访问本地存储，本次不会读取或保存收藏与备注。",
    };
  }

  if (containerRead.value != null) {
    const parsed = parseJSON<unknown>(CONTAINER_KEY, containerRead.value, warnings);
    if (parsed.value == null || typeof parsed.value !== "object") {
      const legacy = migrateFromLegacyKeys(warnings);
      if (!legacy.ok) {
        return {
          ok: false,
          reason: "unavailable",
          message: "浏览器不允许访问旧版本地数据，本次未修改现有数据。",
        };
      }
      if (legacy.validKeyCount > 0) {
        saveMigration(legacy.state, warnings);
        return { ok: true, state: legacy.state, migrated: true, warnings };
      }
      return {
        ok: false,
        reason: "corrupted",
        message: "本地保存的数据已损坏，本次未加载；现有数据未被修改，可尝试从备份恢复。",
      };
    }

    const record = parsed.value as Record<string, unknown>;
    const version = typeof record.schemaVersion === "number" && Number.isInteger(record.schemaVersion)
      ? record.schemaVersion
      : 0;
    if (version > STORAGE_SCHEMA_VERSION) {
      return {
        ok: false,
        reason: "newer_version",
        message: "本地数据由更新版本的网站写入，本次未加载，也未做任何修改。",
      };
    }
    if (version === STORAGE_SCHEMA_VERSION) {
      const salvaged = salvageFields(record, warnings);
      if (salvaged.validFieldCount === 0) {
        const legacy = migrateFromLegacyKeys(warnings);
        if (!legacy.ok) {
          return {
            ok: false,
            reason: "unavailable",
            message: "浏览器不允许访问旧版本地数据，本次未修改现有数据。",
          };
        }
        if (legacy.validKeyCount > 0) {
          saveMigration(legacy.state, warnings);
          return { ok: true, state: legacy.state, migrated: true, warnings };
        }
        return {
          ok: false,
          reason: "corrupted",
          message: "本地容器和旧版本地数据均无法恢复，本次未修改原数据。",
        };
      }
      return { ok: true, state: { schemaVersion: STORAGE_SCHEMA_VERSION, ...salvaged.state }, migrated: false, warnings };
    }

    const salvaged = salvageFields(record, warnings);
    const migrated = runMigrations(version, {
      schemaVersion: version,
      ...salvaged.state,
    });
    if (!migrated.ok) {
      return {
        ok: false,
        reason: "migration_unsupported",
        message: `本地数据缺少从版本 ${migrated.missingVersion} 开始的迁移步骤，本次未加载，也未修改原数据。`,
      };
    }
    saveMigration(migrated.state, warnings);
    return { ok: true, state: migrated.state, migrated: true, warnings };
  }

  const legacy = migrateFromLegacyKeys(warnings);
  if (!legacy.ok) {
    return {
      ok: false,
      reason: "unavailable",
      message: "浏览器不允许访问旧版本地数据，本次不会保存收藏与备注。",
    };
  }
  if (legacy.presentKeyCount > 0 && legacy.validKeyCount === 0) {
    return {
      ok: false,
      reason: "corrupted",
      message: "旧版本地数据已损坏，本次未创建新容器，可尝试从备份恢复。",
    };
  }
  if (legacy.validKeyCount > 0) {
    saveMigration(legacy.state, warnings);
    return { ok: true, state: legacy.state, migrated: true, warnings };
  }
  return { ok: true, state: legacy.state, migrated: false, warnings };
}

export function saveStorageState(state: PersistedState): boolean {
  return setRaw(CONTAINER_KEY, JSON.stringify(state));
}
