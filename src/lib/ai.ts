import { AiProvider, AppConfig } from "./types";

type AiRawResult = {
  raw: string;
  extractedJson?: string | null;
};

type TmdbCandidate = {
  id: number;
  name?: string;
  title?: string;
  first_air_date?: string;
  release_date?: string;
};

/** 判断是否使用 OpenAI 兼容协议（所有非 Gemini 的 provider 均走此路径） */
export const isOpenAICompatible = (provider: AiProvider): boolean =>
  provider !== "gemini";

// ───── Prompt Builders ─────

const buildPrompt = (title: string, files: string[], folders: string[]) => {
  const sample = files.slice(0, 80);
  const more =
    files.length > sample.length
      ? `...还有${files.length - sample.length}个`
      : "";

  // 按目录分组文件，展示清晰的目录结构
  const grouped = new Map<string, string[]>();
  for (const file of sample) {
    const dir = file.includes("/") ? file.substring(0, file.lastIndexOf("/")) : ".";
    if (!grouped.has(dir)) grouped.set(dir, []);
    grouped.get(dir)!.push(file);
  }
  const tree = Array.from(grouped.entries())
    .map(([dir, dirFiles]) => `[${dir}]\n${dirFiles.map((f) => `  - ${f}`).join("\n")}`)
    .join("\n");

  return [
    "你是一个媒体文件整理助手，你需要分析以下文件列表，判断每个视频文件属于正片还是特典/附加内容。",
    "",
    `标题推测: ${title}`,
    "",
    "目录结构（按文件夹分组）:",
    tree,
    more,
    "",
    "## 判断规则",
    "1. **正片**（extra: false）：属于本作品主线剧情的剧集，通常文件名包含 S01E01、EP01 等集数标记，或按顺序编号。",
    "2. **特典/附加内容**（extra: true）：不属于主线剧情的内容，包括但不限于：",
    "   - NCOP/NCED（无字幕OP/ED）",
    "   - PV（预告片）、CM（广告）、Trailer（预告）",
    "   - SP/Special（特别篇）、OVA/OAD",
    "   - Menu（菜单）、IV（访谈）",
    "   - 作品衍生短片、番外篇（例如：Depth of Field、Mini Theater、特典映像等）",
    "   - 任何放在独立子文件夹中且文件夹名称明显不是季数标记（如 Season1、S2）的内容",
    "3. **目录名是重要线索**：如果文件在非主目录（非根目录、非Season文件夹）的子文件夹中，且文件夹名称是特定短片/特典系列的名字，应标记为 extra: true。",
    "4. **拿不准时标记为 extra: true**，宁可漏掉特典也不要把特典混入正片。",
    "",
    "请输出JSON，格式如下：",
    "{",
    '  "items": [',
    '    {"file": "路径/文件名", "season": 1, "episode": 1, "extra": false}',
    "  ]",
    "}",
    "要求：",
    "- file 必须与列表中的路径完全一致",
    "- season/episode 为数字",
    "- extra 为布尔值，true 表示特典/附加内容，false 表示正片",
    "- 只输出JSON，不要解释",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
};

const buildTitlePrompt = (
  title: string,
  files: string[],
  folders: string[]
) => {
  const sample = files.slice(0, 60);
  const more =
    files.length > sample.length
      ? `...还有${files.length - sample.length}个`
      : "";
  const folderSample = folders.slice(0, 60);
  const folderMore =
    folders.length > folderSample.length
      ? `...还有${folders.length - folderSample.length}个`
      : "";
  return [
    "你是一个媒体标题解析助手。",
    `原始名称: ${title}`,
    "目录列表:",
    folderSample.map((name) => `- ${name}`).join("\n"),
    folderMore,
    "文件列表:",
    sample.map((name) => `- ${name}`).join("\n"),
    more,
    "请输出JSON，格式如下：",
    "{",
    '  "title": "作品标题"',
    "}",
    "要求：title 仅保留作品名称，去除分辨率、编码、字幕组、季/集信息、年份、格式、特典标记。",
  ]
    .filter(Boolean)
    .join("\n");
};

const buildTmdbPickPrompt = (
  query: string,
  rawName: string,
  year: number | null,
  type: "tv" | "movie",
  candidates: TmdbCandidate[]
) => {
  const list = candidates.map((item) => {
    const title = item.title || item.name || "-";
    const date = item.release_date || item.first_air_date || "-";
    return `- id:${item.id} | ${title} | ${date}`;
  });
  return [
    "你是一个 TMDB 匹配助手。",
    `原始名称: ${rawName}`,
    `搜索关键词: ${query}`,
    year ? `年份: ${year}` : "",
    `类型: ${type === "tv" ? "剧集" : "电影"}`,
    "候选列表:",
    list.join("\n"),
    "只输出JSON，格式如下：",
    "{",
    '  "id": 123',
    "}",
    "要求：id 必须来自候选列表，只输出JSON。",
  ]
    .filter(Boolean)
    .join("\n");
};

const buildAnimePickPrompt = (payload: {
  rawName: string;
  title: string;
  year: number | null;
  type: "tv" | "movie";
  tmdbTitle?: string;
  originalTitle?: string;
  genres?: string;
}) => {
  return [
    "你是一个媒体分类助手。",
    `原始名称: ${payload.rawName}`,
    `标题: ${payload.title}`,
    payload.year ? `年份: ${payload.year}` : "",
    `类型: ${payload.type === "tv" ? "剧集" : "电影"}`,
    payload.tmdbTitle ? `TMDB 标题: ${payload.tmdbTitle}` : "",
    payload.originalTitle ? `原始标题: ${payload.originalTitle}` : "",
    payload.genres ? `TMDB 类型: ${payload.genres}` : "",
    "请判断它是否为动画（包括日本动画/动画电影/动画剧集）。",
    "只输出JSON，格式如下：",
    "{",
    '  "isAnime": true',
    "}",
    "要求：只输出JSON。",
  ]
    .filter(Boolean)
    .join("\n");
};

// ───── Response Extractors ─────

const tryExtractJsonBlock = (raw: string) => {
  const fenceMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  const genericFence = raw.match(/```\s*([\s\S]*?)```/);
  if (genericFence?.[1]) return genericFence[1].trim();

  const objectMatch = raw.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) return objectMatch[0].trim();

  return null;
};

