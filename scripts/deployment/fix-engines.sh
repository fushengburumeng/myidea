#!/bin/bash

# 修复AI引擎文件名和权限问题

echo "=========================================="
echo "   修复 AI 引擎问题"
echo "=========================================="

cd ai/bin/katago

# 1. 修复 KataGo 文件名
echo ""
echo "[1/3] 检查 KataGo..."
if [ ! -f "katago" ]; then
    echo "错误：katago 文件不存在"
    echo "当前目录文件："
    ls -lh

    # 查找可能的 katago 可执行文件
    if [ -f "katago-v1.15.3-eigenavx2-linux-x64+bs50" ]; then
        echo "找到：katago-v1.15.3-eigenavx2-linux-x64+bs50"
        echo "重命名为：katago"
        mv katago-v1.15.3-eigenavx2-linux-x64+bs50 katago
        chmod +x katago
    elif [ -d "katago-v1.15.3-eigenavx2-linux-x64+bs50" ]; then
        echo "找到目录，查找可执行文件..."
        find katago-v1.15.3-eigenavx2-linux-x64+bs50 -name "katago*" -type f
        # 如果找到，移动出来
        if [ -f "katago-v1.15.3-eigenavx2-linux-x64+bs50/katago" ]; then
            mv katago-v1.15.3-eigenavx2-linux-x64+bs50/katago ./
            chmod +x katago
        fi
    fi
else
    echo "✓ katago 文件存在"
    chmod +x katago
fi

# 2. 检查模型文件
echo ""
echo "[2/3] 检查模型文件..."
if [ -f "b6.bin.gz" ]; then
    echo "✓ b6.bin.gz 存在"
else
    echo "✗ b6.bin.gz 不存在"
fi

# 3. 修复 Pikafish
echo ""
echo "[3/3] 检查 Pikafish..."
cd ../pikafish

if [ ! -f "pikafish" ]; then
    echo "错误：pikafish 文件不存在"
    echo "当前目录文件："
    ls -lh

    # 查找可能的 pikafish 文件
    if [ -f "pikafish-avx2" ]; then
        echo "找到：pikafish-avx2"
        echo "重命名为：pikafish"
        mv pikafish-avx2 pikafish
        chmod +x pikafish
    fi
else
    echo "✓ pikafish 文件存在"
    chmod +x pikafish
fi

# 返回项目根目录
cd ../../..

# 4. 显示最终状态
echo ""
echo "=========================================="
echo "   最终文件状态"
echo "=========================================="
echo ""
echo "KataGo:"
ls -lh ai/bin/katago/katago ai/bin/katago/b6.bin.gz 2>/dev/null || echo "文件缺失"

echo ""
echo "Pikafish:"
ls -lh ai/bin/pikafish/pikafish 2>/dev/null || echo "文件缺失"

echo ""
echo "=========================================="
echo "   测试引擎"
echo "=========================================="

echo ""
echo "测试 KataGo:"
if ./ai/bin/katago/katago version 2>/dev/null; then
    echo "✓ KataGo 可以运行"
else
    echo "✗ KataGo 无法运行"
    echo "尝试查看错误："
    ./ai/bin/katago/katago version 2>&1 | head -5
fi

echo ""
echo "测试 Pikafish:"
if timeout 2 bash -c 'echo "uci" | ./ai/bin/pikafish/pikafish' 2>/dev/null | grep -q "uciok"; then
    echo "✓ Pikafish 可以运行"
else
    echo "✗ Pikafish 无法运行"
    echo "尝试查看错误："
    timeout 2 bash -c 'echo "uci" | ./ai/bin/pikafish/pikafish' 2>&1 | head -5
fi

echo ""
echo "=========================================="
echo "   下一步"
echo "=========================================="
echo ""
echo "如果引擎测试通过，请重新构建 Docker 镜像："
echo "  docker-compose -f docker-compose.local.yml down"
echo "  docker-compose -f docker-compose.local.yml up -d --build"
echo ""
