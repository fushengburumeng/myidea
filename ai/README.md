# AI引擎模块说明

本目录包含所有AI引擎相关的代码和配置。

## 目录结构

```
ai/
├── bin/                     # AI引擎可执行文件（不提交到git）
│   ├── katago/
│   │   ├── katago          # KataGo可执行文件（Linux）
│   │   ├── katago.exe      # KataGo可执行文件（Windows）
│   │   ├── b6.bin.gz       # 神经网络模型文件
│   │   └── config.cfg      # KataGo配置文件
│   └── pikafish/
│       ├── pikafish        # Pikafish可执行文件（Linux）
│       └── pikafish.exe    # Pikafish可执行文件（Windows）
├── engine-manager.js        # 引擎管理器（Worker池管理）
├── worker-pool.js           # Worker线程池实现
├── katago-adapter.js        # KataGo适配器（GTP协议）
├── pikafish-adapter.js      # Pikafish适配器（UCI协议）
├── katago-worker.js         # KataGo Worker线程
├── pikafish-worker.js       # Pikafish Worker线程
└── README.md                # 本文档
```

## 架构设计

### Worker线程池架构

```
┌─────────────────────────────────────────────────┐
│           Engine Manager                        │
│  ┌──────────────────┐  ┌──────────────────┐   │
│  │  KataGo Pool     │  │  Pikafish Pool   │   │
│  │  (3 Workers)     │  │  (3 Workers)     │   │
│  └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│ KataGo Worker 1 │      │ Pikafish Worker │
│ KataGo Worker 2 │      │ Pikafish Worker │
│ KataGo Worker 3 │      │ Pikafish Worker │
└─────────────────┘      └─────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│ KataGo Process  │      │ Pikafish Process│
│ (GTP Protocol)  │      │ (UCI Protocol)  │
└─────────────────┘      └─────────────────┘
```

### 关键设计

1. **Worker线程池**：每个引擎维护3个Worker，避免进程启动开销
2. **请求队列**：池满时自动排队，防止过载
3. **自动回退**：服务端AI失败时前端自动使用本地AI
4. **协议适配**：KataGo使用GTP协议，Pikafish使用UCI协议

## 文件说明

### 核心模块

#### engine-manager.js
**职责**：AI引擎管理器，统一管理所有AI引擎

**功能**：
- 初始化Worker线程池
- 检查引擎文件是否存在
- 分发AI请求到对应的Worker池
- 处理引擎错误和超时

**API**：
```javascript
const engineManager = require('./ai/engine-manager');

// 围棋AI请求
const move = await engineManager.getWeiqiMove({
  boardSize: 19,
  moves: ['D4', 'Q16', ...]
});

// 象棋AI请求
const move = await engineManager.getChessMove({
  fen: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR'
});
```

#### worker-pool.js
**职责**：Worker线程池管理器

**功能**：
- 创建和管理Worker线程
- 任务分配和负载均衡
- Worker生命周期管理
- 错误处理和重启

**特性**：
- 固定大小线程池（3个Worker）
- 自动任务队列
- Worker健康检查
- 超时控制

#### katago-adapter.js
**职责**：KataGo引擎适配器（GTP协议）

**功能**：
- 启动KataGo进程
- GTP协议通信
- 棋盘状态管理
- 着法解析

**配置**：
- 超时时间：60秒
- 搜索次数：100次（可在config.cfg调整）
- 线程数：1（可在config.cfg调整）

#### pikafish-adapter.js
**职责**：Pikafish引擎适配器（UCI协议）

**功能**：
- 启动Pikafish进程
- UCI协议通信
- FEN状态管理
- 着法解析

**配置**：
- 超时时间：60秒
- 搜索深度：10（可在代码中调整）

### Worker线程

#### katago-worker.js
KataGo Worker线程实现，处理围棋AI请求

#### pikafish-worker.js
Pikafish Worker线程实现，处理象棋AI请求

## AI引擎下载

### 自动下载（推荐）

```bash
# 从项目根目录执行
./scripts/deployment/download-engines.sh
```

### 手动下载

#### KataGo（围棋引擎）

**可执行文件**：
- Linux: https://github.com/lightvector/KataGo/releases/download/v1.15.3/katago-v1.15.3-eigenavx2-linux-x64.zip
- Windows: https://github.com/lightvector/KataGo/releases/download/v1.15.3/katago-v1.15.3-eigenavx2-windows-x64.zip

**神经网络模型**：
- b6.bin.gz: https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz

**安装步骤**：
```bash
cd ai/bin/katago
wget <katago-url>
unzip katago-*.zip
chmod +x katago
wget <model-url> -O b6.bin.gz
```

#### Pikafish（中国象棋引擎）

**可执行文件**：
- Linux: https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-avx2
- Windows: https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-avx2.exe

**安装步骤**：
```bash
cd ai/bin/pikafish
wget <pikafish-url> -O pikafish
chmod +x pikafish
```

## 配置调优

### KataGo性能调优

编辑 `ai/bin/katago/config.cfg`：

```cfg
# 搜索次数（影响棋力和速度）
maxVisits = 100          # 50(快速) / 100(平衡) / 200(强力)

# 线程数
numSearchThreads = 1     # 1-2（根据CPU核心数）

# 规则
rules = chinese          # chinese/japanese/tromp-taylor
```

### Pikafish性能调优

编辑 `ai/pikafish-adapter.js`：

```javascript
async getMove(fen, depth = 10) {  // 搜索深度：8-12
  // depth越大，棋力越强，但速度越慢
}
```

## 性能指标

| 引擎 | 棋力水平 | 响应时间 | 内存占用 |
|------|----------|----------|----------|
| KataGo | 业余高段 | 2-5秒 | ~400MB |
| Pikafish | 专业级 | <1秒 | ~200MB |

## 故障排查

### 引擎文件不存在

**症状**：服务器启动时提示"KataGo引擎文件不存在"

**解决**：
```bash
./scripts/deployment/download-engines.sh
```

### 引擎无执行权限

**症状**：Docker日志显示"Permission denied"

**解决**：
```bash
chmod +x ai/bin/katago/katago
chmod +x ai/bin/pikafish/pikafish
```

### Worker池已满

**症状**：前端收到"POOL_FULL"错误

**解决**：
- 等待当前请求完成
- 或增加Worker池大小（修改worker-pool.js中的poolSize）

### 引擎超时

**症状**：60秒后返回超时错误

**解决**：
- 降低搜索深度/次数
- 增加超时时间（修改adapter中的timeout）
- 检查CPU资源是否充足

## 开发指南

### 添加新AI引擎

1. 创建适配器：`{engine}-adapter.js`
2. 创建Worker：`{engine}-worker.js`
3. 在 `engine-manager.js` 注册引擎
4. 更新本文档

### 测试AI引擎

```bash
# 测试KataGo
./ai/bin/katago/katago version

# 测试Pikafish
echo "quit" | ./ai/bin/pikafish/pikafish
```

### 调试Worker

在 `engine-manager.js` 中启用调试日志：
```javascript
console.log('[EngineManager] Worker状态:', workerInfo);
```

## 相关文档

- [项目规范](../PROJECT_STRUCTURE.md)
- [Docker部署](../docs/guides/DOCKER_DEPLOYMENT.md)
- [故障排查](../docs/guides/DOCKER_TROUBLESHOOTING.md)

---

**最后更新**: 2026-01-20
