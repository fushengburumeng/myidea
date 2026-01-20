# 项目结构规范

本文档定义了项目的文件组织规范，所有开发者必须遵守。

## 📁 目录结构

```
weiqi/
├── ai/                          # AI引擎模块
│   ├── bin/                     # AI引擎可执行文件（不提交到git）
│   │   ├── katago/             # KataGo引擎及配置
│   │   └── pikafish/           # Pikafish引擎
│   ├── engine-manager.js        # 引擎管理器
│   ├── worker-pool.js           # Worker线程池
│   ├── katago-adapter.js        # KataGo适配器
│   ├── pikafish-adapter.js      # Pikafish适配器
│   ├── katago-worker.js         # KataGo Worker
│   ├── pikafish-worker.js       # Pikafish Worker
│   └── README.md                # AI引擎说明文档
│
├── docker/                      # Docker配置文件
│   ├── Dockerfile               # 标准构建（下载引擎）
│   ├── Dockerfile.local         # 本地构建（使用本地引擎）
│   ├── Dockerfile.mirror        # 镜像源构建
│   ├── docker-compose.yml       # 标准compose配置
│   ├── docker-compose.local.yml # 本地compose配置
│   └── .dockerignore            # Docker忽略文件
│
├── docs/                        # 项目文档
│   ├── README.md                # 主文档（项目介绍）
│   ├── CLAUDE.md                # Claude Code指南
│   ├── guides/                  # 使用指南
│   │   ├── QUICK_START.md      # 快速开始
│   │   ├── DEPLOYMENT.md       # 部署指南
│   │   ├── DOCKER_DEPLOYMENT.md # Docker部署详细指南
│   │   ├── DOCKER_TROUBLESHOOTING.md # Docker故障排查
│   │   ├── SERVER_GUIDE.md     # 服务器配置指南
│   │   └── README_DOCKER.md    # Docker快速指南
│   └── reports/                 # 技术报告和修复记录
│       ├── AI_IMPLEMENTATION.md # AI实现方案
│       ├── SUMMARY.md          # 项目总结
│       └── *.md                # 各种修复报告
│
├── legacy/                      # 废弃代码（保留参考）
│   ├── index.html              # 旧版单机围棋页面
│   ├── style.css               # 旧版样式
│   └── js/                     # 旧版JS代码
│       ├── ai.js
│       ├── board.js
│       ├── game.js
│       └── ui.js
│
├── public/                      # 前端代码（静态资源）
│   ├── index.html              # 游戏大厅入口
│   ├── css/                    # 样式文件
│   │   └── common.css
│   ├── js/                     # 公共JS
│   │   └── lobby.js            # 大厅逻辑
│   └── games/                  # 游戏模块
│       ├── weiqi/              # 围棋
│       │   ├── index.html
│       │   └── game.js
│       ├── gomoku/             # 五子棋
│       ├── chess/              # 中国象棋
│       └── doudizhu/           # 斗地主
│
├── scripts/                     # 脚本工具
│   ├── deployment/             # 部署脚本
│   │   ├── deploy.sh           # 一键部署
│   │   ├── deploy-fix.sh       # 修复部署
│   │   ├── download-engines.sh # 下载AI引擎
│   │   ├── download-ai-engines.sh # 备用下载脚本
│   │   └── fix-engines.sh      # 修复引擎
│   └── maintenance/            # 维护脚本
│       ├── debug-docker.sh     # Docker调试
│       ├── update.sh           # 更新脚本
│       ├── verify-deployment.sh # 验证部署
│       ├── start.sh            # 启动脚本（Linux）
│       └── start.bat           # 启动脚本（Windows）
│
├── server.js                    # 主服务器文件
├── package.json                 # Node.js依赖配置
├── package-lock.json            # 依赖锁定文件
├── .gitignore                   # Git忽略配置
└── PROJECT_STRUCTURE.md         # 本文档
```

## 📋 文件组织规则

### 1. 核心原则

- **单一职责**：每个目录只负责一类文件
- **清晰分层**：代码、文档、配置、脚本分离
- **易于查找**：按功能和类型组织，命名清晰
- **版本控制**：区分提交和不提交的文件

### 2. 目录职责

#### `ai/` - AI引擎模块
- **用途**：所有AI引擎相关代码
- **规则**：
  - 适配器代码放在根目录
  - 可执行文件放在 `bin/` 子目录
  - `bin/` 目录不提交到git（在.gitignore中）
  - 必须包含README.md说明引擎下载方法

#### `docker/` - Docker配置
- **用途**：所有Docker相关配置文件
- **规则**：
  - Dockerfile命名：`Dockerfile`, `Dockerfile.local`, `Dockerfile.{variant}`
  - Compose文件命名：`docker-compose.yml`, `docker-compose.{env}.yml`
  - 必须包含.dockerignore

#### `docs/` - 项目文档
- **用途**：所有项目文档
- **规则**：
  - 主文档（README.md, CLAUDE.md）放在根目录
  - 用户指南放在 `guides/` 子目录
  - 技术报告和修复记录放在 `reports/` 子目录
  - 文档命名使用大写+下划线：`QUICK_START.md`

#### `legacy/` - 废弃代码
- **用途**：保留旧版本代码供参考
- **规则**：
  - 不再使用但需要保留的代码
  - 不应该被新代码引用
  - 可以随时删除

