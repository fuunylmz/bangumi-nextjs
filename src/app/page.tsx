import { readConfig, readTaskRecords } from "@/lib/storage";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieName, validateAuth } from "@/lib/auth";
import TaskClient from "./task-client";

export default async function Home() {
  const config = await readConfig();
  const cookieStore = await cookies();
  if (!validateAuth(config, cookieStore.get(authCookieName)?.value ?? null)) {
    redirect("/login");
  }
  const tasks = await readTaskRecords();
  return <TaskClient initialTasks={tasks} />;
}
