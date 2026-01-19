# AI引擎部署操作文档

## 概述

本文档提供在服务器上部署AI引擎的详细步骤。服务器配置：2核CPU / 2GB内存 / 40GB硬盘。

**支持的AI引擎：**
- **KataGo** - 围棋AI（使用b6小模型）
- **Pikafish** - 中国象棋AI（基于Stockfish NNUE）
- **增强算法** - 五子棋AI（本地JavaScript实现）

---

## 一、服务器环境准备

### 1.1 系统要求

- **操作系统**: Linux (Ubuntu 20.04+ / CentOS 7+) 或 Windows Server
- **Node.js**: v14.0.0 或更高版本
- **内存**: 至少 2GB RAM
- **硬盘**: 至少 500MB 可用空间（用于引擎和模型）

### 1.2 检查Node.js版本

```bash
node --version
npm --version
```

如果未安装Node.js，请先安装：

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

---

## 二、下载AI引擎

### 2.1 创建引擎目录

```bash
cd /path/to/weiqi
mkdir -p ai/bin/katago
mkdir -p ai/bin/pikafish
```

### 2.2 下载KataGo（围棋引擎）

**Linux系统：**

```bash
cd ai/bin/katago

# 下载KataGo可执行文件（选择适合你CPU的版本）
# AVX2版本（推荐，适用于较新的CPU）
wget https://github.com/lightvector/KataGo/releases/download/v1.14.1/katago-v1.14.1-linux-x64.zip
unzip katago-v1.14.1-linux-x64.zip
chmod +x katago

# 或者，如果CPU不支持AVX2，使用OpenBLAS版本
# wget https://github.com/lightvector/KataGo/releases/download/v1.14.1/katago-v1.14.1-opencl-linux-x64.zip

# 下载神经网络模型（b6小模型，约15MB）
wget https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz
mv g170e-b6c96-s175395328-d26788732.bin.gz b6.bin.gz

# 创建配置文件
cat > config.cfg << 'EOF'
# KataGo配置文件（低配服务器优化）
logSearchInfo = false
logToStderr = false
maxVisits = 100
numSearchThreads = 1
EOF

# 测试KataGo是否正常工作
echo -e "boardsize 9\ngenmove b\nquit" | ./katago gtp -model b6.bin.gz -config config.cfg
```

**Windows系统：**

```powershell
cd ai\bin\katago

# 下载KataGo Windows版本
# 访问 https://github.com/lightvector/KataGo/releases
# 下载 katago-v1.14.1-windows-x64.zip
# 解压到当前目录

# 下载模型文件
# 访问 https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz
# 重命名为 b6.bin.gz

# 创建配置文件 config.cfg（内容同上）

# 测试
echo boardsize 9 | katago.exe gtp -model b6.bin.gz -config config.cfg
```

### 2.3 下载Pikafish（象棋引擎）

**Linux系统：**

```bash
cd ai/bin/pikafish

# 下载Pikafish（选择适合你CPU的版本）
# BMI2版本（推荐，适用于较新的Intel/AMD CPU）
wget https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-bmi2
chmod +x pikafish-bmi2
mv pikafish-bmi2 pikafish

# 如果CPU不支持BMI2，使用AVX2版本
# wget https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-avx2
# chmod +x pikafish-avx2
# mv pikafish-avx2 pikafish

# 测试Pikafish是否正常工作
echo -e "uci\nisready\nposition startpos\ngo depth 5\nquit" | ./pikafish
```

**Windows系统：**

```powershell
cd ai\bin\pikafish

# 下载Pikafish Windows版本
# 访问 https://github.com/official-pikafish/Pikafish/releases
# 下载 pikafish-bmi2.exe
# 重命名为 pikafish.exe

# 测试
echo uci | pikafish.exe
```

---

## 三、验证引擎安装

### 3.1 检查文件结构

确保目录结构如下：

