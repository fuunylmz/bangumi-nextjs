import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { readConfig } from "@/lib/storage";
import { authCookieName, validateAuth } from "@/lib/auth";

const detectWindowsDrives = async () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const drives: string[] = [];
  await Promise.all(
    letters.map(async (letter) => {
      const drive = `${letter}:\\`;
      try {
        await fs.access(drive);
        drives.push(drive);
      } catch {}
    })
  );
  return drives;
};

export const GET = async (request: NextRequest) => {
  const config = await readConfig();
  if (!validateAuth(config, request.cookies.get(authCookieName)?.value ?? null)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (process.platform === "win32") {
    const drives = await detectWindowsDrives();
    return NextResponse.json({ drives });
  }
  return NextResponse.json({ drives: ["/"] });
};
