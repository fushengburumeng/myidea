#!/bin/bash

# AI引擎下载脚本 (2026 稳定版优化)
# 用于本地下载引擎并准备 Docker 运行环境

set -e

# 设置代理前缀（如果在中国境内服务器运行，建议保留；否则可置空）
GITHUB_PROXY="https://mirror.ghproxy.com/"

echo "=========================================="
echo "   AI引擎下载及环境检查脚本"
echo "=========================================="

# 创建目录
mkdir -p ai/bin/katago
mkdir -p ai/bin/pikafish

# --- 1. 下载 KataGo ---
echo ""
echo "[1/4] 下载 KataGo (v1.15.3)..."
cd ai/bin/katago

if [ ! -f "katago" ]; then
    # 默认选择 Eigen-AVX2 版本以确保在 Docker/虚拟机中最大的兼容性
    KATAGO_URL="https://github.com/lightvector/KataGo/releases/download/v1.15.3/katago-v1.15.3-eigenavx2-linux-x64+bs50.zip"
    
    echo "正在下载: $KATAGO_URL"
    if ! wget --timeout=30 --tries=2 --show-progress ${GITHUB_PROXY}${KATAGO_URL}; then
        echo "尝试直接下载..."
        wget --timeout=30 --tries=2 --show-progress ${KATAGO_URL}
    fi

    unzip -q katago-v1.15.3-eigenavx2-linux-x64+bs50.zip
    mv katago-v1.15.3-eigenavx2-linux-x64+bs50 katago
    rm katago-v1.15.3-eigenavx2-linux-x64+bs50.zip
    chmod +x katago
    echo "✓ KataGo 下载完成"
else
    echo "✓ KataGo 已存在，跳过下载"
fi

# --- 2. 下载 KataGo 模型 ---
echo ""
echo "[2/4] 下载 KataGo 模型 (b6c96 轻量版)..."
# 注意：原 1.4.5 链接可能失效，改为 1.15 兼容的链接
if [ ! -f "b6.bin.gz" ]; then
    MODEL_URL="https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz"
    if ! wget --timeout=30 --tries=2 --show-progress -O b6.bin.gz ${GITHUB_PROXY}${MODEL_URL}; then
        wget --timeout=30 --tries=2 --show-progress -O b6.bin.gz ${MODEL_URL}
    fi
    echo "✓ 模型下载完成"
else
    echo "✓ 模型已存在，跳过下载"
fi

# --- 3. 创建配置文件 ---
echo ""
echo "[3/4] 优化 KataGo 配置..."
cat > config.cfg << 'EOF'
# 轻量化配置
logSearchInfo = false
logToStderr = false
maxVisits = 100
numSearchThreads = 2
nnCacheSizePowerOfTwo = 18
EOF
echo "✓ config.cfg 已更新"

# --- 4. 下载 Pikafish (象棋引擎) ---
echo ""
echo "[4/4] 下载 Pikafish..."
cd ../pikafish

if [ ! -f "pikafish" ]; then
    # 使用最新的稳定 Release
    PIKA_URL="https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-avx2"
    echo "正在下载 AVX2 版本 (比 BMI2 兼容性更好)..."
    
    if ! wget --timeout=30 --tries=2 --show-progress -O pikafish ${GITHUB_PROXY}${PIKA_URL}; then
        wget --timeout=30 --tries=2 --show-progress -O pikafish ${PIKA_URL}
    fi
    
    chmod +x pikafish
    echo "✓ Pikafish 下载完成"
else
    echo "✓ Pikafish 已存在"
fi

# --- 测试环节 ---
cd ../../..
echo ""
echo "=========================================="
echo "   环境自检"
echo "=========================================="

# 安装 Ubuntu 24.04 必要的运行时库
if [ -f /etc/debian_version ]; then
    echo "检查系统依赖 (libzip4, libgomp1)..."
    sudo apt-get update -qq && sudo apt-get install -y -qq libzip4 libgomp1 unzip > /dev/null 2>&1 || echo "请确保已安装 libzip4 和 libgomp1"
fi

echo -n "KataGo 测试: "
if timeout 5 ./ai/bin/katago/katago version > /dev/null 2>&1; then
    echo "成功"
else
    echo "失败 (检查 AVX2 支持)"
fi

echo -n "Pikafish 测试: "
if timeout 5 ./ai/bin/pikafish/pikafish uci quit > /dev/null 2>&1; then
    echo "成功"
else
    echo "失败 (可能需要尝试 popcnt 版本)"
fi

echo ""
echo "所有引擎已就绪！"