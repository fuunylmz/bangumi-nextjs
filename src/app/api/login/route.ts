import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/storage";
import { authCookieName, hashPassword, isAuthEnabled } from "@/lib/auth";

export const POST = async (request: NextRequest) => {
  const body = (await request.json().catch(() => ({}))) as {
    password?: string;
  };
  const password = typeof body.password === "string" ? body.password : "";
  const config = await readConfig();
  if (!isAuthEnabled(config)) {
    return NextResponse.json({ ok: true, disabled: true });
  }
  if (!password || password !== config.authPassword) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName, hashPassword(config.authPassword), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
};
