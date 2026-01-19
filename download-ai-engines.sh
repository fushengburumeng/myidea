#!/bin/bash

# AI引擎快速下载脚本
# 用于下载KataGo和Pikafish引擎文件

set -e

echo "=========================================="
echo "   AI引擎下载脚本"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -d "ai/bin" ]; then
    echo "[错误] 请在项目根目录运行此脚本"
    exit 1
fi

# 创建目录
mkdir -p ai/bin/katago ai/bin/pikafish

# 下载KataGo
echo "[1/4] 下载KataGo引擎..."
cd ai/bin/katago

if [ -f "katago" ]; then
    echo "✓ KataGo已存在，跳过下载"
else
    echo "正在下载KataGo v1.15.3 (eigenavx2-linux-x64)..."
    wget -q --show-progress https://github.com/lightvector/KataGo/releases/download/v1.15.3/katago-v1.15.3-eigenavx2-linux-x64.zip -O katago.zip
    unzip -q katago.zip
    rm katago.zip
    chmod +x katago
    echo "✓ KataGo下载完成"
fi

# 下载KataGo模型
echo ""
echo "[2/4] 下载KataGo神经网络模型..."
if [ -f "b6.bin.gz" ]; then
    echo "✓ 模型文件已存在，跳过下载"
else
    echo "正在下载b6模型 (约70MB)..."
    wget -q --show-progress https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz -O b6.bin.gz
    echo "✓ 模型下载完成"
fi

# 下载Pikafish
echo ""
echo "[3/4] 下载Pikafish引擎..."
cd ../pikafish

if [ -f "pikafish" ]; then
    echo "✓ Pikafish已存在，跳过下载"
else
    echo "正在下载Pikafish (avx2)..."
    wget -q --show-progress https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-avx2 -O pikafish
    chmod +x pikafish
    echo "✓ Pikafish下载完成"
fi

# 验证安装
echo ""
echo "[4/4] 验证AI引擎..."
cd ../../..

echo -n "KataGo版本: "
./ai/bin/katago/katago version 2>/dev/null | head -1 || echo "验证失败"

echo -n "Pikafish: "
echo "quit" | timeout 2 ./ai/bin/pikafish/pikafish 2>/dev/null | grep -q "Pikafish" && echo "验证成功" || echo "验证失败"

echo ""
echo "=========================================="
echo "   AI引擎下载完成！"
echo "=========================================="
echo ""
echo "文件位置："
echo "  KataGo:    ai/bin/katago/katago"
echo "  模型:      ai/bin/katago/b6.bin.gz"
echo "  Pikafish:  ai/bin/pikafish/pikafish"
echo ""
echo "下一步："
echo "  运行 ./deploy.sh 部署到Docker"
echo ""
