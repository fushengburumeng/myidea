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
    echo "下载 KataGo v1.14.1 (Linux x64)..."
    wget -q --show-progress https://github.com/lightvector/KataGo/releases/download/v1.14.1/katago-v1.14.1-linux-x64.zip
    unzip -q katago-v1.14.1-linux-x64.zip
    rm katago-v1.14.1-linux-x64.zip
    chmod +x katago
    echo "✓ KataGo 下载完成"
else
    echo "✓ KataGo 已存在，跳过下载"
fi

# 下载 KataGo 模型
echo ""
echo "[2/4] 下载 KataGo 模型 (b6, ~15MB)..."
if [ ! -f "b6.bin.gz" ]; then
    wget -q --show-progress https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz
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
    wget -q --show-progress https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-bmi2
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
if echo -e "boardsize 9\nquit" | timeout 5 ai/bin/katago/katago gtp -model ai/bin/katago/b6.bin.gz -config ai/bin/katago/config.cfg > /dev/null 2>&1; then
    echo "✓ KataGo 测试通过"
else
    echo "✗ KataGo 测试失败"
fi

echo ""
echo "测试 Pikafish..."
if echo -e "uci\nquit" | timeout 5 ai/bin/pikafish/pikafish > /dev/null 2>&1; then
    echo "✓ Pikafish 测试通过"
else
    echo "✗ Pikafish 测试失败"
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
echo "下一步："
echo "  1. 运行 ./deploy.sh 部署到 Docker"
echo "  2. 或运行 docker-compose up -d"
echo ""
