# Bangumi Next.js 自动重命名
MADE BY GPT5-CODEX 
面向番剧/电视剧/电影整理的自动重命名工具，支持 TMDB 搜索与详情展示、字幕同名、qBittorrent 回调触发、LLM 标题解析等能力。

## 功能概览

- 目录浏览与路径选择
- TMDB 搜索匹配与详情弹窗
- 视频与字幕文件同名处理
- SXXEXX 命名格式输出
- qBittorrent 回调自动整理
- LLM 标题解析与日志记录
- 可选登录保护

## 环境要求

- Node.js 18+
- npm / pnpm / yarn 任意一种

## 快速开始

```bash
npm install
npm run dev
```

访问 http://localhost:3000

配置入口：http://localhost:3000/config

## 生产部署

```bash
npm install
npm run build
npm run start -- -p 3000
```

### systemd 后台运行示例

```bash
sudo tee /etc/systemd/system/bangumi-nextjs.service >/dev/null <<'EOF'
[Unit]
Description=Bangumi Next.js
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/bangumi-nextjs
ExecStart=/usr/bin/npm run start -- -p 3000
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now bangumi-nextjs
```

## 配置说明

配置文件自动保存到 data/config.json，也可在页面 /config 修改。

核心配置项：

- TMDB API Key
- 电视剧/电影/动漫输出路径
- 模式：链接 / 复制 / 移动
- AI 解析开关与模型参数
- 登录开关与登录密码

## qBittorrent 回调

接口：/api/qb  
方法：GET 或 POST  
参数：path（内容路径），可选 isAnime/isMovie

示例：

```bash
curl "http://localhost:3000/api/qb?path=/downloads/xxx&isAnime=true"
```
