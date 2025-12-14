const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保数据目录存在
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据库
initDatabase();

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, '../frontend')));

// API 路由
app.use('/api/orders', require('./routes/orders'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/ocr', require('./routes/ocr'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/auth', require('./routes/auth'));

// 所有其他路由返回前端页面
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 手机店管理系统已启动`);
    console.log(`📍 本地访问: http://localhost:${PORT}`);
    console.log(`📍 局域网访问: http://0.0.0.0:${PORT}`);
});
