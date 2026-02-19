import { promises as fs } from "node:fs";
import path from "node:path";
import { AppConfig, TaskRecord } from "./types";

const dataDir = path.join(process.cwd(), "data");
const configPath = path.join(dataDir, "config.json");
const tasksDir = path.join(dataDir, "tasks");
const recordsDir = path.join(dataDir, "records");
const logsDir = path.join(dataDir, "logs");

const defaultConfig: AppConfig = {
  apiKey: "",
  bangumiPath: "",
  moviePath: "",
  animePath: "",
  animeMoviePath: "",
  mode: "链接",
  authEnabled: false,
  authPassword: "",
  qbToken: "",
  aiEnabled: false,
  aiAutoSave: false,
  aiTmdbSelect: false,
  aiProvider: "openai",
  aiConfidenceThreshold: "Medium",
  openaiOutputFormat: "function_calling",
  aiApiKey: "",
  aiBaseUrl: "https://api.openai.com/v1",
  aiModel: "gpt-4o-mini",
  aiTemperature: 0.1,
  geminiApiKey: "",
  geminiBaseUrl: "https://generativelanguage.googleapis.com",
  geminiModel: "gemini-2.5-flash",
  geminiTemperature: 0.5,
  logLevel: "INFO",
};

export const ensureDataDirs = async () => {
  await fs.mkdir(tasksDir, { recursive: true });
  await fs.mkdir(recordsDir, { recursive: true });
  await fs.mkdir(logsDir, { recursive: true });
};

export const readConfig = async (): Promise<AppConfig> => {
  await ensureDataDirs();
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    const merged: AppConfig = { ...defaultConfig, ...parsed } as AppConfig;
    merged.authEnabled = Boolean(merged.authEnabled);
    merged.authPassword = merged.authPassword || "";
    merged.qbToken = merged.qbToken || "";
    merged.aiEnabled = Boolean(merged.aiEnabled);
    merged.aiAutoSave = Boolean(merged.aiAutoSave);
    merged.aiTmdbSelect = Boolean(merged.aiTmdbSelect);
    merged.aiTemperature = Number(merged.aiTemperature) || defaultConfig.aiTemperature;
    merged.geminiTemperature =
      Number(merged.geminiTemperature) || defaultConfig.geminiTemperature;
    await fs.writeFile(configPath, JSON.stringify(merged, null, 2), "utf-8");
    return merged;
  } catch {
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), "utf-8");
    return defaultConfig;
  }
};

export const writeConfig = async (config: AppConfig) => {
  await ensureDataDirs();
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
};

export const writeTaskRecord = async (record: TaskRecord) => {
  await ensureDataDirs();
  const taskPath = path.join(tasksDir, `${record.uuid}.json`);
  await fs.writeFile(taskPath, JSON.stringify(record, null, 2), "utf-8");
};

export const readTaskRecords = async (): Promise<TaskRecord[]> => {
  await ensureDataDirs();
  const entries = await fs.readdir(tasksDir);
  const records: TaskRecord[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(tasksDir, entry), "utf-8");
    try {
      records.push(JSON.parse(raw) as TaskRecord);
    } catch {
      continue;
    }
  }
  return records.sort((a, b) =>
    (b.createdAt || b.uuid).localeCompare(a.createdAt || a.uuid)
  );
};

export const getRecordsDir = () => recordsDir;

export const getLogsDir = () => logsDir;

export const readTaskMapping = async (uuid: string) => {
  await ensureDataDirs();
  const mappingPath = path.join(recordsDir, `${uuid}.json`);
  try {
    const raw = await fs.readFile(mappingPath, "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
};

export const readTaskLog = async (uuid: string) => {
  await ensureDataDirs();
  const logPath = path.join(logsDir, `${uuid}.log`);
  try {
    return await fs.readFile(logPath, "utf-8");
  } catch {
    return "";
  }
};

export const appendTaskLog = async (uuid: string, message: string) => {
  await ensureDataDirs();
  const logPath = path.join(logsDir, `${uuid}.log`);
  await fs.appendFile(logPath, `${message}\n`, "utf-8");
};

export const deleteTaskAssets = async (uuid: string) => {
  await ensureDataDirs();
  const taskPath = path.join(tasksDir, `${uuid}.json`);
  const recordPath = path.join(recordsDir, `${uuid}.json`);
  const logPath = path.join(logsDir, `${uuid}.log`);
  await Promise.allSettled([
    fs.unlink(taskPath),
    fs.unlink(recordPath),
    fs.unlink(logPath),
  ]);
};
