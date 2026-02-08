import { AppConfig } from "./types";

type AiRawResult = {
  raw: string;
  extractedJson?: string | null;
};

const buildPrompt = (
  title: string,
  files: string[],
  folders: string[]
) => {
  const sample = files.slice(0, 80);
  const more = files.length > sample.length ? `...还有${files.length - sample.length}个` : "";
  const folderSample = folders.slice(0, 80);
  const folderMore =
    folders.length > folderSample.length
      ? `...还有${folders.length - folderSample.length}个`
      : "";
  return [
    "你是一个媒体文件整理助手。",
    `标题推测: ${title}`,
    "目录列表:",
    folderSample.map((name) => `- ${name}`).join("\n"),
    folderMore,
    "文件列表:",
    sample.map((name) => `- ${name}`).join("\n"),
    more,
    "请输出JSON，格式如下：",
    "{",
    '  "items": [',
    '    {"file": "路径/文件名", "season": 1, "episode": 1, "extra": false}',
    "  ]",
    "}",
    "要求：file 必须与列表一致，season/episode 为数字，extra 表示特典。",
  ]
    .filter(Boolean)
    .join("\n");
};

const buildTitlePrompt = (
  title: string,
  files: string[],
  folders: string[]
) => {
  const sample = files.slice(0, 60);
  const more = files.length > sample.length ? `...还有${files.length - sample.length}个` : "";
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

const tryExtractJsonBlock = (raw: string) => {
  const fenceMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  const genericFence = raw.match(/```\s*([\s\S]*?)```/);
  if (genericFence && genericFence[1]) {
    return genericFence[1].trim();
  }
  const objectMatch = raw.match(/\{[\s\S]*\}/);
  if (objectMatch && objectMatch[0]) {
    return objectMatch[0].trim();
  }
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
    if (!text) return null;
    return tryExtractJsonBlock(text);
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
    if (!text) return null;
    return tryExtractJsonBlock(text);
  } catch {
    return null;
  }
};

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
    throw new Error(`OpenAI请求失败: ${text}`);
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
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: config.geminiTemperature,
      },
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini请求失败: ${text}`);
  }
  return text;
};

export const runAiAnalysis = async (
  config: AppConfig,
  title: string,
  files: string[],
  folders: string[]
): Promise<AiRawResult | null> => {
  if (!config.aiEnabled) return null;
  if (config.aiProvider === "openai" || config.aiProvider === "deepseek") {
    if (!config.aiApiKey) return null;
    const raw = await requestOpenAI(config, buildPrompt(title, files, folders));
    return { raw, extractedJson: extractFromOpenAIResponse(raw) };
  }
  if (!config.geminiApiKey) return null;
  const raw = await requestGemini(config, buildPrompt(title, files, folders));
  return { raw, extractedJson: extractFromGeminiPayload(raw) };
};

export const runAiTitleAnalysis = async (
  config: AppConfig,
  title: string,
  files: string[],
  folders: string[]
): Promise<AiRawResult | null> => {
  if (!config.aiEnabled) return null;
  if (config.aiProvider === "openai" || config.aiProvider === "deepseek") {
    if (!config.aiApiKey) return null;
    const raw = await requestOpenAI(config, buildTitlePrompt(title, files, folders));
    return { raw, extractedJson: extractFromOpenAIResponse(raw) };
  }
  if (!config.geminiApiKey) return null;
  const raw = await requestGemini(config, buildTitlePrompt(title, files, folders));
  return { raw, extractedJson: extractFromGeminiPayload(raw) };
};
