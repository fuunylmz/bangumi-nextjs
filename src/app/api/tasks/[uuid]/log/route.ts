import { NextResponse } from "next/server";
import { readTaskLog } from "@/lib/storage";

export const GET = async (
  _request: Request,
  context: { params: Promise<{ uuid: string }> }
) => {
  const { uuid } = await context.params;
  const log = await readTaskLog(uuid);
  return NextResponse.json({ log });
};
