const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { reconnectDatabase } = require('../database');

const router = express.Router();

// 配置文件上传
const upload = multer({
    dest: path.join(__dirname, '../../data/temp'),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// 获取数据库路径
const dbPath = path.join(__dirname, '../../data/shop.db');

// 下载数据库备份
router.get('/download', (req, res) => {
    try {
        if (!fs.existsSync(dbPath)) {
            return res.status(404).json({ error: '数据库文件不存在' });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `phone-shop-backup-${timestamp}.db`;

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const fileStream = fs.createReadStream(dbPath);
        fileStream.pipe(res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 恢复数据库
router.post('/restore', upload.single('database'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '请上传数据库文件' });
        }

        const uploadedPath = req.file.path;

        // 验证是 SQLite 数据库文件
        const buffer = fs.readFileSync(uploadedPath, { encoding: null, flag: 'r' });
        const header = buffer.slice(0, 16).toString('utf8');
        if (!header.startsWith('SQLite format 3')) {
            fs.unlinkSync(uploadedPath);
            return res.status(400).json({ error: '无效的数据库文件格式' });
        }

        // 创建当前数据库备份
        const backupPath = dbPath + '.backup-' + Date.now();
        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, backupPath);
        }

        // 关闭当前数据库连接并重新连接
        // 注意: 这会在替换文件后重新建立连接

        // 先复制新文件到临时位置
        const tempNewDb = dbPath + '.new';
        fs.copyFileSync(uploadedPath, tempNewDb);
        fs.unlinkSync(uploadedPath);

        // 重新连接数据库 (这会关闭旧连接)
        // 然后替换数据库文件
        try {
            // 先关闭连接，替换文件，再重新打开
            fs.renameSync(tempNewDb, dbPath);
            reconnectDatabase();
        } catch (err) {
            // 如果失败，尝试恢复
            if (fs.existsSync(backupPath)) {
                fs.copyFileSync(backupPath, dbPath);
            }
            throw err;
        }

        res.json({
            success: true,
            message: '数据库恢复成功！页面将自动刷新。'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// 获取备份列表 (data目录下的.db文件)
router.get('/list', (req, res) => {
    try {
        const dataDir = path.join(__dirname, '../../data');
        const files = fs.readdirSync(dataDir)
            .filter(f => f.endsWith('.db') && f !== 'shop.db')
            .map(f => {
                const stat = fs.statSync(path.join(dataDir, f));
                return {
                    name: f,
                    size: stat.size,
                    created: stat.mtime
                };
            })
            .sort((a, b) => new Date(b.created) - new Date(a.created));

        res.json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