```
weiqi/
├── ai/
│   ├── engine-manager.js
│   ├── katago-adapter.js
│   ├── pikafish-adapter.js
│   └── bin/
│       ├── katago/
│       │   ├── katago (或 katago.exe)
│       │   ├── b6.bin.gz
│       │   └── config.cfg
│       └── pikafish/
│           └── pikafish (或 pikafish.exe)
├── server.js
├── package.json
└── public/
```

### 3.2 测试引擎

```bash
# 返回项目根目录
cd /path/to/weiqi

# 安装依赖
npm install

# 启动服务器（会自动检测引擎）
npm start
```

查看启动日志，应该看到：

```
[EngineManager] KataGo可用: true /path/to/ai/bin/katago/katago
[EngineManager] Pikafish可用: true /path/to/ai/bin/pikafish/pikafish
游戏服务器运行在 http://localhost:9527
AI引擎状态: KataGo可用=true, Pikafish可用=true
```

---

## 四、性能调优

### 4.1 KataGo性能调整

编辑 `ai/bin/katago/config.cfg`：

```cfg
# 降低搜索次数可加快响应（牺牲棋力）
maxVisits = 50          # 默认100，可降到50（更快）或提高到200（更强）

# 单线程，避免CPU占用过高
numSearchThreads = 1    # 保持为1

# 禁用日志
logSearchInfo = false
logToStderr = false
```

**性能参考：**
- `maxVisits = 50`: 响应时间 1-2秒，业余初段水平
- `maxVisits = 100`: 响应时间 2-5秒，业余高段水平
- `maxVisits = 200`: 响应时间 5-10秒，接近职业水平

### 4.2 Pikafish性能调整

编辑 `ai/pikafish-adapter.js` 中的配置：

```javascript
// 在 start() 方法中修改
this.send('setoption name Threads value 1');  // 线程数（保持为1）
this.send('setoption name Hash value 64');    // 哈希表大小（MB）

// 在 getMove() 方法中修改搜索深度
async getMove(fen, depth = 10) {  // depth: 8-12，越大越强但越慢
```

**性能参考：**
- `depth = 8`: 响应时间 <1秒，业余水平
- `depth = 10`: 响应时间 1-2秒，专业水平（推荐）
- `depth = 12`: 响应时间 3-5秒，大师水平

### 4.3 引擎空闲超时

编辑 `ai/engine-manager.js`：

```javascript
// 空闲60秒后关闭引擎（节省内存）
this.idleTimeout = 60000;  // 单位：毫秒
```

---

## 五、监控与维护

### 5.1 查看内存使用

```bash
# 查看进程内存占用
ps aux | grep -E 'node|katago|pikafish'

# 持续监控
watch -n 5 'free -m && ps aux | grep -E "node|katago|pikafish" | grep -v grep'
```

**预期内存占用：**
- Node.js服务器: 50-100MB
- KataGo (运行时): 200-400MB
- Pikafish (运行时): 100-200MB
- **总计峰值**: 约 500-700MB

### 5.2 查看日志

```bash
# 如果使用PM2管理
pm2 logs weiqi

# 如果使用systemd
journalctl -u weiqi -f

# 直接运行时，日志输出到控制台
```

### 5.3 重启服务

```bash
# PM2
pm2 restart weiqi

# systemd
sudo systemctl restart weiqi

# Docker
docker restart weiqi-container
```

---

## 六、故障排查

### 6.1 引擎未找到

**错误信息：** `KataGo引擎文件不存在，请先下载引擎`

**解决方法：**
1. 检查文件路径是否正确
2. 检查文件是否有执行权限：`chmod +x ai/bin/katago/katago`
3. 检查文件是否损坏：重新下载

### 6.2 引擎启动失败

**错误信息：** `[Pikafish] 进程错误: spawn EACCES`

**解决方法：**
```bash
# 添加执行权限
chmod +x ai/bin/pikafish/pikafish
chmod +x ai/bin/katago/katago
```

