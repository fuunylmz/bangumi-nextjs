import { createHash } from "node:crypto";
import { AppConfig } from "./types";

export const authCookieName = "bangumi_auth";

export const hashPassword = (password: string) =>
  createHash("sha256").update(password).digest("hex");

export const isAuthEnabled = (config: AppConfig) =>
  Boolean(config.authEnabled && config.authPassword);

export const validateAuth = (
  config: AppConfig,
  cookieValue?: string | null
) => {
  if (!isAuthEnabled(config)) return true;
  if (!cookieValue) return false;
  return cookieValue === hashPassword(config.authPassword);
};
