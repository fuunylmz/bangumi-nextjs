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
  "depth of field",
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

const chineseDigitMap: Record<string, number> = {
  "零": 0, "〇": 0,
  "一": 1, "壹": 1,
  "二": 2, "两": 2, "贰": 2,
  "三": 3, "叁": 3,
  "四": 4, "肆": 4,
  "五": 5, "伍": 5,
  "六": 6, "陆": 6,
  "七": 7, "柒": 7,
  "八": 8, "捌": 8,
  "九": 9, "玖": 9,
  "十": 10, "拾": 10,
};

const chineseToNumber = (str: string): number | null => {
  // Single digit: 一~九
  if (str.length === 1 && chineseDigitMap[str] !== undefined) {
    return chineseDigitMap[str];
  }
  // 十X = 10+X, X十 = X*10, X十Y = X*10+Y, 十 = 10
  const chars = [...str];
  let result = 0;
  let current = 0;
  for (const ch of chars) {
    const val = chineseDigitMap[ch];
    if (val === undefined) return null;
    if (val === 10) {
      result += (current || 1) * 10;
      current = 0;
    } else {
      current = val;
    }
  }
  result += current;
  return result > 0 ? result : null;
};

export const extractSeason = (name: string) => {
  const match =
    name.match(/season\s*([0-9]{1,2})/i) ||
    name.match(/s([0-9]{1,2})/i) ||
    name.match(/第\s*([0-9]{1,2})\s*季/i);
  if (match) return Number(match[1]);

  // Chinese numeral: 第一季, 第二季, 第十二季, etc.
  const cnMatch = name.match(/第\s*([一二三四五六七八九十零〇壹贰叁肆伍陆柒捌玖拾两]+)\s*季/);
  if (cnMatch) {
    const num = chineseToNumber(cnMatch[1]);
    if (num !== null) return num;
  }

  return null;
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
  // 特殊修正：提取可能作为独立词的词缀，或直接包含的情况
  const pattern = new RegExp(`\\b(${extraTags.join("|")})\\b`, "i");
  if (pattern.test(lower)) return true;
  // 保留原有 fallback 包含检测，但需要避免类似 1080p 等常见字符串引发的错乱
  return false; // 其实严格的边界匹配更安全
};

export const hasSeason0Tag = (name: string) => {
  const lower = name.toLowerCase();
  // 使用边界匹配避免 "2000" 误匹配 "00"
  // 对于 ".5"，\b可能不起效，所以特殊处理
  const tagsWithoutDot = season0Tags.filter(t => t !== ".5");
  const pattern = new RegExp(`(?<!\\d)(${tagsWithoutDot.join("|")})(?!\\d)`, "i");
  if (pattern.test(lower)) return true;
  if (lower.includes(".5")) return true;
  return false;
};