#### `public/` - 前端代码
- **用途**：所有前端静态资源
- **规则**：
  - 入口文件：`index.html`（大厅）
  - CSS放在 `css/` 子目录
  - 公共JS放在 `js/` 子目录
  - 游戏模块放在 `games/{game_name}/` 子目录
  - 每个游戏必须包含 `index.html` 和 `game.js`

#### `scripts/` - 脚本工具
- **用途**：所有Shell脚本和批处理文件
- **规则**：
  - 部署相关脚本放在 `deployment/` 子目录
  - 维护相关脚本放在 `maintenance/` 子目录
  - 脚本必须有执行权限（chmod +x）
  - 脚本开头必须有注释说明用途

### 3. 文件命名规范

#### 文档文件
- 使用大写字母和下划线：`QUICK_START.md`, `README.md`
- 特殊文档：`CLAUDE.md`（Claude Code专用）

#### 脚本文件
- 使用小写字母和连字符：`deploy.sh`, `download-engines.sh`
- Windows批处理：`start.bat`

#### 代码文件
- 使用小写字母和连字符：`engine-manager.js`, `worker-pool.js`
- 适配器命名：`{engine}-adapter.js`
- Worker命名：`{engine}-worker.js`

#### 配置文件
- Docker：`Dockerfile`, `Dockerfile.{variant}`, `docker-compose.{env}.yml`
- Node.js：`package.json`, `package-lock.json`
- Git：`.gitignore`, `.dockerignore`

### 4. 路径引用规范

#### 在文档中引用
```markdown
# 正确
./scripts/deployment/download-engines.sh
docker-compose -f docker/docker-compose.local.yml up -d

# 错误
./download-engines.sh
docker-compose -f docker-compose.local.yml up -d
```

#### 在代码中引用
```javascript
// 正确 - 使用相对路径
const engineManager = require('./ai/engine-manager');
const path = require('path');
const configPath = path.join(__dirname, 'ai/bin/katago/config.cfg');

// 错误 - 硬编码绝对路径
const engineManager = require('/app/ai/engine-manager');
```

#### 在脚本中引用
```bash
# 正确 - 从项目根目录执行
cd "$(dirname "$0")/../.."  # 回到项目根目录
./scripts/deployment/download-engines.sh

# 错误 - 假设当前目录
./download-engines.sh
```

### 5. Git版本控制规则

#### 必须提交的文件
- 所有源代码（`*.js`, `*.html`, `*.css`）
- 所有文档（`*.md`）
- 所有配置文件（`package.json`, `Dockerfile`, `docker-compose.yml`）
- 所有脚本（`*.sh`, `*.bat`）
- `.gitignore`, `.dockerignore`

#### 不提交的文件（在.gitignore中）
- `node_modules/` - npm依赖
- `ai/bin/katago/katago*` - KataGo可执行文件
- `ai/bin/katago/*.bin.gz` - KataGo模型文件
- `ai/bin/pikafish/pikafish*` - Pikafish可执行文件
- `logs/` - 日志文件
- `.idea/` - IDE配置
- `*.log` - 日志文件

### 6. 添加新功能的规范

#### 添加新游戏
1. 在 `public/games/` 创建新目录：`public/games/{game_name}/`
2. 创建 `index.html` 和 `game.js`
3. 在 `server.js` 添加游戏状态管理
4. 更新 `public/index.html` 添加游戏入口

#### 添加新AI引擎
1. 在 `ai/` 创建适配器：`{engine}-adapter.js`
2. 创建Worker：`{engine}-worker.js`
3. 在 `engine-manager.js` 注册引擎
4. 在 `ai/bin/` 创建引擎目录
5. 更新 `ai/README.md` 添加下载说明
6. 更新 `scripts/deployment/download-engines.sh`

#### 添加新文档
- 用户指南 → `docs/guides/`
- 技术报告 → `docs/reports/`
- 主要文档 → `docs/`

#### 添加新脚本
- 部署脚本 → `scripts/deployment/`
- 维护脚本 → `scripts/maintenance/`

### 7. 重构和清理规则

#### 何时移动文件到legacy/
- 代码不再使用但需要保留参考
- 已被新版本完全替代
- 不确定是否还需要但暂时保留

#### 何时删除文件
- 确认不再需要且无参考价值
- 重复的文档或脚本
- 临时测试文件

#### 重构检查清单
- [ ] 更新所有文档中的路径引用
- [ ] 更新所有脚本中的路径引用
- [ ] 更新代码中的require/import路径
- [ ] 测试所有脚本是否正常工作
- [ ] 测试Docker构建是否正常
- [ ] 更新CLAUDE.md中的路径说明

## 🔍 常见问题

### Q: 为什么要这样组织？
A:
- 清晰的结构让新开发者快速理解项目
- 分离关注点，便于维护和查找
- 符合业界最佳实践

### Q: 如何快速找到某个文件？
A:
- 文档 → `docs/`
- 脚本 → `scripts/`
- Docker → `docker/`
- AI代码 → `ai/`
- 前端 → `public/`

### Q: 添加新文件应该放在哪里？
A: 参考"添加新功能的规范"章节，按文件类型和用途选择目录。

### Q: 旧的路径引用怎么办？
A: 所有路径引用已经批量更新，如果发现遗漏请及时修正。

## 📝 维护说明

本文档应该：
- 在项目结构发生重大变化时更新
- 在添加新的目录或文件类型时更新
- 定期审查确保规则被遵守

最后更新：2026-01-20
