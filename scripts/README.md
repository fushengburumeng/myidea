# Scripts 脚本工具说明

本目录包含所有项目相关的脚本工具，分为部署脚本和维护脚本两类。

## 目录结构

```
scripts/
├── deployment/      # 部署相关脚本
│   ├── deploy.sh
│   ├── deploy-fix.sh
│   ├── download-engines.sh
│   ├── download-ai-engines.sh
│   └── fix-engines.sh
└── maintenance/     # 维护相关脚本
    ├── debug-docker.sh
    ├── update.sh
    ├── verify-deployment.sh
    ├── start.sh
    └── start.bat
```

## 部署脚本 (deployment/)

### download-engines.sh
**用途**: 下载AI引擎文件（KataGo和Pikafish）

**使用方法**:
```bash
chmod +x scripts/deployment/download-engines.sh
./scripts/deployment/download-engines.sh
```

**说明**:
- 自动下载KataGo v1.15.3和Pikafish最新版
- 支持GitHub代理加速下载
- 下载到 `ai/bin/katago/` 和 `ai/bin/pikafish/`
- 首次部署必须运行

### deploy.sh
**用途**: 一键部署Docker容器

**使用方法**:
```bash
./scripts/deployment/deploy.sh
```

**说明**:
- 自动检查Docker环境
- 停止旧容器
- 构建新镜像
- 启动容器
- 检查AI引擎状态

### deploy-fix.sh
**用途**: 修复部署问题的增强版部署脚本

**使用方法**:
```bash
./scripts/deployment/deploy-fix.sh
```

**说明**:
- 包含更多错误检查
- 自动修复常见问题
- 适用于部署失败后重试

### download-ai-engines.sh
**用途**: 备用的AI引擎下载脚本

**使用方法**:
```bash
./scripts/deployment/download-ai-engines.sh
```

**说明**:
- 与download-engines.sh功能类似
- 提供不同的下载策略
- 主脚本失败时可尝试此脚本

### fix-engines.sh
**用途**: 修复AI引擎文件权限和配置问题

**使用方法**:
```bash
./scripts/deployment/fix-engines.sh
```

**说明**:
- 修复文件执行权限
- 检查文件完整性
- 修复配置文件问题

## 维护脚本 (maintenance/)

### debug-docker.sh
**用途**: Docker调试工具

**使用方法**:
```bash
./scripts/maintenance/debug-docker.sh
```

**说明**:
- 显示容器状态
- 检查AI引擎状态
- 显示最近日志
- 测试引擎可用性

### verify-deployment.sh
**用途**: 验证部署是否成功

**使用方法**:
```bash
./scripts/maintenance/verify-deployment.sh
```

**说明**:
- 检查容器运行状态
- 验证端口监听
- 测试AI引擎
- 生成验证报告

### update.sh
**用途**: 更新项目代码并重新部署

**使用方法**:
```bash
./scripts/maintenance/update.sh
```

**说明**:
- 拉取最新代码
- 重新下载引擎（如需要）
- 重新构建并启动容器

### start.sh (Linux/Mac)
**用途**: 本地启动开发服务器

**使用方法**:
```bash
./scripts/maintenance/start.sh
```

**说明**:
- 启动Node.js服务器
- 适用于本地开发
- 不使用Docker

### start.bat (Windows)
**用途**: Windows本地启动开发服务器

**使用方法**:
```cmd
scripts\maintenance\start.bat
```

**说明**:
- Windows批处理版本
- 功能同start.sh

## 使用场景

### 首次部署
```bash
# 1. 下载AI引擎
./scripts/deployment/download-engines.sh

# 2. 部署Docker
./scripts/deployment/deploy.sh

# 3. 验证部署
./scripts/maintenance/verify-deployment.sh
```

### 本地开发
```bash
# Linux/Mac
./scripts/maintenance/start.sh

# Windows
scripts\maintenance\start.bat
```

### 更新部署
```bash
./scripts/maintenance/update.sh
```

### 故障排查
```bash
# 1. 调试信息
./scripts/maintenance/debug-docker.sh

# 2. 修复引擎
./scripts/deployment/fix-engines.sh

# 3. 重新部署
./scripts/deployment/deploy-fix.sh
```

## 脚本开发规范

### 命名规范
- 使用小写字母和连字符：`deploy-fix.sh`
- 功能清晰的命名：`download-engines.sh`

### 文件头注释
每个脚本应包含：
```bash
#!/bin/bash
# 脚本名称和用途说明
# 使用方法
# 作者和日期
```

### 错误处理
```bash
set -e  # 遇到错误立即退出
```

### 用户提示
```bash
echo "=========================================="
echo "   脚本标题"
echo "=========================================="
```

## 注意事项

### 执行权限
所有.sh脚本需要执行权限：
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

### Windows兼容性
- .sh脚本需要Git Bash或WSL
- .bat脚本可直接在Windows命令行运行

## 相关文档

- [项目规范](../../PROJECT_STRUCTURE.md)
- [快速开始](../../docs/guides/QUICK_START.md)
- [Docker部署](../../docs/guides/DOCKER_DEPLOYMENT.md)

---

**最后更新**: 2026-01-20
