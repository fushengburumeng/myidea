AI 引擎逻辑与环境整改指令 (Prompt)
目标： 修复围棋 (KataGo) 和象棋 (Pikafish) 引擎在 Docker 环境下的启动超时、配置冲突以及响应不更新到前端的 Bug。

1. 基础环境调整 (Dockerfile)
镜像升级：将基础镜像从 node:18-bullseye-slim 升级为 node:18-bookworm-slim，以支持 GLIBC 2.34+。

补全依赖：确保 apt-get install 列表中包含：libzip4, libgomp1, libatomic1, wget, ca-certificates。

权限修复：在 Dockerfile 末尾添加 RUN chmod -R 777 /app，确保日志目录 gtp_logs 可以正常写入。

2. 围棋引擎配置整改 (katago/config.cfg)
规则冲突修复：删除所有独立的 koRule, scoringRule 等条目，仅保留 rules = chinese。

性能优化：将 maxVisits 初始设定为 100（若 CPU 较弱可调至 50），numSearchThreads 设定为 1 或 2。

参数补全：必须显式添加 logAllGTPCommunication = false。

3. 适配器逻辑优化 (katago-adapter.js & pikafish-adapter.js)
超时时间重设 (核心修复)：

将所有命令（尤其是 genmove 和 go depth）的 Timeout 阈值从目前的几秒钟统一延长至 60,000ms (60秒)。

理由：日志显示 KataGo 在第 11 秒返回结果，但适配器在第 10 秒就抛出了超时异常，导致有效坐标 D4 被丢弃。

异常处理：在写入 stdin 之前，必须检查 this.engineProcess.stdin.writable 是否为 true，防止出现 EPIPE 错误。

4. 象棋响应 Bug 修复 (pikafish-adapter.js)
坐标解析适配：

问题描述：日志显示 [EngineManager] Pikafish响应: h9g7，这说明后端已经拿到了坐标。

整改要求：检查 pikafish-adapter.js 拿到 bestmove 后的 emit 事件或 callback 函数。确保返回的数据格式与前端 Chessboard 组件要求的格式一致（例如：是直接返回 h9g7 还是需要包装成 { move: 'h9g7' }）。

WebSocket 同步：确保 EngineManager 拿到响应后，调用了正确的发送函数（如 io.emit 或 res.json）将结果推送到客户端。

5. 状态管理修复
防止空闲关闭：调大或暂时关闭 [EngineManager] 中的“空闲关闭引擎”逻辑。

理由：日志中频繁出现 关闭空闲的KataGo，可能是在 AI 还在思考时，管理逻辑误判其为空闲并杀死了进程。
针对 Pikafish 的响应同步 Bug：

确认后端在收到 bestmove 后，不仅要向前端推送该坐标，还要同步更新系统内存中的棋局 FEN 状态。

检查 h9g7 是否被正确解析为前端象棋组件（如 xiangqi.js 或自定义组件）可识别的 JSON 格式。

修复前端监听逻辑：确保在收到 AI 的 bestmove 响应后，网页端能触发棋子的平滑移动动画，并解锁玩家的落子权限。