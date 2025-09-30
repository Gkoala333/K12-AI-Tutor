#!/bin/bash

echo "🎓 启动 K12 AI Tutor 智能学习辅导助教系统"
echo "================================================"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm，请先安装 npm"
    exit 1
fi

# 检查数据库是否存在
if [ ! -f "k12_tutor.db" ]; then
    echo "📊 设置数据库..."
    node setup_database.js
    if [ $? -eq 0 ]; then
        echo "✅ 数据库设置完成"
    else
        echo "❌ 数据库设置失败"
        exit 1
    fi
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ 依赖安装完成"
    else
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

echo ""
echo "🚀 启动服务器..."
echo "📍 访问地址: http://localhost:3000"
echo "👤 演示账户: demo_student / demo123"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "================================================"

# 启动服务器
node server.js
