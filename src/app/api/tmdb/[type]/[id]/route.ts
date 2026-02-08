import { NextResponse } from "next/server";
import { readConfig } from "@/lib/storage";
import { fetchDetail } from "@/lib/tmdb";

export const GET = async (
  _request: Request,
  context: { params: Promise<{ type: string; id: string }> }
) => {
  const { type, id } = await context.params;
  if (type !== "tv" && type !== "movie") {
    return NextResponse.json({ error: "类型不支持" }, { status: 400 });
  }
  const config = await readConfig();
  if (!config.apiKey) {
    return NextResponse.json({ error: "TMDB API Key 未配置" }, { status: 400 });
  }
  const detail = await fetchDetail(type, Number(id), config.apiKey);
  if (!detail) {
    return NextResponse.json({ error: "未找到详情" }, { status: 404 });
  }
  return NextResponse.json(detail);
};
