#!/bin/bash

# 代码更新脚本 - 用于服务器端更新部署

echo "=========================================="
echo "   代码更新脚本"
echo "=========================================="

# 1. 拉取最新代码
echo ""
echo "[1/4] 拉取最新代码..."
git pull origin master

if [ $? -ne 0 ]; then
    echo "✗ Git pull 失败，请检查"
    exit 1
fi

echo "✓ 代码更新成功"

# 2. 检查AI引擎文件
echo ""
echo "[2/4] 检查 AI 引擎文件..."

if [ ! -f "ai/bin/katago/katago" ] || [ ! -f "ai/bin/pikafish/pikafish" ]; then
    echo "⚠ AI引擎文件缺失，需要重新下载"
    echo "运行: ./scripts/deployment/download-engines.sh"
    read -p "是否现在下载？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./scripts/deployment/download-engines.sh
    else
        echo "跳过下载，继续更新..."
    fi
else
    echo "✓ AI引擎文件存在"
fi

# 3. 停止旧容器
echo ""
echo "[3/4] 停止旧容器..."
docker-compose -f docker/docker-compose.local.yml down

# 4. 重新构建并启动
echo ""
echo "[4/4] 重新构建并启动服务..."
docker-compose -f docker/docker-compose.local.yml up -d --build

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "   更新完成！"
    echo "=========================================="
    echo ""
    echo "查看日志: docker logs -f weiqi-game-server"
    echo "查看状态: docker ps | grep weiqi"
    echo ""

    # 等待容器启动
    sleep 5

    echo "最近日志："
    docker logs --tail 20 weiqi-game-server
else
    echo ""
    echo "✗ 更新失败，请检查错误信息"
    exit 1
fi
