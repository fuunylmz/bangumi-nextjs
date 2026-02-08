const videoExtensions = new Set([
  ".mkv",
  ".mp4",
  ".avi",
  ".mov",
  ".m4v",
  ".ts",
  ".wmv",
  ".flv",
  ".mpg",
  ".mpeg",
  ".rm",
  ".rmvb",
]);

const ignoreSuffixes = new Set([
  ".rar",
  ".zip",
  ".7z",
  ".webp",
  ".jpg",
  ".png",
]);

const ignoreDirs = ["cd", "scan"];

const subtitleExtensions = new Set([
  ".ass",
  ".ssa",
  ".srt",
  ".vtt",
  ".sub",
  ".idx",
  ".sup",
  ".smi",
]);

const extraTags = [
  "ncop",
  "nced",
  "menu",
  "teaser",
  "iv",
  "cm",
  "nc",
  "op",
  "pv",
  "ed",
  "advice",
  "trailer",
  "event",
  "fans",
  "访谈",
  "preview",
  "picture drama",
  "预告",
  "特典",
  "映像",
];

const season0Tags = [
  "ova",
  "oad",
  "special",
  "sp",
  "00",
  ".5",
  "chaos no kakera",
];

const tagPattern = /(\[[^\]]+])|(\([^)]+\))|(\{[^}]+})/g;
const resolutionPattern = /\b(480p|720p|1080p|2160p|4k|x264|x265|hevc|aac|flac)\b/gi;
const bracketPatterns = [
  /[【\[]([^】\]]+)[】\]]/g,
  /《([^》]+)》/g,
  /\(([^)]+)\)/g,
];
const noiseTokens = new Set([
  "bdrip",
  "bd",
  "rip",
  "web",
  "webrip",
  "bluray",
  "hevc",
  "x265",
  "x264",
  "h264",
  "h265",
  "10bit",
  "8bit",
  "flac",
  "aac",
  "dts",
  "truehd",
  "ac3",
  "opus",
  "mkv",
  "mp4",
  "ass",
  "ssa",
  "srt",
  "vtt",
  "sub",
  "idx",
  "sup",
  "smi",
  "简繁",
  "繁体",
  "简体",
  "字幕",
  "外挂",
  "raws",
  "dbd",
  "menu",
  "pv",
  "ncop",
  "nced",
  "oad",
  "ova",
  "sp",
  "special",
  "movie",
  "tv",
]);

export const isVideoFile = (name: string) =>
  videoExtensions.has(name.toLowerCase().slice(name.lastIndexOf(".")));

export const isSubtitleFile = (name: string) =>
  subtitleExtensions.has(name.toLowerCase().slice(name.lastIndexOf(".")));

export const shouldIgnoreFile = (name: string) =>
  ignoreSuffixes.has(name.toLowerCase().slice(name.lastIndexOf(".")));

export const shouldIgnoreDir = (name: string) =>
  ignoreDirs.some((dir) => name.toLowerCase().includes(dir));

export const normalizeName = (name: string) =>
  name
    .replace(tagPattern, " ")
    .replace(resolutionPattern, " ")
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeForMeaning = (value: string) =>
  normalizeName(value)
    .replace(/s\d{1,2}/gi, " ")
    .replace(/season\s*\d+/gi, " ")
    .replace(/第[一二三四五六七八九十0-9]+\s*季/gi, " ")
    .replace(/第[一二三四五六七八九十0-9]+\s*期/gi, " ")
    .replace(/第[一二三四五六七八九十0-9]+\s*部/gi, " ")
    .replace(/oad|ova|sp|special/gi, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const isMeaningfulName = (value: string) => {
  const cleaned = normalizeForMeaning(value);
  if (!cleaned) return false;
  if (!/[a-z\u4e00-\u9fa5]/i.test(cleaned)) return false;
  const tokens = cleaned.toLowerCase().split(" ").filter(Boolean);
  return tokens.some((token) => !noiseTokens.has(token));
};

export const deriveSearchName = (rawName: string) => {
  const base = normalizeName(rawName);
  if (isMeaningfulName(base)) return base;
  const candidates: string[] = [];
  for (const pattern of bracketPatterns) {
    for (const match of rawName.matchAll(pattern)) {
      if (match[1]) candidates.push(match[1]);
    }
  }
  for (const candidate of candidates) {
    const normalized = normalizeName(candidate);
    if (isMeaningfulName(normalized)) return normalized;
  }
  return base;
};

export const extractYear = (name: string) => {
  const match = name.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : null;
};

export const extractSeason = (name: string) => {
  const match =
    name.match(/season\s*([0-9]{1,2})/i) ||
    name.match(/s([0-9]{1,2})/i) ||
    name.match(/第\s*([0-9]{1,2})\s*季/i);
  return match ? Number(match[1]) : null;
};

export const extractEpisode = (name: string) => {
  const cleaned = name
    .replace(tagPattern, " ")
    .replace(resolutionPattern, " ")
    .replace(/\b\d{3,4}p\b/gi, " ")
    .replace(/\b\d{1,2}bit\b/gi, " ")
    .replace(/\bx\d+\b/gi, " ")
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const patterns = [
    /s\d{1,2}e(\d{1,3})/i,
    /e(\d{1,3})/i,
    /ep(\d{1,3})/i,
    /第\s*([0-9]{1,3})\s*[话集]/i,
    /(?:^|\D)(\d{1,3})(?:\D|$)/,
  ];
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
};

export const padNumber = (value: number) =>
  value < 10 ? `0${value}` : String(value);

export const hasExtraTag = (name: string) => {
  const lower = name.toLowerCase();
  return extraTags.some((tag) => lower.includes(tag));
};

export const hasSeason0Tag = (name: string) => {
  const lower = name.toLowerCase();
  return season0Tags.some((tag) => lower.includes(tag));
};
