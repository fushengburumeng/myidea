# 多阶段构建 - AI引擎下载阶段
FROM alpine:3.19 AS downloader

WORKDIR /tmp

# 安装下载工具
RUN apk add --no-cache wget unzip

# 下载 KataGo
RUN mkdir -p /engines/katago && \
    cd /engines/katago && \
    wget -q https://github.com/lightvector/KataGo/releases/download/v1.14.1/katago-v1.14.1-linux-x64.zip && \
    unzip -q katago-v1.14.1-linux-x64.zip && \
    rm katago-v1.14.1-linux-x64.zip && \
    chmod +x katago

# 下载 KataGo 模型 (b6 小模型)
RUN cd /engines/katago && \
    wget -q https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz && \
    mv g170e-b6c96-s175395328-d26788732.bin.gz b6.bin.gz

# 创建 KataGo 配置文件
RUN cd /engines/katago && \
    echo "logSearchInfo = false" > config.cfg && \
    echo "logToStderr = false" >> config.cfg && \
    echo "maxVisits = 100" >> config.cfg && \
    echo "numSearchThreads = 1" >> config.cfg

# 下载 Pikafish
RUN mkdir -p /engines/pikafish && \
    cd /engines/pikafish && \
    wget -q https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-bmi2 && \
    mv pikafish-bmi2 pikafish && \
    chmod +x pikafish

# 应用构建阶段
FROM node:18-alpine

WORKDIR /app

# 安装运行时依赖（KataGo 和 Pikafish 需要）
RUN apk add --no-cache libstdc++ libgomp

# 复制 package.json 并安装依赖
COPY package*.json ./
RUN npm install --production

# 复制应用代码
COPY . .

# 从下载阶段复制 AI 引擎
COPY --from=downloader /engines /app/ai/bin

# 验证引擎文件
RUN ls -lh /app/ai/bin/katago/ && \
    ls -lh /app/ai/bin/pikafish/ && \
    echo "AI引擎文件已复制"

# 暴露端口
EXPOSE 9527

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9527', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "server.js"]