const extractFromGeminiPayload = (raw: string) => {
  try {
    const payload = JSON.parse(raw) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? tryExtractJsonBlock(text) : null;
  } catch {
    return null;
  }
};

const extractFromOpenAIResponse = (raw: string) => {
  try {
    const payload = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = payload?.choices?.[0]?.message?.content;
    return text ? tryExtractJsonBlock(text) : null;
  } catch {
    return null;
  }
};

// ───── API Request Functions ─────

/** 通用 OpenAI 兼容协议请求（适用于 OpenAI、DeepSeek 及任何兼容端点） */
const requestOpenAI = async (config: AppConfig, prompt: string) => {
  const baseUrl = config.aiBaseUrl.replace(/\/$/, "");
  const url = `${baseUrl}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.aiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.aiModel,
      temperature: config.aiTemperature,
      messages: [
        { role: "system", content: "只输出原始结果，不要解释。" },
        { role: "user", content: prompt },
      ],
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `OpenAI 兼容 API 请求失败 (${response.status}): ${text.slice(0, 500)}`
    );
  }
  return text;
};

const requestGemini = async (config: AppConfig, prompt: string) => {
  const baseUrl = config.geminiBaseUrl.replace(/\/$/, "");
  const url = `${baseUrl}/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: config.geminiTemperature },
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Gemini 请求失败 (${response.status}): ${text.slice(0, 500)}`
    );
  }
  return text;
};

// ───── Unified AI Dispatcher ─────

/**
 * 统一的 AI 调用入口。
 * 所有非 Gemini 的 provider（openai / deepseek / custom）均走 OpenAI 兼容协议。
 */
const callAi = async (
  config: AppConfig,
  prompt: string
): Promise<AiRawResult | null> => {
  if (isOpenAICompatible(config.aiProvider)) {
    if (!config.aiApiKey) return null;
    const raw = await requestOpenAI(config, prompt);
    return { raw, extractedJson: extractFromOpenAIResponse(raw) };
  }
  if (!config.geminiApiKey) return null;
  const raw = await requestGemini(config, prompt);
  return { raw, extractedJson: extractFromGeminiPayload(raw) };
};

// ───── Public API ─────

export const runAiAnalysis = async (
  config: AppConfig,
  title: string,
  files: string[],
  folders: string[]
): Promise<AiRawResult | null> => {
  if (!config.aiEnabled) return null;
  return callAi(config, buildPrompt(title, files, folders));
};

export const runAiTitleAnalysis = async (
  config: AppConfig,
  title: string,
  files: string[],
  folders: string[]
): Promise<AiRawResult | null> => {
  if (!config.aiEnabled) return null;
  return callAi(config, buildTitlePrompt(title, files, folders));
};

export const runAiTmdbPick = async (
  config: AppConfig,
  type: "tv" | "movie",
  title: string,
  rawName: string,
  year: number | null,
  candidates: TmdbCandidate[]
): Promise<AiRawResult | null> => {
  if (!config.aiEnabled) return null;
  if (candidates.length === 0) return null;
  return callAi(
    config,
    buildTmdbPickPrompt(title, rawName, year, type, candidates)
  );
};

export const runAiAnimePick = async (
  config: AppConfig,
  payload: {
    rawName: string;
    title: string;
    year: number | null;
    type: "tv" | "movie";
    tmdbTitle?: string;
    originalTitle?: string;
    genres?: string;
  }
): Promise<AiRawResult | null> => {
  if (!config.aiEnabled) return null;
  return callAi(config, buildAnimePickPrompt(payload));
};
