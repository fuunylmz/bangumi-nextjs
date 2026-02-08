import { NextRequest, NextResponse } from "next/server";
import { readTaskRecords } from "@/lib/storage";
import { processPath } from "@/lib/rename/process";

export const GET = async () => {
  const tasks = await readTaskRecords();
  return NextResponse.json(tasks);
};

export const POST = async (request: NextRequest) => {
  const body = (await request.json()) as {
    path?: string;
    isAnime?: boolean | null;
    isMovie?: boolean | null;
  };
  const result = await processPath(body.path || "", {
    isAnime: body.isAnime ?? null,
    isMovie: body.isMovie ?? null,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
};
