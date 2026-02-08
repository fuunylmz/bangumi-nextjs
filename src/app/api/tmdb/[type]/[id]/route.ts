import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/storage";
import { authCookieName, validateAuth } from "@/lib/auth";
import { fetchDetail } from "@/lib/tmdb";

export const GET = async (
  request: NextRequest,
  context: { params: Promise<{ type: string; id: string }> }
) => {
  const config = await readConfig();
  if (!validateAuth(config, request.cookies.get(authCookieName)?.value ?? null)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { type, id } = await context.params;
  if (type !== "tv" && type !== "movie") {
    return NextResponse.json({ error: "类型不支持" }, { status: 400 });
  }
  if (!config.apiKey) {
    return NextResponse.json({ error: "TMDB API Key 未配置" }, { status: 400 });
  }
  const detail = await fetchDetail(type, Number(id), config.apiKey);
  if (!detail) {
    return NextResponse.json({ error: "未找到详情" }, { status: 404 });
  }
  return NextResponse.json(detail);
};
