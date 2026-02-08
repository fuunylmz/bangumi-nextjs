import { readTaskRecords } from "@/lib/storage";
import TaskClient from "./task-client";

export default async function Home() {
  const tasks = await readTaskRecords();
  return <TaskClient initialTasks={tasks} />;
}
