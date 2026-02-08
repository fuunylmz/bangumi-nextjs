"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import { TaskRecord } from "@/lib/types";

type CreateTaskPayload = {
  path: string;
  isAnime?: boolean | null;
  isMovie?: boolean | null;
};

type Props = {
  initialTasks: TaskRecord[];
};

export default function TaskClient({ initialTasks }: Props) {
  const [path, setPath] = useState("");
  const [animeMode, setAnimeMode] = useState("auto");
  const [movieMode, setMovieMode] = useState("auto");
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailContent, setDetailContent] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [tmdbDetail, setTmdbDetail] = useState<{
    title: string;
    originalTitle?: string;
    date?: string;
    overview?: string;
    genres?: string;
    posterPath?: string | null;
    tmdbUrl?: string;
  } | null>(null);
  const [showTmdbDetail, setShowTmdbDetail] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browsePath, setBrowsePath] = useState("");
  const [browseParent, setBrowseParent] = useState<string | null>(null);
  const [browseDirs, setBrowseDirs] = useState<
    { name: string; fullPath: string }[]
  >([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [drives, setDrives] = useState<string[]>([]);
  const [browsePage, setBrowsePage] = useState(1);
  const [browsePageSize] = useState(120);
  const [browseTotal, setBrowseTotal] = useState(0);

  const payload = useMemo<CreateTaskPayload>(() => {
    const isAnime =
      animeMode === "auto" ? null : animeMode === "yes" ? true : false;
    const isMovie =
      movieMode === "auto" ? null : movieMode === "yes" ? true : false;
    return { path, isAnime, isMovie };
  }, [path, animeMode, movieMode]);

  const loadTasks = async () => {
    const res = await fetch("/api/tasks", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as TaskRecord[];
    setTasks(data);
  };

  const loadBrowse = async (targetPath?: string, page = 1) => {
    setBrowseLoading(true);
    const queryParams = new URLSearchParams();
    if (targetPath) {
      queryParams.set("path", targetPath);
    }
    queryParams.set("page", String(page));
    queryParams.set("pageSize", String(browsePageSize));
    const query = `?${queryParams.toString()}`;
    const res = await fetch(`/api/fs${query}`, { cache: "no-store" });
    const data = await res.json();
    setBrowseLoading(false);
    if (!res.ok) {
      setMessage(data?.error || "无法读取目录");
      return;
    }
    setBrowsePath(data.current);
    setBrowseParent(data.parent);
    setBrowseDirs(data.dirs);
    setBrowsePage(data.page || page);
    setBrowseTotal(data.total || 0);
  };

  const loadDrives = async () => {
    const res = await fetch("/api/fs/drives", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return;
    setDrives(data.drives || []);
  };

  const submitTask = async () => {
    if (!payload.path.trim()) {
      setMessage("路径不能为空");
      return;
    }
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data?.error || "提交失败");
      return;
    }
    setMessage("任务已提交");
    setPath("");
    await loadTasks();
  };

  const retryTask = async (task: TaskRecord) => {
    setLoading(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: task.path,
        isAnime: task.isAnime ?? null,
        isMovie: task.isMovie ?? null,
      }),
    });
    await res.json();
    setLoading(false);
    await loadTasks();
  };

  const deleteTask = async (uuid: string) => {
    await fetch(`/api/tasks/${uuid}`, { method: "DELETE" });
    await loadTasks();
  };

  const viewRecord = async (uuid: string) => {
    const res = await fetch(`/api/tasks/${uuid}/record`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setDetailTitle("映射记录");
      setDetailContent(data?.error || "未找到映射记录");
      setShowDetail(true);
      return;
    }
    setDetailTitle("映射记录");
    setDetailContent(JSON.stringify(data, null, 2));
    setShowDetail(true);
  };

  const viewLog = async (uuid: string) => {
    const res = await fetch(`/api/tasks/${uuid}/log`, { cache: "no-store" });
    const data = await res.json();
    setDetailTitle("任务日志");
    setDetailContent(data?.log || "暂无日志");
    setShowDetail(true);
  };

  const viewTmdb = async (task: TaskRecord) => {
    if (!task.tmdbId || !task.tmdbType) {
      setDetailTitle("TMDB 详情");
      setDetailContent("暂无 TMDB 关联信息");
      setShowDetail(true);
      return;
    }
    const res = await fetch(`/api/tmdb/${task.tmdbType}/${task.tmdbId}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      setDetailTitle("TMDB 详情");
      setDetailContent(data?.error || "未获取到详情");
      setShowDetail(true);
      return;
    }
    const title = data.title || data.name || task.name || "-";
    const originalTitle = data.original_title || data.original_name;
    const date = data.release_date || data.first_air_date;
    const overview = data.overview;
    const genres = Array.isArray(data.genres)
      ? data.genres.map((g: { name: string }) => g.name).join(" / ")
      : "";
    const posterPath = data.poster_path
      ? `https://image.tmdb.org/t/p/w342${data.poster_path}`
      : null;
    const tmdbUrl = `https://www.themoviedb.org/${task.tmdbType}/${task.tmdbId}`;
    setTmdbDetail({
      title,
      originalTitle,
      date,
      overview,
      genres,
      posterPath,
      tmdbUrl,
    });
    setShowTmdbDetail(true);
  };

  const openPicker = async () => {
    setMessage("");
    await loadDrives();
    await loadBrowse(path || undefined, 1);
    setBrowseOpen(true);
  };

  const choosePath = () => {
    setPath(browsePath);
    setBrowseOpen(false);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>番剧自动重命名</h1>
          <p>基于 TMDB 的批量整理与命名</p>
        </div>
        <nav className={styles.nav}>
          <Link href="/config">配置</Link>
          <button type="button" onClick={loadTasks}>
            刷新
          </button>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <h2>添加任务</h2>
          <div className={styles.formRow}>
            <label htmlFor="path">路径</label>
            <div className={styles.pathInput}>
              <input
                id="path"
                value={path}
                onChange={(event) => setPath(event.target.value)}
                placeholder="输入文件或文件夹路径"
              />
              <button type="button" onClick={openPicker}>
                选择
              </button>
            </div>
          </div>
          <div className={styles.formRow}>
            <label>动画</label>
            <select
              value={animeMode}
              onChange={(event) => setAnimeMode(event.target.value)}
            >
              <option value="auto">自动</option>
              <option value="yes">是</option>
              <option value="no">否</option>
            </select>
          </div>
          <div className={styles.formRow}>
            <label>电影</label>
            <select
              value={movieMode}
              onChange={(event) => setMovieMode(event.target.value)}
            >
              <option value="auto">自动</option>
              <option value="yes">是</option>
              <option value="no">否</option>
            </select>
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={submitTask} disabled={loading}>
              {loading ? "处理中..." : "提交任务"}
            </button>
            {message ? <span className={styles.message}>{message}</span> : null}
          </div>
        </section>

        <section className={styles.card}>
          <h2>任务记录</h2>
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>名称</span>
              <span>路径</span>
              <span>季</span>
              <span>类型</span>
              <span>状态</span>
              <span>操作</span>
            </div>
            {tasks.length === 0 ? (
              <div className={styles.tableEmpty}>暂无任务</div>
            ) : (
              tasks.map((task) => (
                <div key={task.uuid} className={styles.tableRow}>
                  <button
                    type="button"
                    className={styles.nameLink}
                    onClick={() => viewTmdb(task)}
                  >
                    {task.name || "-"}
                  </button>
                  <span title={task.path}>{task.path}</span>
                  <span>{task.seasonId ?? "-"}</span>
                  <span>
                    {task.isMovie
                      ? "电影"
                      : task.isAnime
                      ? "动画"
                      : "剧集"}
                  </span>
                  <span>{task.error ? "失败" : "完成"}</span>
                  <span className={styles.rowActions}>
                    <button type="button" onClick={() => retryTask(task)}>
                      重试
                    </button>
                    <button type="button" onClick={() => viewRecord(task.uuid)}>
                      映射
                    </button>
                    <button type="button" onClick={() => viewLog(task.uuid)}>
                      日志
                    </button>
                    <button type="button" onClick={() => deleteTask(task.uuid)}>
                      删除
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
      {showDetail ? (
        <div className={styles.detailOverlay}>
          <div className={styles.detailCard}>
            <div className={styles.detailHeader}>
              <h3>{detailTitle}</h3>
              <button type="button" onClick={() => setShowDetail(false)}>
                关闭
              </button>
            </div>
            <pre className={styles.detailContent}>{detailContent}</pre>
          </div>
        </div>
      ) : null}
      {showTmdbDetail && tmdbDetail ? (
        <div className={styles.detailOverlay}>
          <div className={styles.tmdbCard}>
            <div className={styles.detailHeader}>
              <h3>TMDB 详情</h3>
              <button type="button" onClick={() => setShowTmdbDetail(false)}>
                关闭
              </button>
            </div>
            <div className={styles.tmdbBody}>
              {tmdbDetail.posterPath ? (
                <Image
                  src={tmdbDetail.posterPath}
                  alt={tmdbDetail.title}
                  className={styles.tmdbPoster}
                  width={342}
                  height={513}
                />
              ) : null}
              <div className={styles.tmdbInfo}>
                <div className={styles.tmdbTitle}>{tmdbDetail.title}</div>
                {tmdbDetail.originalTitle ? (
                  <div className={styles.tmdbSubtitle}>
                    {tmdbDetail.originalTitle}
                  </div>
                ) : null}
                <div className={styles.tmdbMeta}>
                  {tmdbDetail.date ? <span>{tmdbDetail.date}</span> : null}
                  {tmdbDetail.genres ? <span>{tmdbDetail.genres}</span> : null}
                </div>
                {tmdbDetail.overview ? (
                  <p className={styles.tmdbOverview}>{tmdbDetail.overview}</p>
                ) : null}
                {tmdbDetail.tmdbUrl ? (
                  <a
                    className={styles.tmdbLink}
                    href={tmdbDetail.tmdbUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    在 TMDB 查看
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {browseOpen ? (
        <div className={styles.detailOverlay}>
          <div className={styles.browseCard}>
            <div className={styles.detailHeader}>
              <h3>选择路径</h3>
              <button type="button" onClick={() => setBrowseOpen(false)}>
                关闭
              </button>
            </div>
            <div className={styles.browsePath}>{browsePath}</div>
            <div className={styles.browseToolbar}>
              <div className={styles.driveRow}>
                {drives.map((drive) => (
                  <button
                    key={drive}
                    type="button"
                    onClick={() => loadBrowse(drive, 1)}
                  >
                    {drive}
                  </button>
                ))}
              </div>
              <div className={styles.browseActions}>
                <button type="button" onClick={choosePath}>
                  使用当前目录
                </button>
                {browseParent ? (
                  <button
                    type="button"
                    onClick={() => loadBrowse(browseParent, 1)}
                  >
                    返回上级
                  </button>
                ) : null}
              </div>
              <div className={styles.browseMeta}>
                <span>
                  共 {browseTotal} 个目录 · 第 {browsePage} 页
                </span>
                <div className={styles.browsePager}>
                  <button
                    type="button"
                    disabled={browsePage <= 1}
                    onClick={() => loadBrowse(browsePath, browsePage - 1)}
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    disabled={browsePage * browsePageSize >= browseTotal}
                    onClick={() => loadBrowse(browsePath, browsePage + 1)}
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
            {browseLoading ? (
              <div className={styles.tableEmpty}>读取中...</div>
            ) : (
              <div className={styles.browseList}>
                {browseDirs.length === 0 ? (
                  <div className={styles.tableEmpty}>暂无子目录</div>
                ) : (
                  browseDirs.map((dir) => (
                    <button
                      key={dir.fullPath}
                      type="button"
                      onClick={() => loadBrowse(dir.fullPath, 1)}
                    >
                      {dir.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
