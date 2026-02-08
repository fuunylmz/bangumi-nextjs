import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/lib/storage";
import { AppConfig } from "@/lib/types";
import { authCookieName, validateAuth } from "@/lib/auth";

export const GET = async (request: NextRequest) => {
  const config = await readConfig();
  if (!validateAuth(config, request.cookies.get(authCookieName)?.value ?? null)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  return NextResponse.json({ ...config, authPassword: "", qbToken: "" });
};

export const POST = async (request: NextRequest) => {
  const current = await readConfig();
  if (!validateAuth(current, request.cookies.get(authCookieName)?.value ?? null)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const body = (await request.json()) as AppConfig;
  const config: AppConfig = {
    apiKey: body.apiKey || "",
    bangumiPath: body.bangumiPath || "",
    moviePath: body.moviePath || "",
    animePath: body.animePath || "",
    animeMoviePath: body.animeMoviePath || "",
    mode: body.mode || "链接",
    authEnabled: Boolean(body.authEnabled),
    authPassword: body.authPassword || current.authPassword || "",
    qbToken: body.qbToken || current.qbToken || "",
    aiEnabled: Boolean(body.aiEnabled),
    aiAutoSave: Boolean(body.aiAutoSave),
    aiProvider: body.aiProvider || "openai",
    aiConfidenceThreshold: body.aiConfidenceThreshold || "Medium",
    openaiOutputFormat: body.openaiOutputFormat || "function_calling",
    aiApiKey: body.aiApiKey || "",
    aiBaseUrl: body.aiBaseUrl || "https://api.openai.com/v1",
    aiModel: body.aiModel || "gpt-4o-mini",
    aiTemperature:
      typeof body.aiTemperature === "number" ? body.aiTemperature : 0.1,
    geminiApiKey: body.geminiApiKey || "",
    geminiBaseUrl:
      body.geminiBaseUrl || "https://generativelanguage.googleapis.com",
    geminiModel: body.geminiModel || "gemini-2.5-flash",
    geminiTemperature:
      typeof body.geminiTemperature === "number" ? body.geminiTemperature : 0.5,
    logLevel: body.logLevel || "INFO",
  };
  await writeConfig(config);
  return NextResponse.json({ ok: true });
};
