import { NextRequest, NextResponse } from "next/server";
import { readConfig, readTaskMapping } from "@/lib/storage";
import { authCookieName, validateAuth } from "@/lib/auth";

export const GET = async (
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> }
) => {
  const config = await readConfig();
  if (!validateAuth(config, request.cookies.get(authCookieName)?.value ?? null)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { uuid } = await context.params;
  const mapping = await readTaskMapping(uuid);
  if (!mapping) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  return NextResponse.json(mapping);
};
