"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!password.trim()) {
      setMessage("请输入密码");
      return;
    }
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data?.error || "登录失败");
      return;
    }
    router.push("/");
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>登录</h1>
          <p>请输入密码继续</p>
        </div>
      </header>
      <main className={styles.card}>
        <div className={styles.formRow}>
          <label>密码</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={submit} disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </button>
          {message ? <span>{message}</span> : null}
        </div>
      </main>
    </div>
  );
}
