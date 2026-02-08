import { NextRequest, NextResponse } from "next/server";
import { processPath } from "@/lib/rename/process";

const parseLooseJson = (text: string) => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

const extractJsonPayload = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const direct = parseLooseJson(trimmed);
  if (direct && typeof direct === "object") return direct;
  if (typeof direct === "string") {
    const nested = parseLooseJson(direct);
    if (nested && typeof nested === "object") return nested;
  }
  if (trimmed.includes('\\"')) {
    const unescaped = trimmed.replace(/\\"/g, '"');
    const unescapedJson = parseLooseJson(unescaped);
    if (unescapedJson && typeof unescapedJson === "object") return unescapedJson;
  }
  return null;
};

const parseBody = async (request: NextRequest) => {
  const text = await request.text();
  if (!text) return {};
  const jsonPayload = extractJsonPayload(text);
  if (jsonPayload && typeof jsonPayload === "object") {
    return jsonPayload as {
      path?: string;
      isAnime?: boolean | null | string;
      isMovie?: boolean | null | string;
    };
  }
  const params = new URLSearchParams(text);
  const rawPath = params.get("path") ?? undefined;
  const fallback = rawPath ?? text.trim();
  return {
    path: fallback || undefined,
    isAnime: params.get("isAnime") ?? undefined,
    isMovie: params.get("isMovie") ?? undefined,
  };
};

const normalizeBool = (value?: string | boolean | null) => {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

export const POST = async (request: NextRequest) => {
  const body = await parseBody(request);
  const path = (body.path ?? "").toString().trim();
  if (!path) {
    return NextResponse.json({ error: "路径不能为空" }, { status: 400 });
  }
  const result = await processPath(path, {
    isAnime: normalizeBool(body.isAnime),
    isMovie: normalizeBool(body.isMovie),
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
};

export const GET = async (request: NextRequest) => {
  const url = new URL(request.url);
  const path = url.searchParams.get("path")?.trim() ?? "";
  if (!path) {
    return NextResponse.json({ error: "路径不能为空" }, { status: 400 });
  }
  const result = await processPath(path, {
    isAnime: normalizeBool(url.searchParams.get("isAnime")),
    isMovie: normalizeBool(url.searchParams.get("isMovie")),
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
};
