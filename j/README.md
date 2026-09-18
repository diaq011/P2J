# j （Frontend + Flask Backend）

> 📌 **本目录是「J人模拟器」的应用源码。**（旧名 `v0_demo/` 已废弃）  
> 项目整体介绍、安装运行、截图与展示请看仓库根目录的
> **[README.md](../README.md)**，工程细节见 [../LLM_ENGINEERING_NOTES.md](../LLM_ENGINEERING_NOTES.md)。
>
> 快速启动：在 `j/backend/` 下 `cp run.local.env.example run.local.env`，填入
> `DEEPSEEK_API_KEY` 后运行 `python3 app.py`，访问 http://127.0.0.1:5001/ 。

## 目录结构
- `index.html` / `styles.css` / `app.js`: 前端页面（静态资源）
- `backend/app.py`: Flask API

## 启动后端（局域网可访问）
在 `j/backend` 目录运行：

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .\.venv\Scripts\activate
pip install -r requirements.txt
cp run.local.env.example run.local.env
# 编辑 run.local.env，填入 DEEPSEEK_API_KEY
python3 app.py
```

默认监听：
- `APP_HOST=0.0.0.0`
- `APP_PORT=5001`（见 `run.local.env.example`；可用环境变量覆盖）

同一局域网设备访问：`http://<服务器IP>:<端口>/`

## 环境变量

项目使用 DeepSeek API（OpenAI 兼容格式）。**仓库不包含真实 API Key**，部署时必须自行配置。

### 必需

```bash
export DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

或写入 `run.local.env`（已被 `.gitignore` 忽略，勿提交真实值）。

申请地址：[DeepSeek 开放平台](https://platform.deepseek.com/)

### 可选

```bash
export APP_HOST=0.0.0.0
export APP_PORT=5001
export DEEPSEEK_API_URL=https://api.deepseek.com/v1
export DEEPSEEK_MODEL=deepseek-chat
export DEEPSEEK_TIMEOUT_SEC=90
export AVAILABILITY_DEEPSEEK_MODEL=deepseek-chat
```

模板文件：`backend/run.local.env.example`

## 已实现接口
- `GET /api/health`
- `GET /api/state`
- `POST /api/state/reset`
- `POST /api/tasks`
- `POST /api/plans/today`
- `POST /api/checkins`
