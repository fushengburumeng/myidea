#!/bin/bash

# 完整修复和部署脚本 - 一键解决所有问题

set -e

echo "=========================================="
echo "   AI 引擎完整修复和部署脚本"
echo "=========================================="

# 1. 检查当前目录
if [ ! -f "server.js" ]; then
    echo "✗ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo ""
echo "[1/6] 检查 AI 引擎文件..."

# 检查文件是否存在
if [ ! -d "ai/bin/katago" ] || [ ! -d "ai/bin/pikafish" ]; then
    echo "✗ AI 引擎目录不存在"
    echo "请先运行: ./download-engines.sh"
    exit 1
fi

# 2. 修复文件名和权限
echo ""
echo "[2/6] 修复文件名和权限..."

cd ai/bin/katago
# 修复 KataGo 文件名
if [ ! -f "katago" ]; then
    if [ -f "katago-v1.15.3-eigenavx2-linux-x64+bs50" ]; then
        echo "重命名: katago-v1.15.3-eigenavx2-linux-x64+bs50 -> katago"
        mv katago-v1.15.3-eigenavx2-linux-x64+bs50 katago
    elif [ -d "katago-v1.15.3-eigenavx2-linux-x64+bs50" ]; then
        if [ -f "katago-v1.15.3-eigenavx2-linux-x64+bs50/katago" ]; then
            echo "从目录中提取: katago"
            mv katago-v1.15.3-eigenavx2-linux-x64+bs50/katago ./
        fi
    else
        echo "✗ 找不到 KataGo 可执行文件"
        exit 1
    fi
fi
chmod +x katago
echo "✓ KataGo 文件已修复"

cd ../pikafish
# 修复 Pikafish 文件名
if [ ! -f "pikafish" ]; then
    if [ -f "pikafish-avx2" ]; then
        echo "重命名: pikafish-avx2 -> pikafish"
        mv pikafish-avx2 pikafish
    else
        echo "✗ 找不到 Pikafish 可执行文件"
        exit 1
    fi
fi
chmod +x pikafish
echo "✓ Pikafish 文件已修复"

cd ../../..

# 3. 测试本地引擎
echo ""
echo "[3/6] 测试本地引擎..."

echo -n "KataGo: "
if ./ai/bin/katago/katago version > /dev/null 2>&1; then
    echo "✓ 可运行"
else
    echo "✗ 无法运行"
    echo "错误信息:"
    ./ai/bin/katago/katago version 2>&1 | head -3
fi

echo -n "Pikafish: "
if timeout 2 bash -c 'echo "uci" | ./ai/bin/pikafish/pikafish' 2>/dev/null | grep -q "uciok"; then
    echo "✓ 可运行"
else
    echo "✗ 无法运行"
fi

# 4. 停止旧容器
echo ""
echo "[4/6] 停止旧容器..."
docker-compose -f docker-compose.local.yml down 2>/dev/null || echo "没有运行的容器"

# 5. 重新构建
echo ""
echo "[5/6] 重新构建 Docker 镜像..."
echo "这可能需要几分钟，请耐心等待..."
echo ""

docker-compose -f docker-compose.local.yml build --no-cache 2>&1 | grep -E "Step|AI 引擎|katago|pikafish|✓|✗|警告|错误" || docker-compose -f docker-compose.local.yml build --no-cache

if [ $? -ne 0 ]; then
    echo ""
    echo "✗ 构建失败"
    exit 1
fi

echo ""
echo "✓ 构建成功"

# 6. 启动服务
echo ""
echo "[6/6] 启动服务..."
docker-compose -f docker-compose.local.yml up -d

if [ $? -ne 0 ]; then
    echo ""
    echo "✗ 启动失败"
    exit 1
fi

echo ""
echo "✓ 服务已启动"

# 等待容器启动
echo ""
echo "等待容器启动..."
sleep 8

# 7. 验证部署
echo ""
echo "=========================================="
echo "   部署验证"
echo "=========================================="

echo ""
echo "容器状态:"
docker ps | grep weiqi

echo ""
echo "AI 引擎状态:"
docker logs weiqi-game-server 2>&1 | grep -E "KataGo可用|Pikafish可用|AI引擎状态" | tail -3

echo ""
echo "最近日志:"
docker logs --tail 20 weiqi-game-server

echo ""
echo "=========================================="
echo "   部署完成！"
echo "=========================================="
echo ""
echo "访问地址: http://$(hostname -I | awk '{print $1}'):9527"
echo ""
echo "常用命令:"
echo "  查看日志:  docker logs -f weiqi-game-server"
echo "  重启服务:  docker restart weiqi-game-server"
echo "  停止服务:  docker-compose -f docker-compose.local.yml down"
echo ""
echo "如果 AI 仍然不可用，请查看完整日志:"
echo "  docker logs weiqi-game-server | less"
echo ""
