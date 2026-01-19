# Docker 部署故障排查指南

## 问题：GitHub 下载失败

### 症状
```
ERROR: failed to solve: process "/bin/sh -c ... wget ... github.com ..." did not complete
```

### 原因
- 网络连接问题
- GitHub访问受限
- 下载超时

---

## 解决方案

### 方案1：使用本地下载（推荐）

**步骤：**

```bash
# 1. 先在本地下载AI引擎
chmod +x download-engines.sh
./download-engines.sh

# 2. 使用本地引擎构建镜像
docker build -f Dockerfile.local -t weiqi-game-platform .

# 3. 启动容器
docker run -d \
    -p 9527:9527 \
    --name weiqi-game-server \
    --restart=always \
    --memory=2g \
    --cpus=2 \
    weiqi-game-platform

# 或使用 Docker Compose
docker-compose -f docker-compose.local.yml up -d
```

**优点：**
- ✅ 不依赖Docker构建时的网络
- ✅ 可以使用代理下载
- ✅ 下载失败可以重试
- ✅ 可以验证引擎是否正常

---

### 方案2：使用镜像加速

```bash
# 使用带镜像的Dockerfile
docker build -f Dockerfile.mirror -t weiqi-game-platform .
```

这个Dockerfile会：
1. 先尝试从GitHub下载
2. 失败后自动切换到ghproxy镜像
3. 使用阿里云npm镜像加速

---

### 方案3：配置Docker代理

如果你有代理服务器：

```bash
# 创建 ~/.docker/config.json
mkdir -p ~/.docker
cat > ~/.docker/config.json << 'EOF'
{
  "proxies": {
    "default": {
      "httpProxy": "http://proxy.example.com:8080",
      "httpsProxy": "http://proxy.example.com:8080",
      "noProxy": "localhost,127.0.0.1"
    }
  }
}
EOF

# 重启Docker
sudo systemctl restart docker

# 重新构建
docker build -t weiqi-game-platform .
```

---

### 方案4：手动下载引擎

如果自动下载都失败，可以手动下载：

```bash
# 1. 创建目录
mkdir -p ai/bin/katago
mkdir -p ai/bin/pikafish

# 2. 手动下载文件（使用浏览器或其他工具）
# KataGo: https://github.com/lightvector/KataGo/releases/download/v1.14.1/katago-v1.14.1-linux-x64.zip
# 模型: https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz
# Pikafish: https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-bmi2

# 3. 解压和配置
cd ai/bin/katago
unzip katago-v1.14.1-linux-x64.zip
mv g170e-b6c96-s175395328-d26788732.bin.gz b6.bin.gz
chmod +x katago

cat > config.cfg << 'EOF'
logSearchInfo = false
logToStderr = false
maxVisits = 100
numSearchThreads = 1
EOF

cd ../pikafish
mv pikafish-bmi2 pikafish
chmod +x pikafish

# 4. 使用本地构建
cd ../../..
docker build -f Dockerfile.local -t weiqi-game-platform .
```

---

## 推荐流程（最稳定）

```bash
# 1. 克隆项目
git clone https://github.com/fushengburumeng/myidea.git
cd myidea/weiqi

# 2. 下载AI引擎（支持重试和镜像）
chmod +x download-engines.sh
./download-engines.sh

# 3. 验证下载
ls -lh ai/bin/katago/
ls -lh ai/bin/pikafish/

# 4. 使用本地引擎构建
docker build -f Dockerfile.local -t weiqi-game-platform .

# 5. 启动服务
docker-compose -f docker-compose.local.yml up -d

# 6. 查看日志
docker-compose -f docker-compose.local.yml logs -f
```

---

## 验证部署

```bash
# 检查容器状态
docker ps | grep weiqi

# 查看AI引擎状态
docker logs weiqi-game-server | grep -E "KataGo|Pikafish|AI引擎"

# 测试访问
curl http://localhost:9527
```

---

## 其他常见问题

### 问题：unzip: command not found

**解决：**
```bash
# 在宿主机安装unzip
sudo apt install unzip

# 重新运行下载脚本
./download-engines.sh
```

### 问题：Permission denied

**解决：**
```bash
# 添加执行权限
chmod +x download-engines.sh
chmod +x ai/bin/katago/katago
chmod +x ai/bin/pikafish/pikafish
```

### 问题：引擎测试失败

**解决：**
```bash
# 安装运行时依赖
sudo apt install libstdc++6 libgomp1

# 重新测试
echo -e "boardsize 9\nquit" | ai/bin/katago/katago gtp -model ai/bin/katago/b6.bin.gz -config ai/bin/katago/config.cfg
```

---

## 文件清单

确保以下文件存在：

```
weiqi/
├── Dockerfile              # 原始Dockerfile（在线下载）
├── Dockerfile.local        # 本地构建Dockerfile（推荐）
├── Dockerfile.mirror       # 镜像加速Dockerfile
├── docker-compose.yml      # 原始compose配置
├── docker-compose.local.yml # 本地构建compose配置
├── download-engines.sh     # 引擎下载脚本
└── ai/bin/
    ├── katago/
    │   ├── katago          # 可执行文件
    │   ├── b6.bin.gz       # 模型文件
    │   └── config.cfg      # 配置文件
    └── pikafish/
        └── pikafish        # 可执行文件
```

---

## 快速命令参考

```bash
# 下载引擎
./download-engines.sh

# 本地构建
docker build -f Dockerfile.local -t weiqi-game-platform .

# 启动服务
docker-compose -f docker-compose.local.yml up -d

# 查看日志
docker logs -f weiqi-game-server

# 停止服务
docker-compose -f docker-compose.local.yml down

# 重新构建
docker-compose -f docker-compose.local.yml up -d --build
```

---

## 获取帮助

如果问题仍未解决：

1. 查看详细日志：`docker logs weiqi-game-server`
2. 检查网络连接：`ping github.com`
3. 提交Issue：https://github.com/fushengburumeng/myidea/issues