### 6.3 引擎响应超时

**错误信息：** `引擎响应超时`

**解决方法：**
1. 降低搜索深度/访问次数
2. 检查服务器CPU负载：`top`
3. 增加超时时间（在adapter文件中修改）

### 6.4 模型文件未找到

**错误信息：** `Could not load model file`

**解决方法：**
```bash
# 检查模型文件是否存在
ls -lh ai/bin/katago/b6.bin.gz

# 重新下载模型
cd ai/bin/katago
wget https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz -O b6.bin.gz
```

### 6.5 内存不足

**症状：** 引擎频繁崩溃或服务器卡顿

**解决方法：**
1. 降低KataGo的maxVisits
2. 降低Pikafish的Hash大小
3. 减少idleTimeout，让引擎更快关闭
4. 考虑升级服务器内存

---

## 七、生产环境部署

### 7.1 使用PM2管理进程

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name weiqi

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs weiqi
```

### 7.2 使用systemd服务

创建服务文件 `/etc/systemd/system/weiqi.service`：

```ini
[Unit]
Description=Weiqi Game Server with AI
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/weiqi
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=weiqi

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable weiqi
sudo systemctl start weiqi
sudo systemctl status weiqi
```

### 7.3 使用Docker部署

已有 `deploy.sh` 脚本，确保Dockerfile包含AI引擎：

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install --production

# 复制应用代码
COPY . .

# 复制AI引擎（需要先下载到本地）
COPY ai/bin ./ai/bin

# 设置执行权限
RUN chmod +x ai/bin/katago/katago || true
RUN chmod +x ai/bin/pikafish/pikafish || true

EXPOSE 9527

CMD ["node", "server.js"]
```

---

## 八、安全建议

### 8.1 限制引擎资源

使用cgroups限制引擎进程的资源使用：

```bash
# 限制CPU使用率为50%
cgcreate -g cpu:/katago
cgset -r cpu.cfs_quota_us=50000 katago
cgexec -g cpu:katago ./katago gtp ...
```

### 8.2 防火墙配置

```bash
# 只开放必要端口
sudo ufw allow 9527/tcp
sudo ufw enable
```

### 8.3 定期更新

```bash
# 定期更新引擎到最新版本
cd ai/bin/katago
wget https://github.com/lightvector/KataGo/releases/latest/download/katago-v1.x.x-linux-x64.zip
```

---

## 九、备份与恢复

### 9.1 备份引擎文件

```bash
# 备份整个ai目录
tar -czf ai-engines-backup.tar.gz ai/

# 恢复
tar -xzf ai-engines-backup.tar.gz
```

### 9.2 配置文件备份

重要配置文件：
- `ai/bin/katago/config.cfg`
- `ai/engine-manager.js`
- `server.js`

---

## 十、常见问题FAQ

**Q: 可以同时运行多个AI引擎实例吗？**
A: 当前实现使用单例模式，同一时间只有一个引擎实例。如需支持并发，需要修改engine-manager.js实现引擎池。

**Q: 如何禁用某个AI引擎？**
A: 删除或重命名对应的引擎可执行文件，系统会自动回退到本地AI。

**Q: AI响应太慢怎么办？**
A: 降低搜索深度/访问次数，或升级服务器配置。

**Q: 可以使用更强的模型吗？**
A: 可以，但需要更多内存。KataGo支持b10、b15等更大模型，下载后修改config.cfg中的模型路径。

**Q: 如何查看AI引擎状态？**
A: 访问 `/api/ai-status` 端点（需要在server.js中添加对应路由）。

---

## 联系与支持

如遇到问题，请检查：
1. GitHub Issues: 项目issue页面
2. 引擎官方文档:
   - KataGo: https://github.com/lightvector/KataGo
   - Pikafish: https://github.com/official-pikafish/Pikafish

---

**部署完成！** 现在你的服务器已经配置好AI引擎，可以提供高质量的AI对弈服务了。
