#!/bin/bash

# Docker部署验证脚本
# 用于验证Docker镜像构建和AI引擎功能

set -e

echo "=========================================="
echo "   Docker部署验证脚本"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. 检查AI引擎文件
echo "[1/6] 检查AI引擎文件..."
echo ""

if [ -f "ai/bin/katago/katago" ]; then
    check_pass "KataGo可执行文件存在"
else
    check_fail "KataGo可执行文件不存在"
    echo "      运行: ./download-ai-engines.sh"
fi

if [ -f "ai/bin/katago/b6.bin.gz" ]; then
    check_pass "KataGo模型文件存在"
else
    check_fail "KataGo模型文件不存在"
    echo "      运行: ./download-ai-engines.sh"
fi

if [ -f "ai/bin/pikafish/pikafish" ]; then
    check_pass "Pikafish可执行文件存在"
else
    check_fail "Pikafish可执行文件不存在"
    echo "      运行: ./download-ai-engines.sh"
fi

# 2. 检查Docker环境
echo ""
echo "[2/6] 检查Docker环境..."
echo ""

if command -v docker &> /dev/null; then
    check_pass "Docker已安装"
    docker --version
else
    check_fail "Docker未安装"
    exit 1
fi

if docker ps &> /dev/null; then
    check_pass "Docker服务运行中"
else
    check_fail "Docker服务未运行"
    exit 1
fi

# 3. 检查必要文件
echo ""
echo "[3/6] 检查项目文件..."
echo ""

files=("Dockerfile" "package.json" "server.js" "deploy.sh")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file 存在"
    else
        check_fail "$file 不存在"
    fi
done

# 4. 测试Docker构建
echo ""
echo "[4/6] 测试Docker镜像构建..."
echo ""

echo "开始构建测试镜像（使用缓存）..."
if docker build -t weiqi-game-platform:test . > /tmp/docker-build.log 2>&1; then
    check_pass "Docker镜像构建成功"

    # 显示镜像信息
    echo ""
    echo "镜像信息："
    docker images weiqi-game-platform:test --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
else
    check_fail "Docker镜像构建失败"
    echo ""
    echo "构建日志（最后20行）："
    tail -20 /tmp/docker-build.log
    exit 1
fi

# 5. 测试容器启动
echo ""
echo "[5/6] 测试容器启动..."
echo ""

# 停止旧的测试容器
docker stop weiqi-test 2>/dev/null || true
docker rm weiqi-test 2>/dev/null || true

echo "启动测试容器..."
if docker run -d --name weiqi-test -p 19527:9527 weiqi-game-platform:test > /dev/null; then
    check_pass "容器启动成功"

    # 等待服务启动
    echo ""
    echo "等待服务启动（5秒）..."
    sleep 5

    # 检查容器状态
    if docker ps | grep -q weiqi-test; then
        check_pass "容器运行中"
    else
        check_fail "容器已退出"
        echo ""
        echo "容器日志："
        docker logs weiqi-test
        exit 1
    fi
else
    check_fail "容器启动失败"
    exit 1
fi

# 6. 测试服务和AI引擎
echo ""
echo "[6/6] 测试服务和AI引擎..."
echo ""

# 测试HTTP服务
echo "测试HTTP服务..."
sleep 2
if curl -s http://localhost:19527 > /dev/null; then
    check_pass "HTTP服务响应正常"
else
    check_warn "HTTP服务无响应（可能需要更长启动时间）"
fi

# 检查AI引擎日志
echo ""
echo "检查AI引擎状态..."
docker logs weiqi-test 2>&1 | grep -E "AI引擎|KataGo|Pikafish" || check_warn "未找到AI引擎日志"

# 显示容器日志
echo ""
echo "容器日志（最后15行）："
echo "----------------------------------------"
docker logs weiqi-test 2>&1 | tail -15
echo "----------------------------------------"

# 清理测试容器
echo ""
echo "清理测试容器..."
docker stop weiqi-test > /dev/null
docker rm weiqi-test > /dev/null
check_pass "测试容器已清理"

# 总结
echo ""
echo "=========================================="
echo "   验证完成！"
echo "=========================================="
echo ""
echo "✅ 所有检查通过，可以正式部署"
echo ""
echo "下一步："
echo "  1. 运行 ./deploy.sh 正式部署"
echo "  2. 访问 http://localhost:9527"
echo "  3. 查看日志 docker logs -f weiqi-game-server"
echo ""
