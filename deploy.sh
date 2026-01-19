#!/bin/bash

# 游戏平台一键部署脚本 (支持AI引擎)
# 适用于 Ubuntu 24.04 LTS
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e

APP_NAME="weiqi-game-server"
IMAGE_NAME="weiqi-game-platform"
PORT=9527

echo "=========================================="
echo "   围棋游戏平台 Docker 部署脚本"
echo "=========================================="

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo ""
    echo "[错误] 未安装 Docker，正在安装..."
    curl -fsSL https://get.docker.com | sh
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    echo "✓ Docker 安装完成"
    echo "注意：需要重新登录以使用户组生效"
fi

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo ""
    echo "[错误] 未安装 Docker Compose，正在安装..."
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
    echo "✓ Docker Compose 安装完成"
fi

# 检查是否在项目目录
if [ ! -f "server.js" ]; then
    echo ""
    echo "[错误] 请在项目根目录运行此脚本"
    exit 1
fi

# 停止旧容器
echo ""
echo "[1/4] 停止旧容器..."
docker stop $APP_NAME 2>/dev/null || true
docker rm $APP_NAME 2>/dev/null || true
echo "✓ 旧容器已清理"

# 构建镜像
echo ""
echo "[2/4] 构建 Docker 镜像（包含AI引擎）..."
echo "注意：首次构建会下载AI引擎，可能需要5-10分钟"
docker build -t $IMAGE_NAME . --no-cache
echo "✓ 镜像构建完成"

# 创建日志目录
echo ""
echo "[3/4] 创建日志目录..."
mkdir -p logs
echo "✓ 日志目录已创建"

# 启动容器
echo ""
echo "[4/4] 启动容器..."
docker run -d \
    -p $PORT:$PORT \
    --name $APP_NAME \
    --restart=always \
    --memory=2g \
    --cpus=2 \
    -v "$(pwd)/logs:/app/logs" \
    $IMAGE_NAME

# 等待容器启动
echo ""
echo "等待服务启动..."
sleep 5

# 检查容器状态
if docker ps | grep -q $APP_NAME; then
    echo "✓ 容器启动成功"
else
    echo "✗ 容器启动失败，查看日志："
    docker logs $APP_NAME
    exit 1
fi

# 检查AI引擎状态
echo ""
echo "检查AI引擎状态..."
sleep 3
docker logs $APP_NAME 2>&1 | grep -E "KataGo|Pikafish|AI引擎" || echo "等待AI引擎初始化..."

echo ""
echo "=========================================="
echo "   部署完成！"
echo "=========================================="
echo ""
echo "访问地址: http://$(hostname -I | awk '{print $1}'):$PORT"
echo ""
echo "常用命令:"
echo "  查看日志:     docker logs -f $APP_NAME"
echo "  查看AI状态:   docker logs $APP_NAME | grep -E 'KataGo|Pikafish'"
echo "  重启服务:     docker restart $APP_NAME"
echo "  停止服务:     docker stop $APP_NAME"
echo "  进入容器:     docker exec -it $APP_NAME sh"
echo "  更新部署:     ./deploy.sh"
echo ""
echo "使用 Docker Compose:"
echo "  启动:         docker-compose up -d"
echo "  停止:         docker-compose down"
echo "  查看日志:     docker-compose logs -f"
echo ""
