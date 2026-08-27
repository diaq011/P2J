# v0_demo (Frontend + Flask Backend)

> 📌 **本目录是「J人模拟器」的应用源码。** 项目整体介绍、安装运行、截图与展示请看仓库根目录的
> **[README.md](../README.md)**（作品集展示页），工程细节见 [../LLM_ENGINEERING_NOTES.md](../LLM_ENGINEERING_NOTES.md)。
>
> 快速启动（推荐）：在 `v0_demo/backend/` 下 `cp run.local.env.example run.local.env` 填入
> `DEEPSEEK_API_KEY` 后运行 `python3 app.py`，访问 http://127.0.0.1:5001/ 。

## 目录结构
- `index.html` / `styles.css` / `app.js`: 前端页面（静态资源）
- `backend/app.py`: Flask API

## 启动后端（局域网可访问）
在 `v0_demo/backend` 目录运行：

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

默认监听：
- `APP_HOST=0.0.0.0`
- `APP_PORT=5000`

同一局域网设备访问地址：
- `http://<你的电脑IP>:5000/`

查询本机 IP（Windows）：
```powershell
ipconfig
```
查看当前网卡的 IPv4 地址（例如 `192.168.1.23`），然后在手机/平板浏览器访问：
`http://192.168.1.23:5000/`

## 环境变量

项目使用 DeepSeek API（OpenAI 兼容格式）。

### 必需环境变量

```powershell
set DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 可选环境变量

```powershell
set APP_HOST=0.0.0.0
set APP_PORT=5000
set DEEPSEEK_API_URL=https://api.deepseek.com/v1
set DEEPSEEK_MODEL=deepseek-chat
set DEEPSEEK_TIMEOUT_SEC=90
set AVAILABILITY_DEEPSEEK_MODEL=deepseek-chat
set P_TYPE_SLOW_MULTIPLIER=1.18
set ESTIMATE_PERCENTILE=p50
python app.py
```

### 配置文件方式（推荐：run.local.env）

后端启动时会由 `app.py::_load_local_env()` 自动读取本目录下的 `run.local.env`（已被 `.gitignore` 忽略）。
从模板复制并填入你的 key：

```bash
cp run.local.env.example run.local.env
# 然后编辑 run.local.env 填入 DEEPSEEK_API_KEY
```

模板中的键：`DEEPSEEK_API_KEY`、`DEEPSEEK_API_URL`、`DEEPSEEK_MODEL`、`AVAILABILITY_DEEPSEEK_MODEL`、`APP_PORT`。

## 已实现接口
- `GET /api/health`
- `GET /api/state`
- `POST /api/state/reset`
- `POST /api/tasks`
- `POST /api/plans/today`
- `POST /api/checkins`
