@echo off
echo 正在启动游戏服务器...
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未找到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

:: 检查依赖
if not exist "node_modules" (
    echo 正在安装依赖...
    npm install
)

:: 启动服务器
echo.
echo 服务器启动中...
echo 访问地址: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo.
node server.js
pause
