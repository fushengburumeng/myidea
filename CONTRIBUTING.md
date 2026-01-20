# 贡献指南

感谢你对围棋游戏平台项目的关注！本文档将帮助你了解如何为项目做出贡献。

## 📋 开始之前

在开始贡献之前，请：

1. 阅读 [README.md](README.md) 了解项目概况
2. 阅读 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) 了解项目结构规范
3. 查看 [Issues](https://github.com/fushengburumeng/myidea/issues) 了解当前的问题和需求

## 🚀 快速开始

### 1. Fork 项目

点击项目页面右上角的 "Fork" 按钮，将项目 fork 到你的账号下。

### 2. 克隆项目

```bash
git clone https://github.com/你的用户名/myidea.git
cd myidea/weiqi
```

### 3. 创建分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

### 4. 安装依赖

```bash
npm install
```

### 5. 开始开发

```bash
npm start
```

## 📝 贡献类型

### 代码贡献

- 新功能开发
- Bug 修复
- 性能优化
- 代码重构

### 文档贡献

- 改进文档
- 添加示例
- 翻译文档
- 修正错误

### 其他贡献

- 报告 Bug
- 提出新功能建议
- 改进项目结构
- 优化 CI/CD

## 🔧 开发规范

### 代码规范

#### JavaScript

```javascript
// 使用 4 空格缩进
function example() {
    const data = {
        key: 'value'
    };
    return data;
}

// 使用有意义的变量名
const playerName = 'Alice';  // ✅ 好
const pn = 'Alice';          // ❌ 不好

// 添加必要的注释
// 计算围棋棋盘上的气
function calculateLiberties(board, x, y) {
    // 实现...
}
```

#### 文件命名

- 代码文件：小写+连字符 `engine-manager.js`
- 文档文件：大写+下划线 `QUICK_START.md`
- 脚本文件：小写+连字符 `deploy.sh`

### 目录规范

遵循 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) 中的规范：

- 新增文档 → `docs/guides/` 或 `docs/reports/`
- 新增脚本 → `scripts/deployment/` 或 `scripts/maintenance/`
- 新增 AI 代码 → `ai/`
- 新增前端代码 → `public/`

### Git 提交规范

使用清晰的提交信息：

```bash
# 格式
<type>: <subject>

# 类型
feat:     新功能
fix:      Bug 修复
docs:     文档更新
style:    代码格式（不影响功能）
refactor: 重构
perf:     性能优化
test:     测试相关
chore:    构建/工具相关

# 示例
feat: 添加五子棋 AI 难度选择
fix: 修复围棋提子逻辑错误
docs: 更新 Docker 部署文档
refactor: 重构 Worker 线程池实现
```

### 分支命名

```bash
feature/add-gomoku-ai      # 新功能
fix/weiqi-capture-bug      # Bug 修复
docs/update-deployment     # 文档更新
refactor/worker-pool       # 重构
```

## 🧪 测试

### 运行测试

```bash
# 启动服务器
npm start

# 在浏览器中测试
# 访问 http://localhost:9527
```

### 测试清单

- [ ] 功能正常工作
- [ ] 没有控制台错误
- [ ] 代码符合规范
- [ ] 文档已更新
- [ ] 没有破坏现有功能

## 📤 提交 Pull Request

### 1. 推送分支

```bash
git add .
git commit -m "feat: 添加新功能"
git push origin feature/your-feature-name
```

### 2. 创建 Pull Request

1. 访问你 fork 的项目页面
2. 点击 "New Pull Request"
3. 选择你的分支
4. 填写 PR 描述

### 3. PR 描述模板

```markdown
## 变更类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 文档更新
- [ ] 代码重构
- [ ] 性能优化

## 变更说明
简要描述你的变更内容...

## 相关 Issue
Closes #123

## 测试
描述你如何测试这些变更...

## 截图（如适用）
添加截图展示变更效果...

## 检查清单
- [ ] 代码符合项目规范
- [ ] 已添加必要的注释
- [ ] 已更新相关文档
- [ ] 已测试功能正常
- [ ] 没有破坏现有功能
```

## 🐛 报告 Bug

### Bug 报告模板

```markdown
## Bug 描述
清晰简洁地描述 Bug...

## 复现步骤
1. 访问 '...'
2. 点击 '...'
3. 滚动到 '...'
4. 看到错误

## 期望行为
描述你期望发生什么...

## 实际行为
描述实际发生了什么...

## 截图
如果适用，添加截图帮助解释问题...

## 环境信息
- OS: [例如 Ubuntu 24.04]
- 浏览器: [例如 Chrome 120]
- Node.js 版本: [例如 18.x]
- Docker 版本: [例如 24.x]

## 额外信息
添加任何其他相关信息...
```

## 💡 功能建议

### 功能建议模板

```markdown
## 功能描述
清晰简洁地描述你想要的功能...

## 问题背景
这个功能解决什么问题？

## 建议方案
描述你希望如何实现...

## 替代方案
描述你考虑过的其他方案...

## 额外信息
添加任何其他相关信息...
```

## 📚 开发资源

### 项目文档

- [README.md](README.md) - 项目介绍
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - 快速参考
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - 项目规范
- [docs/CLAUDE.md](docs/CLAUDE.md) - 架构设计

### 技术文档

- [Node.js 文档](https://nodejs.org/docs/)
- [Express 文档](https://expressjs.com/)
- [WebSocket 文档](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Canvas API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

### AI 引擎

- [KataGo 文档](https://github.com/lightvector/KataGo)
- [Pikafish 文档](https://github.com/official-pikafish/Pikafish)

## ❓ 常见问题

### Q: 我应该从哪里开始？

A: 查看标记为 "good first issue" 的 Issue，这些是适合新贡献者的任务。

### Q: 我的 PR 多久会被审查？

A: 通常在 1-3 天内会有回复，请耐心等待。

### Q: 我可以同时提交多个 PR 吗？

A: 可以，但建议每个 PR 只关注一个功能或修复。

### Q: 代码审查后需要修改怎么办？

A: 在你的分支上继续提交，PR 会自动更新。

### Q: 我的 PR 被拒绝了怎么办？

A: 不要气馁！查看审查意见，改进后可以重新提交。

## 🤝 行为准则

### 我们的承诺

为了营造开放和友好的环境，我们承诺：

- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化的语言或图像
- 人身攻击或侮辱性评论
- 公开或私下骚扰
- 未经许可发布他人的私人信息
- 其他不道德或不专业的行为

## 📞 联系方式

- **GitHub Issues**: [提交 Issue](https://github.com/fushengburumeng/myidea/issues)
- **GitHub Discussions**: [参与讨论](https://github.com/fushengburumeng/myidea/discussions)

## 🙏 致谢

感谢所有为项目做出贡献的开发者！

---

**最后更新**: 2026-01-20
