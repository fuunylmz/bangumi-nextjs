import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  appendTaskLog,
  getRecordsDir,
  readConfig,
  writeTaskRecord,
} from "../storage";
import { AppConfig, TaskRecord } from "../types";
import { isAnimationGenre, searchMovie, searchTv } from "../tmdb";
import { runAiAnalysis, runAiTitleAnalysis } from "../ai";
import {
  extractEpisode,
  extractSeason,
  extractYear,
  deriveSearchName,
  hasExtraTag,
  hasSeason0Tag,
  isMeaningfulName,
  isSubtitleFile,
  isVideoFile,
  normalizeName,
  padNumber,
  shouldIgnoreDir,
  shouldIgnoreFile,
} from "./utils";

type ProcessOptions = {
  isAnime?: boolean | null;
  isMovie?: boolean | null;
};

type AiEpisodeItem = {
  file: string;
  season: number;
  episode: number;
  extra?: boolean;
};

const normalizeRelPath = (value: string) => value.replace(/\\/g, "/");

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const listFiles = async (dir: string) => {
  const stack = [dir];
  const files: string[] = [];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (shouldIgnoreDir(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        if (shouldIgnoreFile(entry.name)) continue;
        files.push(full);
      }
    }
  }
  return files;
};

const collectVideoEntries = async (basePath: string) => {
  const stats = await fs.stat(basePath);
  const files = stats.isDirectory() ? await listFiles(basePath) : [basePath];
  const folders = stats.isDirectory()
    ? files.map((file) => normalizeRelPath(path.dirname(file)))
    : [];
  const uniqueFolders = Array.from(new Set(folders)).filter(
    (value) => value && value !== "."
  );
  return files
    .filter((file) => isVideoFile(path.basename(file)))
    .map((file) => ({
      full: file,
      rel: normalizeRelPath(
        stats.isDirectory() ? path.relative(basePath, file) : path.basename(file)
      ),
      name: path.basename(file),
      folders: uniqueFolders,
    }));
};

const parseAiItems = (jsonText?: string | null) => {
  if (!jsonText) return null;
  try {
    const data = JSON.parse(jsonText) as { items?: AiEpisodeItem[] } | AiEpisodeItem[];
    const items = Array.isArray(data) ? data : data.items;
    if (!Array.isArray(items)) return null;
    return items
      .filter((item) => item && typeof item.file === "string")
      .map((item) => ({
        file: normalizeRelPath(item.file),
        season: Number(item.season),
        episode: Number(item.episode),
        extra: Boolean(item.extra),
      }))
      .filter((item) => Number.isFinite(item.season) && Number.isFinite(item.episode));
  } catch {
    return null;
  }
};

const parseAiTitle = (jsonText?: string | null) => {
  if (!jsonText) return null;
  try {
    const data = JSON.parse(jsonText) as { title?: string } | string;
    const title = typeof data === "string" ? data : data.title;
    const normalized = title?.trim();
    return normalized ? normalized : null;
  } catch {
    return null;
  }
};

