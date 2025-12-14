const express = require('express');
const { getDb, generateOrderNo } = require('../database');

const router = express.Router();

// 获取所有工单
router.get('/', (req, res) => {
    try {
        const { status, search } = req.query;
        let sql = `
            SELECT o.*, c.name as customer_name, c.phone as customer_phone
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            sql += ' AND o.status = ?';
            params.push(status);
        }

        if (search) {
            sql += ' AND (o.order_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        sql += ' ORDER BY o.created_at DESC';

        const db = getDb();
        const orders = db.prepare(sql).all(...params);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取单个工单
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const order = db.prepare(`
            SELECT o.*, c.name as customer_name, c.phone as customer_phone
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
        `).get(req.params.id);

        if (!order) {
            return res.status(404).json({ error: '工单不存在' });
        }

        // 获取工单项目
        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
        order.items = items;

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 创建工单
router.post('/', (req, res) => {
    try {
        const db = getDb();
        const createOrderTransaction = db.transaction(() => {
            const { customer_name, customer_phone, device_brand, device_model, device_password, pattern_password, device_power_on, problem, estimated_price, deposit, estimated_date, items, status, order_channel } = req.body;

            // 验证必填字段
            if (!customer_name || !customer_phone || !device_brand || !device_model || !problem) {
                throw new Error('缺少必填字段');
            }

            // 查找或创建客户（姓名+电话号码完全匹配才算同一客户）
            let customer = db.prepare('SELECT * FROM customers WHERE name = ? AND phone = ?').get(customer_name, customer_phone);
            if (!customer) {
                // 新客户：创建记录
                const result = db.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)').run(customer_name, customer_phone);
                customer = { id: result.lastInsertRowid };
            }
            // 如果姓名+电话完全匹配，使用已有客户记录



            // 创建工单
            const orderNo = generateOrderNo();
            const initialStatus = status || '待维修';
            const orderResult = db.prepare(`
                INSERT INTO orders (order_no, customer_id, device_brand, device_model, device_password, pattern_password, device_power_on, problem, estimated_price, deposit, estimated_date, status, order_channel)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(orderNo, customer.id, device_brand, device_model, device_password || '', pattern_password || '', device_power_on || '', problem, estimated_price || 0, deposit || 0, estimated_date || null, initialStatus, order_channel || '');

            // 添加工单项目
            if (items && items.length > 0) {
                const insertItem = db.prepare('INSERT INTO order_items (order_id, pricing_id, name, quantity, price) VALUES (?, ?, ?, ?, ?)');
                items.forEach(item => {
                    insertItem.run(orderResult.lastInsertRowid, item.pricing_id || null, item.name, item.quantity || 1, item.price);
                });
            }

            return {
                id: orderResult.lastInsertRowid,
                order_no: orderNo
            };
        });

        const result = createOrderTransaction();
        res.status(201).json({
            ...result,
            message: '工单创建成功'
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(error.message === '缺少必填字段' ? 400 : 500).json({ error: error.message });
    }
});

// 更新工单状态
router.patch('/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['等待订货', '待维修', '维修中', '待取机', '已完成'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: '无效的状态' });
        }

        const db = getDb();
        db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
        res.json({ message: '状态更新成功' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 更新工单详情
router.put('/:id', (req, res) => {
    try {
        const { repair_notes, final_price, status, items, order_channel } = req.body;

        const db = getDb();
        db.prepare(`
            UPDATE orders 
            SET repair_notes = COALESCE(?, repair_notes),
                final_price = COALESCE(?, final_price),
                status = COALESCE(?, status),
                order_channel = COALESCE(?, order_channel),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(repair_notes, final_price, status, order_channel, req.params.id);

        // 更新工单项目
        if (items) {
            db.prepare('DELETE FROM order_items WHERE order_id = ?').run(req.params.id);
            const insertItem = db.prepare('INSERT INTO order_items (order_id, pricing_id, name, quantity, price) VALUES (?, ?, ?, ?, ?)');
            items.forEach(item => {
                insertItem.run(req.params.id, item.pricing_id || null, item.name, item.quantity || 1, item.price);
            });
        }

        res.json({ message: '工单更新成功' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 删除工单
router.delete('/:id', (req, res) => {
    try {
        const db = getDb();
        db.prepare('DELETE FROM order_items WHERE order_id = ?').run(req.params.id);
        db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
        res.json({ message: '工单删除成功' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
