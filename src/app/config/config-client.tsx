"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./styles.module.css";
import { AppConfig } from "@/lib/types";

type Props = {
  initialConfig: AppConfig;
};

export default function ConfigClient({ initialConfig }: Props) {
  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (key: keyof AppConfig, value: string) => {
    if (key === "aiEnabled" || key === "aiAutoSave") {
      setConfig((prev) => ({ ...prev, [key]: value === "true" }));
      return;
    }
    if (key === "aiTemperature" || key === "geminiTemperature") {
      const num = Number(value);
      setConfig((prev) => ({ ...prev, [key]: Number.isNaN(num) ? 0 : num }));
      return;
    }
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const saveConfig = async () => {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data?.error || "保存失败");
      return;
    }
    setMessage("配置已保存");
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>配置</h1>
          <p>设置 TMDB 密钥与整理路径</p>
        </div>
        <Link href="/">返回任务</Link>
      </header>
      <main className={styles.card}>
        <h2 className={styles.sectionTitle}>基础配置</h2>
        <div className={styles.formRow}>
          <label>TMDB API</label>
          <input
            value={config.apiKey}
            onChange={(event) => updateField("apiKey", event.target.value)}
            placeholder="输入 TMDB API Key"
          />
        </div>
        <div className={styles.formRow}>
          <label>电视剧路径</label>
          <input
            value={config.bangumiPath}
            onChange={(event) => updateField("bangumiPath", event.target.value)}
          />
        </div>
        <div className={styles.formRow}>
          <label>电影路径</label>
          <input
            value={config.moviePath}
            onChange={(event) => updateField("moviePath", event.target.value)}
          />
        </div>
        <div className={styles.formRow}>
          <label>动漫路径</label>
          <input
            value={config.animePath}
            onChange={(event) => updateField("animePath", event.target.value)}
          />
        </div>
        <div className={styles.formRow}>
          <label>动漫电影</label>
          <input
            value={config.animeMoviePath}
            onChange={(event) =>
              updateField("animeMoviePath", event.target.value)
            }
          />
        </div>
        <div className={styles.formRow}>
          <label>模式</label>
          <select
            value={config.mode}
            onChange={(event) =>
              updateField("mode", event.target.value as AppConfig["mode"])
            }
          >
            <option value="链接">链接</option>
            <option value="复制">复制</option>
            <option value="剪切">剪切</option>
          </select>
        </div>
        <h2 className={styles.sectionTitle}>AI 配置</h2>
        <div className={styles.formRow}>
          <label>启用 AI</label>
          <select
            value={config.aiEnabled ? "true" : "false"}
            onChange={(event) => updateField("aiEnabled", event.target.value)}
          >
            <option value="true">启用</option>
            <option value="false">禁用</option>
          </select>
        </div>
        <div className={styles.formRow}>
          <label>自动保存</label>
          <select
            value={config.aiAutoSave ? "true" : "false"}
            onChange={(event) => updateField("aiAutoSave", event.target.value)}
          >
            <option value="true">启用</option>
            <option value="false">禁用</option>
          </select>
        </div>
        <div className={styles.formRow}>
          <label>AI 提供商</label>
          <select
            value={config.aiProvider}
            onChange={(event) =>
              updateField("aiProvider", event.target.value as AppConfig["aiProvider"])
            }
          >
            <option value="openai">openai</option>
            <option value="gemini">gemini</option>
          </select>
        </div>
        <div className={styles.formRow}>
          <label>置信度</label>
          <select
            value={config.aiConfidenceThreshold}
            onChange={(event) =>
              updateField(
                "aiConfidenceThreshold",
                event.target.value as AppConfig["aiConfidenceThreshold"]
              )
            }
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div className={styles.formRow}>
          <label>OpenAI 输出</label>
          <select
            value={config.openaiOutputFormat}
            onChange={(event) =>
              updateField(
                "openaiOutputFormat",
                event.target.value as AppConfig["openaiOutputFormat"]
              )
            }
          >
            <option value="function_calling">function_calling</option>
            <option value="json_object">json_object</option>
            <option value="structured_output">structured_output</option>
            <option value="text">text</option>
          </select>
        </div>
        <div className={styles.formRow}>
          <label>OpenAI Key</label>
          <input
            value={config.aiApiKey}
            onChange={(event) => updateField("aiApiKey", event.target.value)}
          />
        </div>
        <div className={styles.formRow}>
          <label>OpenAI Base</label>
          <input
            value={config.aiBaseUrl}
            onChange={(event) => updateField("aiBaseUrl", event.target.value)}
          />
        </div>
        <div className={styles.formRow}>
          <label>OpenAI 模型</label>
          <input
            value={config.aiModel}
            onChange={(event) => updateField("aiModel", event.target.value)}
          />
        </div>
        <div className={styles.formRow}>
          <label>OpenAI 温度</label>
          <input
            type="number"
            value={config.aiTemperature}
            onChange={(event) => updateField("aiTemperature", event.target.value)}
          />
        </div>
        <div className={styles.formRow}>
          <label>Gemini Key</label>
          <input
            value={config.geminiApiKey}
            onChange={(event) => updateField("geminiApiKey", event.target.value)}
          />
        </div>
        <div className={styles.formRow}>
          <label>Gemini Base</label>
          <input
            value={config.geminiBaseUrl}
            onChange={(event) => updateField("geminiBaseUrl", event.target.value)}
          />
        </div>
        <div className={styles.formRow}>
          <label>Gemini 模型</label>
          <input
            value={config.geminiModel}
            onChange={(event) => updateField("geminiModel", event.target.value)}
          />
        </div>
        <div className={styles.formRow}>
          <label>Gemini 温度</label>
          <input
            type="number"
            value={config.geminiTemperature}
            onChange={(event) =>
              updateField("geminiTemperature", event.target.value)
            }
          />
        </div>
        <h2 className={styles.sectionTitle}>日志</h2>
        <div className={styles.formRow}>
          <label>日志等级</label>
          <select
            value={config.logLevel}
            onChange={(event) =>
              updateField("logLevel", event.target.value as AppConfig["logLevel"])
            }
          >
            <option value="DEBUG">DEBUG</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={saveConfig} disabled={loading}>
            {loading ? "保存中..." : "保存配置"}
          </button>
          {message ? <span>{message}</span> : null}
        </div>
      </main>
    </div>
  );
}
