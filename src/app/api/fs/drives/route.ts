import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";

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

export const GET = async () => {
  if (process.platform === "win32") {
    const drives = await detectWindowsDrives();
    return NextResponse.json({ drives });
  }
  return NextResponse.json({ drives: ["/"] });
};
