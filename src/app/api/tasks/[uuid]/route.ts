import { NextResponse } from "next/server";
import { deleteTaskAssets } from "@/lib/storage";

export const DELETE = async (
  _request: Request,
  context: { params: Promise<{ uuid: string }> }
) => {
  const { uuid } = await context.params;
  await deleteTaskAssets(uuid);
  return NextResponse.json({ ok: true });
};
