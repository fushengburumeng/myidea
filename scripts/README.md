# Scripts 脚本工具说明

本目录包含项目的部署和更新脚本。

## 目录结构

```
scripts/
├── deployment/           # 部署相关脚本
│   ├── deploy.sh        # Docker 部署脚本
│   └── download-engines.sh  # AI 引擎下载脚本
└── maintenance/         # 维护相关脚本
    └── update.sh        # 代码更新脚本
```

## 部署脚本 (deployment/)

### deploy.sh
**用途**: 一键部署 Docker 容器

**使用方法**:
```bash
./scripts/deployment/deploy.sh
```

**说明**:
- 自动检查 Docker 环境
- 停止旧容器
- 构建新镜像（使用 docker/Dockerfile）
- 启动容器
- 检查 AI 引擎状态

### download-engines.sh
**用途**: 下载 AI 引擎文件（KataGo 和 Pikafish）

**使用方法**:
```bash
chmod +x scripts/deployment/download-engines.sh
./scripts/deployment/download-engines.sh
```

**说明**:
- 自动下载 KataGo v1.15.3 和 Pikafish 最新版
- 支持 GitHub 代理加速下载
- 下载到 `ai/bin/katago/` 和 `ai/bin/pikafish/`
- 首次部署必须运行

## 维护脚本 (maintenance/)

### update.sh
**用途**: 更新项目代码并重新部署

**使用方法**:
```bash
./scripts/maintenance/update.sh
```

**说明**:
- 拉取最新代码
- 检查 AI 引擎文件
- 重新下载引擎（如需要）
- 使用 docker/docker-compose.local.yml 重新构建并启动容器

## 使用场景

### 首次部署
```bash
# 1. 下载 AI 引擎
./scripts/deployment/download-engines.sh

# 2. 部署 Docker
./scripts/deployment/deploy.sh
```

### 更新部署
```bash
./scripts/maintenance/update.sh
```

## 注意事项

### 执行权限
所有 .sh 脚本需要执行权限：
```bash
chmod +x scripts/deployment/*.sh
chmod +x scripts/maintenance/*.sh
```

### 执行位置
脚本应从项目根目录执行：
```bash
cd /path/to/weiqi
./scripts/deployment/deploy.sh
```

### 项目结构要求
- Docker 相关文件位于 `docker/` 目录
- AI 引擎文件位于 `ai/bin/` 目录
- 主服务文件 `server.js` 位于项目根目录

### Windows 兼容性
- .sh 脚本需要 Git Bash 或 WSL
- 建议在 Linux 服务器上运行部署脚本

## 相关文档

- [项目结构](../PROJECT_STRUCTURE.md)
- [Docker 部署](../docs/guides/DOCKER_DEPLOYMENT.md)

---

**最后更新**: 2026-01-20
