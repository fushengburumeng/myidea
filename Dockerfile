# 多人在线棋牌游戏平台 - Docker镜像
# 基础镜像：node:18-bookworm-slim (支持 GLIBC 2.34+)
FROM node:18-bookworm-slim

WORKDIR /app

# 配置清华大学镜像源（加速apt下载）
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's/security.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources

# 安装运行时核心依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    libzip4 \
    libgomp1 \
    libatomic1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 复制项目文件
COPY package*.json ./

# 配置npm清华镜像源并安装依赖
RUN npm config set registry https://registry.npmmirror.com && \
    npm install --production

# 复制所有项目文件（包括ai文件夹）
COPY . .

# 赋予AI引擎执行权限并确保日志目录可写
RUN chmod +x /app/ai/bin/katago/katago /app/ai/bin/pikafish/pikafish 2>/dev/null || true && \
    chmod -R 777 /app

EXPOSE 9527

# 启动前自检AI引擎（可选，如果引擎不存在会跳过）
RUN /app/ai/bin/katago/katago version 2>/dev/null || echo "KataGo not found, skipping check" && \
    echo "quit" | /app/ai/bin/pikafish/pikafish 2>/dev/null || echo "Pikafish not found, skipping check"

CMD ["node", "server.js"]