const mapTransfers = async (
  basePath: string,
  targetRoot: string,
  name: string,
  seasonId: number,
  isMovie: boolean,
  aiMap?: Map<string, AiEpisodeItem>
) => {
  const mapping = new Map<string, string>();
  const stats = await fs.stat(basePath);
  const files = stats.isDirectory() ? await listFiles(basePath) : [basePath];
  const subtitleFiles = files.filter((file) =>
    isSubtitleFile(path.basename(file))
  );
  const addSubtitles = (videoFile: string, targetBase: string) => {
    const videoDir = path.dirname(videoFile);
    const videoBase = path.basename(videoFile, path.extname(videoFile));
    const videoBaseLower = videoBase.toLowerCase();
    for (const subFile of subtitleFiles) {
      if (path.dirname(subFile) !== videoDir) continue;
      const subName = path.basename(subFile);
      const subNameLower = subName.toLowerCase();
      if (!subNameLower.startsWith(`${videoBaseLower}.`)) continue;
      const suffix = subName.slice(videoBase.length);
      if (!suffix) continue;
      mapping.set(subFile, `${targetBase}${suffix}`);
    }
  };
  for (const file of files) {
    const fileName = path.basename(file);
    if (!isVideoFile(fileName)) continue;
    const rel = normalizeRelPath(
      stats.isDirectory() ? path.relative(basePath, file) : fileName
    );
    const aiItem = aiMap?.get(rel);
    if (isMovie) {
      const ext = path.extname(fileName);
      const fileBase = path.basename(fileName, ext);
      const targetBase = path.join(targetRoot, `${name} - ${fileBase}`);
      mapping.set(file, `${targetBase}${ext}`);
      addSubtitles(file, targetBase);
      continue;
    }
    const extra = aiItem?.extra ?? hasExtraTag(fileName);
    const season0 = aiItem ? aiItem.season === 0 : hasSeason0Tag(fileName);
    const seasonFromFile =
      extractSeason(fileName) || extractSeason(path.basename(path.dirname(file)));
    const finalSeason = season0
      ? 0
      : aiItem?.season ?? seasonFromFile ?? seasonId;
    const episode =
      aiItem?.episode ?? extractEpisode(fileName) ?? 0;
    if (episode <= 0 || episode > 999 || !Number.isFinite(episode)) continue;
    const seasonLabel = padNumber(finalSeason);
    const episodeLabel = padNumber(episode);
    const ext = path.extname(fileName);
    const folder = extra
      ? path.join(targetRoot, "extra")
      : path.join(targetRoot, `Season${finalSeason}`);
    const targetBase = path.join(folder, `S${seasonLabel}E${episodeLabel}`);
    mapping.set(file, `${targetBase}${ext}`);
    addSubtitles(file, targetBase);
  }
  return mapping;
};

const executeTransfers = async (
  mapping: Map<string, string>,
  mode: AppConfig["mode"]
) => {
  for (const [source, target] of mapping.entries()) {
    await ensureDir(path.dirname(target));
    if (mode === "剪切") {
      await fs.rename(source, target);
    } else if (mode === "复制") {
      await fs.copyFile(source, target);
    } else {
      const exists = await fs
        .stat(target)
        .then(() => true)
        .catch(() => false);
      if (exists) {
        await fs.unlink(target).catch(() => {});
      }
      try {
        await fs.link(source, target);
      } catch {
        try {
          await fs.symlink(source, target);
        } catch {
          const existsAgain = await fs
            .stat(target)
            .then(() => true)
            .catch(() => false);
          if (existsAgain) {
            await fs.unlink(target).catch(() => {});
          }
          await fs.symlink(source, target);
        }
      }
    }
  }
};

const decideType = async (
  baseName: string,
  year: number | null,
  apiKey: string,
  options: ProcessOptions,
  pathIsFile: boolean,
  fileCount: number
) => {
  const tv = await searchTv(baseName, year, apiKey);
  const movie = await searchMovie(baseName, year, apiKey);
  const seasonFromName = extractSeason(baseName);

  let score = 0;
  if (tv) score += 1;
  if (movie) score -= 1;
  if (seasonFromName) score += 0.6;
  else score -= 0.6;
  score += pathIsFile ? -0.5 : 0.5;
  score += fileCount > 6 ? 0.4 : -0.4;

  if (options.isMovie === false) score += 1;
  if (options.isMovie === true) score -= 1;

  if (score > 0) {
    return { kind: "tv" as const, tv, movie, seasonFromName };
  }
  return { kind: "movie" as const, tv, movie, seasonFromName };
};

