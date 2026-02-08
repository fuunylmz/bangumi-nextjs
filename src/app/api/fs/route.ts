import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { readConfig } from "@/lib/storage";
import { authCookieName, validateAuth } from "@/lib/auth";

const listDirs = async (targetPath: string) => {
  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      fullPath: path.join(targetPath, entry.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const GET = async (request: NextRequest) => {
  const config = await readConfig();
  if (!validateAuth(config, request.cookies.get(authCookieName)?.value ?? null)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const url = new URL(request.url);
  const rawPath = url.searchParams.get("path");
  const pageParam = Number(url.searchParams.get("page") || "1");
  const pageSizeParam = Number(url.searchParams.get("pageSize") || "120");
  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const pageSize =
    Number.isNaN(pageSizeParam) || pageSizeParam < 20 ? 120 : pageSizeParam;
  const resolved = rawPath
    ? path.resolve(rawPath)
    : path.parse(process.cwd()).root;
  try {
    const dirs = await listDirs(resolved);
    const total = dirs.length;
    const start = (page - 1) * pageSize;
    const pagedDirs = dirs.slice(start, start + pageSize);
    const parent = path.dirname(resolved);
    return NextResponse.json({
      current: resolved,
      parent: parent === resolved ? null : parent,
      dirs: pagedDirs,
      page,
      pageSize,
      total,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "无法读取目录" },
      { status: 400 }
    );
  }
};
