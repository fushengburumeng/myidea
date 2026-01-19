#!/bin/bash

# AI引擎下载脚本 (Ubuntu 24.04 LTS)
# 用于在本地下载AI引擎，然后通过Docker构建

set -e

echo "=========================================="
echo "   AI引擎下载脚本"
echo "=========================================="

# 创建目录
mkdir -p ai/bin/katago
mkdir -p ai/bin/pikafish

# 下载 KataGo
echo ""
echo "[1/4] 下载 KataGo..."
cd ai/bin/katago

if [ ! -f "katago" ]; then
    echo "下载 KataGo v1.15.3 (Linux x64)..."

    # 尝试多个版本和镜像
    KATAGO_DOWNLOADED=false

    # 尝试 v1.15.3
    if wget --timeout=60 --tries=3 --show-progress \
        https://github.com/lightvector/KataGo/releases/download/v1.15.3/katago-v1.15.3-linux-x64.zip 2>/dev/null; then
        echo "✓ 从GitHub下载 v1.15.3 成功"
        KATAGO_DOWNLOADED=true
        KATAGO_FILE="katago-v1.15.3-linux-x64.zip"
    fi

    # 尝试 v1.15.0
    if [ "$KATAGO_DOWNLOADED" = false ]; then
        echo "尝试 v1.15.0..."
        if wget --timeout=60 --tries=3 --show-progress \
            https://github.com/lightvector/KataGo/releases/download/v1.15.0/katago-v1.15.0-linux-x64.zip 2>/dev/null; then
            echo "✓ 从GitHub下载 v1.15.0 成功"
            KATAGO_DOWNLOADED=true
            KATAGO_FILE="katago-v1.15.0-linux-x64.zip"
        fi
    fi

    # 尝试 v1.14.0
    if [ "$KATAGO_DOWNLOADED" = false ]; then
        echo "尝试 v1.14.0..."
        if wget --timeout=60 --tries=3 --show-progress \
            https://github.com/lightvector/KataGo/releases/download/v1.14.0/katago-v1.14.0-linux-x64.zip 2>/dev/null; then
            echo "✓ 从GitHub下载 v1.14.0 成功"
            KATAGO_DOWNLOADED=true
            KATAGO_FILE="katago-v1.14.0-linux-x64.zip"
        fi
    fi

    # 尝试使用镜像
    if [ "$KATAGO_DOWNLOADED" = false ]; then
        echo "GitHub下载失败，尝试使用镜像..."
        if wget --timeout=60 --tries=3 --show-progress \
            https://ghproxy.com/https://github.com/lightvector/KataGo/releases/download/v1.15.3/katago-v1.15.3-linux-x64.zip 2>/dev/null; then
            echo "✓ 从镜像下载成功"
            KATAGO_DOWNLOADED=true
            KATAGO_FILE="katago-v1.15.3-linux-x64.zip"
        fi
    fi

    if [ "$KATAGO_DOWNLOADED" = false ]; then
        echo "✗ 下载失败，请手动下载"
        echo ""
        echo "请访问以下地址手动下载 KataGo:"
        echo "  https://github.com/lightvector/KataGo/releases"
        echo ""
        echo "下载文件名类似: katago-v1.x.x-linux-x64.zip"
        echo "下载后放到当前目录: $(pwd)"
        echo "然后重新运行此脚本"
        exit 1
    fi

    unzip -q "$KATAGO_FILE"
    rm "$KATAGO_FILE"
    chmod +x katago
    echo "✓ KataGo 下载完成"
else
    echo "✓ KataGo 已存在，跳过下载"
fi

# 下载 KataGo 模型
echo ""
echo "[2/4] 下载 KataGo 模型 (b6, ~15MB)..."
if [ ! -f "b6.bin.gz" ]; then
    MODEL_DOWNLOADED=false

    # 尝试从GitHub下载
    if wget --timeout=60 --tries=3 --show-progress \
        https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz 2>/dev/null; then
        echo "✓ 从GitHub下载成功"
        MODEL_DOWNLOADED=true
    fi

    # 尝试使用镜像
    if [ "$MODEL_DOWNLOADED" = false ]; then
        echo "GitHub下载失败，尝试使用镜像..."
        if wget --timeout=60 --tries=3 --show-progress \
            https://ghproxy.com/https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz 2>/dev/null; then
            echo "✓ 从镜像下载成功"
            MODEL_DOWNLOADED=true
        fi
    fi

    if [ "$MODEL_DOWNLOADED" = false ]; then
        echo "✗ 模型下载失败"
        echo "请手动下载: https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz"
        echo "下载后重命名为 b6.bin.gz 并放到: $(pwd)"
        exit 1
    fi

    mv g170e-b6c96-s175395328-d26788732.bin.gz b6.bin.gz
    echo "✓ 模型下载完成"
