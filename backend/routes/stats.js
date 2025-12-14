const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

// 获取统计数据
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
        const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = '待维修'").get().count;
        const inProgressOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = '维修中'").get().count;
        const waitingPickup = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = '待取机'").get().count;
        const waitingOrder = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = '等待订货'").get().count;
        const completedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = '已完成'").get().count;
        const totalRevenue = db.prepare('SELECT COALESCE(SUM(final_price), 0) as total FROM orders').get().total;
        const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;

        res.json({
            totalOrders,
            pendingOrders,
            inProgressOrders,
            waitingPickup,
            waitingOrder,
            completedOrders,
            totalRevenue,
            totalCustomers
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: '获取统计数据失败' });
    }
});

module.exports = router;
