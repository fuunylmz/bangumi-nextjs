import { readConfig } from "@/lib/storage";
import ConfigClient from "./config-client";

export default async function ConfigPage() {
  const config = await readConfig();
  return <ConfigClient initialConfig={config} />;
}