else
    echo "✓ 模型已存在，跳过下载"
fi

# 创建配置文件
echo ""
echo "[3/4] 创建 KataGo 配置..."
cat > config.cfg << 'EOF'
# KataGo 配置文件 (低配服务器优化)
logSearchInfo = false
logToStderr = false
maxVisits = 100
numSearchThreads = 1
EOF
echo "✓ 配置文件已创建"

# 下载 Pikafish
echo ""
echo "[4/4] 下载 Pikafish..."
cd ../pikafish

if [ ! -f "pikafish" ]; then
    echo "下载 Pikafish (BMI2版本)..."

    PIKAFISH_DOWNLOADED=false

    # 尝试从GitHub下载
    if wget --timeout=60 --tries=3 --show-progress \
        https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-bmi2 2>/dev/null; then
        echo "✓ 从GitHub下载成功"
        PIKAFISH_DOWNLOADED=true
    fi

    # 尝试使用镜像
    if [ "$PIKAFISH_DOWNLOADED" = false ]; then
        echo "GitHub下载失败，尝试使用镜像..."
        if wget --timeout=60 --tries=3 --show-progress \
            https://ghproxy.com/https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-bmi2 2>/dev/null; then
            echo "✓ 从镜像下载成功"
            PIKAFISH_DOWNLOADED=true
        fi
    fi

    if [ "$PIKAFISH_DOWNLOADED" = false ]; then
        echo "✗ Pikafish 下载失败"
        echo "请手动下载: https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-bmi2"
        echo "下载后重命名为 pikafish 并放到: $(pwd)"
        exit 1
    fi

    mv pikafish-bmi2 pikafish
    chmod +x pikafish
    echo "✓ Pikafish 下载完成"
else
    echo "✓ Pikafish 已存在，跳过下载"
fi

# 返回项目根目录
cd ../../..

# 测试引擎
echo ""
echo "=========================================="
echo "   测试引擎"
echo "=========================================="

echo ""
echo "测试 KataGo..."
if timeout 10 bash -c 'echo -e "boardsize 9\nquit" | ai/bin/katago/katago gtp -model ai/bin/katago/b6.bin.gz -config ai/bin/katago/config.cfg' > /dev/null 2>&1; then
    echo "✓ KataGo 测试通过"
else
    echo "⚠ KataGo 测试失败（可能需要安装依赖: libstdc++6 libgomp1）"
fi

echo ""
echo "测试 Pikafish..."
if timeout 10 bash -c 'echo -e "uci\nquit" | ai/bin/pikafish/pikafish' > /dev/null 2>&1; then
    echo "✓ Pikafish 测试通过"
else
    echo "⚠ Pikafish 测试失败（可能需要安装依赖: libstdc++6）"
fi

echo ""
echo "=========================================="
echo "   下载完成！"
echo "=========================================="
echo ""
echo "文件结构："
echo "  ai/bin/katago/katago       - KataGo 可执行文件"
echo "  ai/bin/katago/b6.bin.gz    - 神经网络模型"
echo "  ai/bin/katago/config.cfg   - 配置文件"
echo "  ai/bin/pikafish/pikafish   - Pikafish 可执行文件"
echo ""
echo "文件大小："
du -sh ai/bin/katago/ 2>/dev/null || echo "  KataGo: ~20MB"
du -sh ai/bin/pikafish/ 2>/dev/null || echo "  Pikafish: ~10MB"
echo ""
echo "下一步："
echo "  方案1: 使用本地引擎构建 Docker 镜像"
echo "    docker build -f Dockerfile.local -t weiqi-game-platform ."
echo ""
echo "  方案2: 使用 Docker Compose"
echo "    docker-compose -f docker-compose.local.yml up -d"
echo ""
echo "  方案3: 直接运行（需要先安装 Node.js）"
echo "    npm install"
echo "    npm start"
echo ""
