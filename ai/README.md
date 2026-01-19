# AI引擎文件放置说明

## 目录结构

请将下载好的AI引擎文件按以下结构放置：

```
ai/
├── bin/
│   ├── katago/
│   │   ├── katago           # KataGo可执行文件（Linux）
│   │   ├── katago.exe       # KataGo可执行文件（Windows）
│   │   ├── b6.bin.gz        # KataGo神经网络模型文件
│   │   └── config.cfg       # KataGo配置文件（已存在）
│   └── pikafish/
│       ├── pikafish         # Pikafish可执行文件（Linux）
│       └── pikafish.exe     # Pikafish可执行文件（Windows）
├── engine-manager.js
├── katago-adapter.js
└── pikafish-adapter.js
```

## 下载地址

### KataGo（围棋引擎）

**可执行文件：**
- Linux: https://github.com/lightvector/KataGo/releases/download/v1.15.3/katago-v1.15.3-eigenavx2-linux-x64.zip
- Windows: https://github.com/lightvector/KataGo/releases/download/v1.15.3/katago-v1.15.3-eigenavx2-windows-x64.zip

**神经网络模型：**
- b6.bin.gz: https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz

### Pikafish（中国象棋引擎）

**可执行文件：**
- Linux: https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-avx2
- Windows: https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-avx2.exe

## 安装步骤

### 1. 下载KataGo

```bash
# Linux
cd ai/bin/katago
wget https://github.com/lightvector/KataGo/releases/download/v1.15.3/katago-v1.15.3-eigenavx2-linux-x64.zip
unzip katago-v1.15.3-eigenavx2-linux-x64.zip
chmod +x katago

# 下载模型
wget https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz -O b6.bin.gz
```

### 2. 下载Pikafish

```bash
# Linux
cd ai/bin/pikafish
wget https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-avx2 -O pikafish
chmod +x pikafish
```

### 3. 验证安装

```bash
# 测试KataGo
./ai/bin/katago/katago version

# 测试Pikafish
echo "quit" | ./ai/bin/pikafish/pikafish
```

## Docker部署

确保AI引擎文件已放置到正确位置后，运行：

```bash
./deploy.sh
```

Docker会自动将本地的ai文件夹复制到容器中，无需重新下载。

## 注意事项

1. **Linux可执行文件**：确保有执行权限（`chmod +x`）
2. **模型文件**：b6.bin.gz必须存在，否则KataGo无法启动
3. **配置文件**：config.cfg已经优化配置，无需修改
4. **镜像源**：Dockerfile已配置清华大学镜像源，加速构建
