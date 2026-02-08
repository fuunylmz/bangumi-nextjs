export type RenameMode = "链接" | "复制" | "剪切";

export type AiProvider = "openai" | "gemini" | "deepseek";

export type AiConfidence = "High" | "Medium" | "Low";

export type OpenAIOutputFormat =
  | "function_calling"
  | "json_object"
  | "structured_output"
  | "text";

export type AppConfig = {
  apiKey: string;
  bangumiPath: string;
  moviePath: string;
  animePath: string;
  animeMoviePath: string;
  mode: RenameMode;
  aiEnabled: boolean;
  aiAutoSave: boolean;
  aiProvider: AiProvider;
  aiConfidenceThreshold: AiConfidence;
  openaiOutputFormat: OpenAIOutputFormat;
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  aiTemperature: number;
  geminiApiKey: string;
  geminiBaseUrl: string;
  geminiModel: string;
  geminiTemperature: number;
  logLevel: "DEBUG" | "INFO" | "WARNING" | "ERROR";
};

export type TaskRecord = {
  uuid: string;
  path: string;
  name?: string;
  seasonId?: number;
  isAnime?: boolean;
  isMovie?: boolean;
  error?: string | null;
  createdAt?: string;
  useAi?: boolean;
  tmdbId?: number;
  tmdbType?: "tv" | "movie";
  status?: "处理中" | "完成" | "失败";
  progress?: number;
  stage?: string;
};
