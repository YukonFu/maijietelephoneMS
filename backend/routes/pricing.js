const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

// 获取所有价格项目
router.get('/', (req, res) => {
    try {
        const { category } = req.query;
        let sql = 'SELECT * FROM pricing WHERE 1=1';
        const params = [];

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }

        sql += ' ORDER BY category, name';

        const db = getDb();
        const pricing = db.prepare(sql).all(...params);
        res.json(pricing);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取价格分类
router.get('/categories', (req, res) => {
    try {
        const db = getDb();
        const categories = db.prepare('SELECT DISTINCT category FROM pricing ORDER BY category').all();
        res.json(categories.map(c => c.category));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取所有品牌
router.get('/brands', (req, res) => {
    try {
        const db = getDb();
        const brands = db.prepare("SELECT DISTINCT brand FROM pricing WHERE brand != '' ORDER BY brand").all();
        res.json(brands.map(b => b.brand));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 根据品牌获取型号
router.get('/models/:brand', (req, res) => {
    try {
        const db = getDb();
        const models = db.prepare("SELECT DISTINCT model FROM pricing WHERE brand = ? AND model != '' ORDER BY model").all(req.params.brand);
        res.json(models.map(m => m.model));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 根据品牌和型号获取维修项目
router.get('/items/:brand/:model', (req, res) => {
    try {
        const db = getDb();
        const items = db.prepare('SELECT * FROM pricing WHERE brand = ? AND model = ? ORDER BY category, name').all(req.params.brand, req.params.model);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 添加价格项目
router.post('/', (req, res) => {
    try {
        const { category, name, name_it, brand, model, price } = req.body;

        if (!category || !name || price === undefined) {
            return res.status(400).json({ error: '缺少必填字段' });
        }

        const db = getDb();
        const result = db.prepare('INSERT INTO pricing (category, name, name_it, brand, model, price) VALUES (?, ?, ?, ?, ?, ?)').run(
            category,
            name,
            name_it || '',
            brand || '',
            model || '',
            price
        );
        res.status(201).json({
            id: result.lastInsertRowid,
            message: '价格项目添加成功'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 更新价格项目
router.put('/:id', (req, res) => {
    try {
        const { category, name, name_it, brand, model, price } = req.body;
        const db = getDb();
        db.prepare('UPDATE pricing SET category = ?, name = ?, name_it = ?, brand = ?, model = ?, price = ? WHERE id = ?').run(
            category,
            name,
            name_it || '',
            brand || '',
            model || '',
            price,
            req.params.id
        );
        res.json({ message: '价格项目更新成功' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 删除价格项目
router.delete('/:id', (req, res) => {
    try {
        const db = getDb();
        db.prepare('DELETE FROM pricing WHERE id = ?').run(req.params.id);
        res.json({ message: '价格项目删除成功' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