export const processPath = async (inputPath: string, options: ProcessOptions) => {
  const config = await readConfig();
  if (!config.apiKey) {
    return { error: "TMDB API Key 未配置" };
  }
  const resolvedPath = inputPath.trim();
  if (!resolvedPath) {
    return { error: "路径为空" };
  }
  const exists = await fs
    .stat(resolvedPath)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    return { error: "路径不存在" };
  }

  const stats = await fs.stat(resolvedPath);
  const rawName = path.basename(resolvedPath);
  const rawBaseName = normalizeName(rawName);
  const strippedForSearch = normalizeName(
    rawBaseName.replace(/s\d{1,2}e\d{1,3}/i, "").replace(/\d{1,3}$/i, "")
  );
  const fallbackName = deriveSearchName(rawName);
  let baseName = isMeaningfulName(strippedForSearch || rawBaseName)
    ? strippedForSearch || rawBaseName
    : fallbackName || strippedForSearch || rawBaseName;
  let year = extractYear(rawBaseName) ?? extractYear(baseName);
  const fileCount = stats.isDirectory()
    ? (await fs.readdir(resolvedPath)).length
    : 1;

  const uuid = randomUUID();
  const record: TaskRecord = {
    uuid,
    path: resolvedPath,
    createdAt: new Date().toISOString(),
    useAi: config.aiEnabled,
  };
  await appendTaskLog(uuid, `[开始] ${resolvedPath}`);
  let videoEntries:
    | Awaited<ReturnType<typeof collectVideoEntries>>
    | null = null;
  let videoNames: string[] = [];
  let folderNames: string[] = [];
  let titleCollectError = "";
  if (config.aiEnabled) {
    try {
      videoEntries = await collectVideoEntries(resolvedPath);
      videoNames = videoEntries.map((entry) => entry.rel);
      folderNames = Array.from(
        new Set(videoEntries.flatMap((entry) => entry.folders))
      );
    } catch (error) {
      videoEntries = null;
      titleCollectError = (error as Error).message;
    }
  }
  if (config.aiEnabled) {
    try {
      if (titleCollectError) {
        await appendTaskLog(
          uuid,
          `[AI标题] 读取文件失败: ${titleCollectError}`
        );
      }
      const aiTitleRaw = await runAiTitleAnalysis(
        config,
        rawName,
        videoNames,
        folderNames
      );
      if (aiTitleRaw?.raw) {
        await appendTaskLog(uuid, `[AI标题原始] ${aiTitleRaw.raw}`);
        if (aiTitleRaw.extractedJson) {
          await appendTaskLog(uuid, `[AI标题解析] ${aiTitleRaw.extractedJson}`);
        }
      } else {
        await appendTaskLog(uuid, "[AI标题] 未获取到响应");
      }
      const aiTitle = parseAiTitle(aiTitleRaw?.extractedJson);
      if (aiTitle) {
        baseName = aiTitle;
        year = extractYear(rawBaseName) ?? extractYear(baseName);
        await appendTaskLog(uuid, `[AI标题] 采用标题: ${baseName}`);
      }
    } catch (error) {
      await appendTaskLog(
        uuid,
        `[AI标题] 请求失败: ${(error as Error).message}`
      );
    }
  }
  await appendTaskLog(uuid, `[搜索] 关键词: ${baseName}`);

  const decision = await decideType(
    baseName,
    year,
    config.apiKey,
    options,
    stats.isFile(),
    fileCount
  );
  let aiMap: Map<string, AiEpisodeItem> | undefined;
  let aiApplied = 0;
  if (config.aiEnabled) {
    try {
      if (!videoEntries) {
        videoEntries = await collectVideoEntries(resolvedPath);
        videoNames = videoEntries.map((entry) => entry.rel);
        folderNames = Array.from(
          new Set(videoEntries.flatMap((entry) => entry.folders))
        );
      }
      const aiRaw = await runAiAnalysis(config, baseName, videoNames, folderNames);
      if (aiRaw?.raw) {
        await appendTaskLog(uuid, `[AI原始] ${aiRaw.raw}`);
        if (aiRaw.extractedJson) {
          await appendTaskLog(uuid, `[AI解析] ${aiRaw.extractedJson}`);
        }
      } else {
        await appendTaskLog(uuid, "[AI] 未获取到响应");
      }
      const aiItems = parseAiItems(aiRaw?.extractedJson);
      if (aiItems && aiItems.length > 0) {
        aiMap = new Map(aiItems.map((item) => [item.file, item]));
        aiApplied = aiMap.size;
        await appendTaskLog(uuid, `[AI应用] 使用AI映射: ${aiApplied}`);
      } else {
        await appendTaskLog(uuid, "[AI应用] 未获取到可用映射，使用默认规则");
      }
    } catch (error) {
      await appendTaskLog(
        uuid,
        `[AI] 请求失败: ${(error as Error).message}`
      );
    }
  }

  if (decision.kind === "movie") {
    const movie = decision.movie;
    if (!movie) {
      record.error = "未搜索到电影信息";
      await appendTaskLog(uuid, "[失败] 未搜索到电影信息");
      await writeTaskRecord(record);
      return record;
    }
    const releaseYear = movie.release_date
      ? movie.release_date.split("-")[0]
      : year?.toString() ?? "0000";
    const name = movie.title || baseName;
    const isAnime = isAnimationGenre(movie.genre_ids);
    const targetRoot = path.join(
      isAnime ? config.animeMoviePath : config.moviePath,
      `${name} (${releaseYear})`
    );
    const mapping = await mapTransfers(
      resolvedPath,
      targetRoot,
      name,
      0,
      true,
      aiMap
    );
    if (mapping.size === 0) {
      record.error = "未找到可处理的视频文件";
      await appendTaskLog(uuid, "[失败] 未找到可处理的视频文件");
      await writeTaskRecord(record);
      return record;
    }
    await executeTransfers(mapping, config.mode);
    record.name = name;
    record.isMovie = true;
    record.isAnime = isAnime;
    record.seasonId = 0;
    record.tmdbId = movie.id;
    record.tmdbType = "movie";
    await writeTaskRecord(record);
    await fs.writeFile(
      path.join(getRecordsDir(), `${uuid}.json`),
      JSON.stringify(Object.fromEntries(mapping), null, 2),
      "utf-8"
    );
    await appendTaskLog(uuid, "[完成] 电影处理完成");
    return record;
  }

  const tv = decision.tv;
  if (!tv) {
    record.error = "未搜索到剧集信息";
    await appendTaskLog(uuid, "[失败] 未搜索到剧集信息");
    await writeTaskRecord(record);
    return record;
  }
  const firstYear = tv.first_air_date
    ? tv.first_air_date.split("-")[0]
    : year?.toString() ?? "0000";
  const name = tv.name || baseName;
  const isAnime = isAnimationGenre(tv.genre_ids);
  const targetRoot = path.join(
    isAnime ? config.animePath : config.bangumiPath,
    `${name} (${firstYear})`
  );
  const seasonId = decision.seasonFromName ?? 1;
  const mapping = await mapTransfers(
    resolvedPath,
    targetRoot,
    name,
    seasonId,
    false,
    aiMap
  );
  if (mapping.size === 0) {
    record.error = "未找到可处理的视频文件";
    await appendTaskLog(uuid, "[失败] 未找到可处理的视频文件");
    await writeTaskRecord(record);
    return record;
  }
  await executeTransfers(mapping, config.mode);
  record.name = name;
  record.isMovie = false;
  record.isAnime = isAnime;
  record.seasonId = seasonId;
  record.tmdbId = tv.id;
  record.tmdbType = "tv";
  await writeTaskRecord(record);
  await fs.writeFile(
    path.join(getRecordsDir(), `${uuid}.json`),
    JSON.stringify(Object.fromEntries(mapping), null, 2),
    "utf-8"
  );
  await appendTaskLog(uuid, "[完成] 剧集处理完成");
  return record;
};
