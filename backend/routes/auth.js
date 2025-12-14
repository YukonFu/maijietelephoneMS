const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../database');

const router = express.Router();

// 哈希密码
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// 登录
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '请输入用户名和密码' });
        }

        const db = getDb();
        const hashedPassword = hashPassword(password);
        const user = db.prepare('SELECT id, username, role, name FROM users WHERE username = ? AND password = ?')
            .get(username, hashedPassword);

        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取所有用户 (管理员功能)
router.get('/users', (req, res) => {
    try {
        const db = getDb();
        const users = db.prepare('SELECT id, username, role, name, created_at FROM users ORDER BY created_at DESC').all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 创建用户 (管理员功能)
router.post('/users', (req, res) => {
    try {
        const { username, password, role, name } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码为必填项' });
        }

        const validRoles = ['admin', 'boss', 'repair', 'frontdesk'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ error: '无效的角色类型' });
        }

        const db = getDb();
        const hashedPassword = hashPassword(password);
        const result = db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)')
            .run(username, hashedPassword, role || 'frontdesk', name || username);

        res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: '用户名已存在' });
        }
        res.status(500).json({ error: error.message });
    }
});

// 更新用户 (管理员功能)
router.put('/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { password, role, name } = req.body;

        let sql = 'UPDATE users SET';
        const params = [];
        const updates = [];

        if (name !== undefined) {
            updates.push(' name = ?');
            params.push(name);
        }
        if (role) {
            updates.push(' role = ?');
            params.push(role);
        }
        if (password) {
            updates.push(' password = ?');
            params.push(hashPassword(password));
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: '没有需要更新的内容' });
        }

        sql += updates.join(',') + ' WHERE id = ?';
        params.push(id);

        const db = getDb();
        db.prepare(sql).run(...params);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 删除用户 (管理员功能)
router.delete('/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();

        // 防止删除最后一个管理员
        const user = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
        if (user && user.role === 'admin') {
            const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin').count;
            if (adminCount <= 1) {
                return res.status(400).json({ error: '无法删除最后一个管理员账号' });
            }
        }

        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
