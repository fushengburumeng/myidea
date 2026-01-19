# 多阶段构建 - AI引擎下载阶段
FROM alpine:3.19 AS downloader

WORKDIR /tmp

# 安装下载工具和依赖
RUN apk add --no-cache wget unzip curl

# 下载 KataGo（尝试多个版本）
RUN mkdir -p /engines/katago && \
    cd /engines/katago && \
    echo "正在下载 KataGo..." && \
    (wget --timeout=60 --tries=3 --retry-connrefused \
        https://github.com/lightvector/KataGo/releases/download/v1.15.3/katago-v1.15.3-linux-x64.zip \
        -O katago.zip 2>/dev/null || \
     wget --timeout=60 --tries=3 --retry-connrefused \
        https://github.com/lightvector/KataGo/releases/download/v1.15.0/katago-v1.15.0-linux-x64.zip \
        -O katago.zip 2>/dev/null || \
     wget --timeout=60 --tries=3 --retry-connrefused \
        https://github.com/lightvector/KataGo/releases/download/v1.14.0/katago-v1.14.0-linux-x64.zip \
        -O katago.zip) && \
    echo "解压 KataGo..." && \
    unzip -q katago.zip && \
    rm katago.zip && \
    chmod +x katago && \
    echo "KataGo 下载完成"

# 下载 KataGo 模型 (b6 小模型)
RUN cd /engines/katago && \
    echo "正在下载 KataGo 模型..." && \
    wget --timeout=60 --tries=3 --retry-connrefused \
        https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz \
        -O b6.bin.gz && \
    echo "模型下载完成"

# 创建 KataGo 配置文件
RUN cd /engines/katago && \
    echo "logSearchInfo = false" > config.cfg && \
    echo "logToStderr = false" >> config.cfg && \
    echo "maxVisits = 100" >> config.cfg && \
    echo "numSearchThreads = 1" >> config.cfg

# 下载 Pikafish
RUN mkdir -p /engines/pikafish && \
    cd /engines/pikafish && \
    echo "正在下载 Pikafish..." && \
    wget --timeout=60 --tries=3 --retry-connrefused \
        https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-bmi2 \
        -O pikafish && \
    chmod +x pikafish && \
    echo "Pikafish 下载完成"

# 验证下载的文件
RUN echo "验证引擎文件..." && \
    ls -lh /engines/katago/ && \
    ls -lh /engines/pikafish/ && \
    test -f /engines/katago/katago && \
    test -f /engines/katago/b6.bin.gz && \
    test -f /engines/pikafish/pikafish && \
    echo "所有引擎文件验证通过"

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
RUN echo "验证引擎文件已复制..." && \
    ls -lh /app/ai/bin/katago/ && \
    ls -lh /app/ai/bin/pikafish/ && \
    test -x /app/ai/bin/katago/katago && \
    test -f /app/ai/bin/katago/b6.bin.gz && \
    test -x /app/ai/bin/pikafish/pikafish && \
    echo "AI引擎文件验证通过"

# 暴露端口
EXPOSE 9527

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9527', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "server.js"]
