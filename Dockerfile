# --- 第一阶段：下载阶段 ---
    FROM alpine:3.19 AS downloader
    WORKDIR /tmp
    RUN apk add --no-cache wget unzip curl
    # (这部分保持你原来的下载逻辑即可，Alpine 用于下载是没有问题的)
    RUN mkdir -p /engines/katago /engines/pikafish
    
    # KataGo 下载逻辑 (建议使用你手动确认成功的链接，或者保留原样)
    RUN cd /engines/katago && \
        wget https://github.com/lightvector/KataGo/releases/download/v1.15.3/katago-v1.15.3-eigenavx2-linux-x64.zip -O katago.zip && \
        unzip -q katago.zip && rm katago.zip && chmod +x katago
    
    # 模型下载
    RUN cd /engines/katago && \
        wget https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz -O b6.bin.gz
    
    # 配置文件
    RUN cd /engines/katago && \
        echo "logSearchInfo = false\nlogToStderr = false\nmaxVisits = 100\nnumSearchThreads = 1" > config.cfg
    
    # Pikafish 下载 (建议用 avx2 替代 bmi2 提高兼容性)
    RUN cd /engines/pikafish && \
        wget https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-avx2 -O pikafish && \
        chmod +x pikafish
    
    # --- 第二阶段：应用运行阶段 ---
    # 修改点：改用 debian 基础镜像
    FROM node:18-bullseye-slim
    
    WORKDIR /app
    
    # 安装运行时核心依赖 (Debian 系)
    RUN apt-get update && apt-get install -y --no-install-recommends \
        wget \
        libzip4 \
        libgomp1 \
        ca-certificates \
        && rm -rf /var/lib/apt/lists/*
    
    # 关键：手动补齐 libssl1.1 (Debian Bullseye 自带 libssl1.1，如果是更高版本则需要手动下载)
    # Bullseye 默认自带 libssl1.1，如果是 Debian 12 (bookworm) 才需要手动下包。
    # 为了保险，我们强制检查并建立软链接解决 libzip.so.5 的问题
    RUN ln -s /usr/lib/x86_64-linux-gnu/libzip.so.4 /usr/lib/x86_64-linux-gnu/libzip.so.5 || true
    
    # 复制项目文件
    COPY package*.json ./
    RUN npm install --production
    COPY . .
    
    # 从下载阶段复制 AI 引擎
    COPY --from=downloader /engines /app/ai/bin
    
    # 赋予执行权限
    RUN chmod +x /app/ai/bin/katago/katago /app/ai/bin/pikafish/pikafish
    
    EXPOSE 9527
    
    # 启动前简单的自检逻辑
    RUN /app/ai/bin/katago/katago version && /app/ai/bin/pikafish/pikafish uci quit
    
    CMD ["node", "server.js"]