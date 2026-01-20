# Docker 配置说明

本目录包含所有 Docker 相关的配置文件。

## 文件说明

### Dockerfile 变体

| 文件 | 用途 | 说明 |
|------|------|------|
| `Dockerfile` | 标准构建 | 构建时从GitHub下载AI引擎（可能因网络问题失败） |
| `Dockerfile.local` | 本地构建 | 使用本地已下载的AI引擎（**推荐**） |
| `Dockerfile.mirror` | 镜像源构建 | 使用国内镜像源加速构建 |

### Docker Compose 配置

| 文件 | 用途 | 说明 |
|------|------|------|
| `docker-compose.yml` | 标准配置 | 使用标准Dockerfile |
| `docker-compose.local.yml` | 本地配置 | 使用Dockerfile.local（**推荐**） |

### 其他文件

- `.dockerignore` - Docker构建时忽略的文件

## 使用方法

### 推荐方式：本地构建

```bash
# 1. 下载AI引擎到本地
cd ..  # 回到项目根目录
./scripts/deployment/download-engines.sh

# 2. 使用本地构建
docker-compose -f docker/docker-compose.local.yml up -d
```

### 标准方式：在线构建

```bash
# 直接构建（会在构建时下载引擎）
docker-compose -f docker/docker-compose.yml up -d
```

## 配置调整

### 资源限制

编辑 `docker-compose.local.yml`：

```yaml
deploy:
  resources:
    limits:
      cpus: '2'        # CPU核心数
      memory: 1200M    # 内存限制
```

### 端口映射

```yaml
ports:
  - "9527:9527"  # 修改左侧端口号改变宿主机端口
```

### 健康检查

```yaml
healthcheck:
  interval: 30s      # 检查间隔
  timeout: 10s       # 超时时间
  retries: 3         # 重试次数
  start_period: 40s  # 启动等待时间
```

## 常见问题

### Q: 应该使用哪个Dockerfile？
A: 推荐使用 `Dockerfile.local`，先用脚本下载引擎到本地，避免构建时网络问题。

### Q: 如何切换Dockerfile？
A: 修改 `docker-compose.yml` 中的 `dockerfile` 字段：
```yaml
build:
  context: ..
  dockerfile: docker/Dockerfile.local  # 修改这里
```

### Q: 构建失败怎么办？
A: 
1. 检查AI引擎是否已下载到 `ai/bin/`
2. 使用 `Dockerfile.local` 而非 `Dockerfile`
3. 查看详细日志：`docker-compose -f docker/docker-compose.local.yml logs -f`

## 相关文档

- [快速开始](../docs/guides/QUICK_START.md)
- [Docker部署指南](../docs/guides/DOCKER_DEPLOYMENT.md)
- [故障排查](../docs/guides/DOCKER_TROUBLESHOOTING.md)

---

**最后更新**: 2026-01-20
