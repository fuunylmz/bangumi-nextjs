import { readConfig } from "@/lib/storage";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieName, validateAuth } from "@/lib/auth";
import ConfigClient from "./config-client";

export default async function ConfigPage() {
  const config = await readConfig();
  const cookieStore = await cookies();
  if (!validateAuth(config, cookieStore.get(authCookieName)?.value ?? null)) {
    redirect("/login");
  }
  return (
    <ConfigClient
      initialConfig={{ ...config, authPassword: "", qbToken: "" }}
    />
  );
}
