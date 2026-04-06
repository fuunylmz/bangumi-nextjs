import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/storage";
import { authCookieName, validateAuth } from "@/lib/auth";

export const GET = async (request: NextRequest) => {
  const config = await readConfig();
  if (
    !validateAuth(config, request.cookies.get(authCookieName)?.value ?? null)
  ) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const url = new URL(request.url);
  const protocol = url.searchParams.get("protocol") || "openai";
  const baseUrl = (url.searchParams.get("baseUrl") || "").replace(/\/$/, "");
  const apiKey = url.searchParams.get("apiKey") || "";

  if (!baseUrl) {
    return NextResponse.json(
      { error: "Base URL 不能为空" },
      { status: 400 }
    );
  }

  try {
    if (protocol === "gemini") {
      const modelsUrl = `${baseUrl}/v1beta/models?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(modelsUrl, {
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json(
          {
            error: `获取模型列表失败 (${response.status}): ${text.slice(0, 300)}`,
          },
          { status: response.status }
        );
      }
      const data = await response.json();
      const models = Array.isArray(data?.models)
        ? data.models
            .map(
              (m: { name?: string; displayName?: string }) =>
                m.name?.replace(/^models\//, "") || ""
            )
            .filter((id: string) => id.length > 0)
            .sort()
        : [];
      return NextResponse.json({ models });
    }

    // OpenAI 兼容协议
    const modelsUrl = `${baseUrl}/models`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    const response = await fetch(modelsUrl, { headers });
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        {
          error: `获取模型列表失败 (${response.status}): ${text.slice(0, 300)}`,
        },
        { status: response.status }
      );
    }
    const data = await response.json();
    const models = Array.isArray(data?.data)
      ? data.data
          .map((m: { id?: string }) => m.id || "")
          .filter((id: string) => id.length > 0)
          .sort()
      : [];
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      { error: `请求失败: ${(error as Error).message}` },
      { status: 500 }
    );
  }
};
