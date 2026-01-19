#!/bin/bash

# Docker 构建调试脚本 - 检查构建过程中的问题

echo "=========================================="
echo "   Docker 构建调试"
echo "=========================================="

echo ""
echo "[1/5] 检查本地 AI 引擎文件..."
echo ""
echo "KataGo 目录:"
ls -lh ai/bin/katago/ | grep -E "katago|b6.bin.gz|config.cfg"

echo ""
echo "Pikafish 目录:"
ls -lh ai/bin/pikafish/ | grep "pikafish"

echo ""
echo "[2/5] 测试本地引擎..."
echo ""
echo "测试 KataGo:"
if ./ai/bin/katago/katago version 2>/dev/null; then
    echo "✓ KataGo 本地可运行"
else
    echo "✗ KataGo 本地无法运行"
fi

echo ""
echo "测试 Pikafish:"
if timeout 2 bash -c 'echo "uci" | ./ai/bin/pikafish/pikafish' 2>/dev/null | grep -q "uciok"; then
    echo "✓ Pikafish 本地可运行"
else
    echo "✗ Pikafish 本地无法运行"
fi

echo ""
echo "[3/5] 检查 .dockerignore 文件..."
if [ -f ".dockerignore" ]; then
    echo "⚠ 发现 .dockerignore 文件，检查是否排除了 ai/ 目录:"
    cat .dockerignore | grep -E "ai|bin"
    if [ $? -eq 0 ]; then
        echo "✗ 警告: .dockerignore 可能排除了 AI 引擎文件！"
        echo "建议: 从 .dockerignore 中移除 ai/ 相关规则"
    fi
else
    echo "✓ 没有 .dockerignore 文件"
fi

echo ""
echo "[4/5] 构建测试镜像（带详细输出）..."
echo ""
docker build -f Dockerfile.local -t weiqi-test --progress=plain . 2>&1 | grep -E "ai/bin|katago|pikafish|警告|错误|✓|✗"

echo ""
echo "[5/5] 检查构建的镜像..."
echo ""
echo "启动临时容器检查文件:"
docker run --rm weiqi-test sh -c "ls -lh /app/ai/bin/katago/ && ls -lh /app/ai/bin/pikafish/"

echo ""
echo "=========================================="
echo "   调试完成"
echo "=========================================="
echo ""
echo "如果看到引擎文件缺失，可能的原因："
echo "1. .dockerignore 排除了 ai/ 目录"
echo "2. ai/bin/ 目录在 git 中被忽略"
echo "3. COPY . . 没有复制 ai/bin/ 目录"
echo ""
echo "解决方案："
echo "1. 检查并修改 .dockerignore"
echo "2. 确保 ai/bin/ 目录存在且有文件"
echo "3. 使用 COPY ai/bin /app/ai/bin 显式复制"
echo ""
