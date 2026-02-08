import { NextRequest, NextResponse } from "next/server";
import {
  appendTaskLog,
  readConfig,
  readTaskRecords,
  writeTaskRecord,
} from "@/lib/storage";
import { randomUUID } from "node:crypto";
import { processPath } from "@/lib/rename/process";
import { authCookieName, validateAuth } from "@/lib/auth";

export const GET = async (request: NextRequest) => {
  const config = await readConfig();
  if (!validateAuth(config, request.cookies.get(authCookieName)?.value ?? null)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const tasks = await readTaskRecords();
  return NextResponse.json(tasks);
};

export const POST = async (request: NextRequest) => {
  const config = await readConfig();
  if (!validateAuth(config, request.cookies.get(authCookieName)?.value ?? null)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const body = (await request.json()) as {
    path?: string;
    isAnime?: boolean | null;
    isMovie?: boolean | null;
  };
  const uuid = randomUUID();
  const payload = {
    path: body.path || "",
    isAnime: body.isAnime ?? null,
    isMovie: body.isMovie ?? null,
  };
  void processPath(
    payload.path,
    {
      isAnime: body.isAnime ?? null,
      isMovie: body.isMovie ?? null,
    },
    uuid
  ).catch(async (error) => {
    await appendTaskLog(uuid, `[失败] ${(error as Error).message}`);
    await writeTaskRecord({
      uuid,
      path: payload.path,
      createdAt: new Date().toISOString(),
      status: "失败",
      progress: 100,
      stage: "处理异常",
      error: (error as Error).message,
    });
  });
  return NextResponse.json({ uuid });
};
