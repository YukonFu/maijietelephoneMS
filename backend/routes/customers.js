const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

// 获取所有客户
router.get('/', (req, res) => {
    try {
        const { search } = req.query;
        let sql = `
            SELECT c.*, COUNT(o.id) as order_count 
            FROM customers c 
            LEFT JOIN orders o ON c.id = o.customer_id 
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += ' AND (c.name LIKE ? OR c.phone LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        sql += ' GROUP BY c.id ORDER BY c.created_at DESC';

        const db = getDb();
        const customers = db.prepare(sql).all(...params);
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取客户详情及历史工单
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);

        if (!customer) {
            return res.status(404).json({ error: '客户不存在' });
        }

        const orders = db.prepare(`
            SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC
        `).all(req.params.id);

        customer.orders = orders;
        customer.total_orders = orders.length;
        customer.total_spent = orders.reduce((sum, o) => sum + (o.final_price || 0), 0);

        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 通过手机号查询客户历史
router.get('/phone/:phone', (req, res) => {
    try {
        const db = getDb();
        const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(req.params.phone);

        if (!customer) {
            return res.status(404).json({ error: '客户不存在' });
        }

        const orders = db.prepare(`
            SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC
        `).all(customer.id);

        customer.orders = orders;
        customer.total_orders = orders.length;
        customer.total_spent = orders.reduce((sum, o) => sum + (o.final_price || 0), 0);

        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 更新客户信息
router.put('/:id', (req, res) => {
    try {
        const { name, phone } = req.body;
        const db = getDb();
        db.prepare('UPDATE customers SET name = ?, phone = ? WHERE id = ?').run(name, phone, req.params.id);
        res.json({ message: '客户信息更新成功' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
