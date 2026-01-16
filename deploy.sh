#!/bin/bash

# 游戏平台一键部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e

APP_NAME="game-server"
IMAGE_NAME="game-platform"
PORT=9527
GIT_REPO="https://github.com/fushengburumeng/myidea.git"
INSTALL_DIR="/opt/game-platform"

echo "=========================================="
echo "   游戏平台一键部署脚本"
echo "=========================================="

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "[错误] 未安装 Docker，正在安装..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
fi

# 检查 Git
if ! command -v git &> /dev/null; then
    echo "[错误] 未安装 Git，正在安装..."
    apt-get update && apt-get install -y git || yum install -y git
fi

# 拉取/更新代码
echo ""
echo "[1/4] 拉取代码..."
if [ -d "$INSTALL_DIR" ]; then
    echo "目录已存在，更新代码..."
    cd "$INSTALL_DIR"
    git pull origin master
else
    echo "克隆仓库..."
    git clone "$GIT_REPO" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# 停止旧容器
echo ""
echo "[2/4] 停止旧容器..."
docker stop $APP_NAME 2>/dev/null || true
docker rm $APP_NAME 2>/dev/null || true

# 构建镜像
echo ""
echo "[3/4] 构建 Docker 镜像..."
docker build -t $IMAGE_NAME .

# 启动容器
echo ""
echo "[4/4] 启动容器..."
docker run -d \
    -p $PORT:$PORT \
    --name $APP_NAME \
    --restart=always \
    $IMAGE_NAME

echo ""
echo "=========================================="
echo "   部署完成!"
echo "=========================================="
echo ""
echo "访问地址: http://$(hostname -I | awk '{print $1}'):$PORT"
echo ""
echo "常用命令:"
echo "  查看日志: docker logs -f $APP_NAME"
echo "  重启服务: docker restart $APP_NAME"
echo "  停止服务: docker stop $APP_NAME"
echo "  更新部署: ./deploy.sh"
echo ""
