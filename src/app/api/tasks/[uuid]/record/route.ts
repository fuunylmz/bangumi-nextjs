import { NextResponse } from "next/server";
import { readTaskMapping } from "@/lib/storage";

export const GET = async (
  _request: Request,
  context: { params: Promise<{ uuid: string }> }
) => {
  const { uuid } = await context.params;
  const mapping = await readTaskMapping(uuid);
  if (!mapping) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  return NextResponse.json(mapping);
};
