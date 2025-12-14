const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/shop.db');
let db = new Database(dbPath);

// 重新连接数据库 (用于恢复备份后)
function reconnectDatabase() {
    try {
        if (db && db.open) {
            db.close();
        }
    } catch (e) {
        // 忽略关闭错误
    }
    db = new Database(dbPath);
    console.log('数据库连接已重新建立');
    return db;
}

// 获取当前数据库连接
function getDb() {
    return db;
}

// 初始化数据库表
function initDatabase() {
    // 客户表（姓名+电话组合唯一标识客户）
    db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 添加姓名+电话组合唯一索引（如果不存在）
    try {
        db.exec(`CREATE UNIQUE INDEX idx_customers_name_phone ON customers(name, phone)`);
    } catch (e) { /* 索引已存在 */ }


    // 工单表
    db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT UNIQUE NOT NULL,
            customer_id INTEGER NOT NULL,
            device_brand TEXT NOT NULL,
            device_model TEXT NOT NULL,
            device_password TEXT DEFAULT '',
            pattern_password TEXT DEFAULT '',
            device_power_on TEXT DEFAULT '',
            problem TEXT NOT NULL,
            status TEXT DEFAULT '待维修',
            estimated_price REAL DEFAULT 0,
            deposit REAL DEFAULT 0,
            final_price REAL DEFAULT 0,
            repair_notes TEXT DEFAULT '',
            estimated_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    `);

    // 添加新字段到已存在的表 (如果升级旧数据库)
    try {
        db.exec(`ALTER TABLE orders ADD COLUMN device_password TEXT DEFAULT ''`);
    } catch (e) { /* 字段已存在 */ }
    try {
        db.exec(`ALTER TABLE orders ADD COLUMN pattern_password TEXT DEFAULT ''`);
    } catch (e) { /* 字段已存在 */ }
    try {
        db.exec(`ALTER TABLE orders ADD COLUMN device_power_on TEXT DEFAULT ''`);
    } catch (e) { /* 字段已存在 */ }
    try {
        db.exec(`ALTER TABLE orders ADD COLUMN deposit REAL DEFAULT 0`);
    } catch (e) { /* 字段已存在 */ }
    try {
        db.exec(`ALTER TABLE orders ADD COLUMN order_channel TEXT DEFAULT ''`);
    } catch (e) { /* 字段已存在 */ }

    // 价格管理表
    db.exec(`
        CREATE TABLE IF NOT EXISTS pricing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 添加新字段到价格表 (如果升级旧数据库)
    try {
        db.exec(`ALTER TABLE pricing ADD COLUMN brand TEXT DEFAULT ''`);
    } catch (e) { /* 字段已存在 */ }
    try {
        db.exec(`ALTER TABLE pricing ADD COLUMN model TEXT DEFAULT ''`);
    } catch (e) { /* 字段已存在 */ }
    try {
        db.exec(`ALTER TABLE pricing ADD COLUMN name_it TEXT DEFAULT ''`);
    } catch (e) { /* 字段已存在 */ }

    // 工单项目表
    db.exec(`
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            pricing_id INTEGER,
            name TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (pricing_id) REFERENCES pricing(id)
        )
    `);

    // 创建索引以提升查询性能
    try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_pricing_brand_model ON pricing(brand, model)`);
    } catch (e) { /* 索引已存在 */ }

    // 用户表
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'frontdesk',
            name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 创建默认管理员账号 (密码: admin)
    const existingAdmin = db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get('admin');
    if (existingAdmin.count === 0) {
        // 简单哈希 (生产环境应使用 bcrypt)
        const crypto = require('crypto');
        const hashedPassword = crypto.createHash('sha256').update('admin').digest('hex');
        db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)').run('admin', hashedPassword, 'admin', '管理员');
    }

    // 插入一些默认价格项目
    const existingPricing = db.prepare('SELECT COUNT(*) as count FROM pricing').get();
    if (existingPricing.count === 0) {
        const insertPricing = db.prepare('INSERT INTO pricing (category, name, name_it, brand, model, price) VALUES (?, ?, ?, ?, ?, ?)');
        const defaultPricing = [
            // Apple iPhone
            ['屏幕维修', 'iPhone 8 屏幕更换', 'Riparazione dello schermo', 'Apple', 'iPhone 8', 150],
            ['屏幕维修', 'iPhone 11 屏幕更换', 'Riparazione dello schermo', 'Apple', 'iPhone 11', 200],
            ['屏幕维修', 'iPhone 13 屏幕更换', 'Riparazione dello schermo', 'Apple', 'iPhone 13', 280],
            ['屏幕维修', 'iPhone 15 屏幕更换', 'Riparazione dello schermo', 'Apple', 'iPhone 15', 350],
            ['电池更换', 'iPhone 8 电池更换', 'Sostituzione della batteria', 'Apple', 'iPhone 8', 60],
            ['电池更换', 'iPhone 11 电池更换', 'Sostituzione della batteria', 'Apple', 'iPhone 11', 80],
            ['电池更换', 'iPhone 13 电池更换', 'Sostituzione della batteria', 'Apple', 'iPhone 13', 90],
            ['电池更换', 'iPhone 15 电池更换', 'Sostituzione della batteria', 'Apple', 'iPhone 15', 100],
            ['充电口维修', 'iPhone 充电口维修', 'Riparazione porta di ricarica', 'Apple', 'iPhone 通用', 80],
            ['后盖更换', 'iPhone 后盖更换', 'Sostituzione cover posteriore', 'Apple', 'iPhone 通用', 120],

            // Samsung
            ['屏幕维修', 'Samsung S21 屏幕更换', 'Riparazione dello schermo', 'Samsung', 'Galaxy S21', 250],
            ['屏幕维修', 'Samsung S23 屏幕更换', 'Riparazione dello schermo', 'Samsung', 'Galaxy S23', 300],
            ['电池更换', 'Samsung S21 电池更换', 'Sostituzione della batteria', 'Samsung', 'Galaxy S21', 70],
            ['电池更换', 'Samsung S23 电池更换', 'Sostituzione della batteria', 'Samsung', 'Galaxy S23', 80],

            // Huawei
            ['屏幕维修', 'Huawei P30 屏幕更换', 'Riparazione dello schermo', 'Huawei', 'P30', 180],
            ['屏幕维修', 'Huawei P40 屏幕更换', 'Riparazione dello schermo', 'Huawei', 'P40', 200],
            ['电池更换', 'Huawei P30 电池更换', 'Sostituzione della batteria', 'Huawei', 'P30', 65],
            ['电池更换', 'Huawei P40 电池更换', 'Sostituzione della batteria', 'Huawei', 'P40', 70],

            // Xiaomi
            ['屏幕维修', 'Xiaomi 12 屏幕更换', 'Riparazione dello schermo', 'Xiaomi', 'Mi 12', 150],
            ['屏幕维修', 'Xiaomi 13 屏幕更换', 'Riparazione dello schermo', 'Xiaomi', 'Mi 13', 180],
            ['电池更换', 'Xiaomi 12 电池更换', 'Sostituzione della batteria', 'Xiaomi', 'Mi 12', 60],
            ['电池更换', 'Xiaomi 13 电池更换', 'Sostituzione della batteria', 'Xiaomi', 'Mi 13', 65],

            // 通用服务
            ['主板维修', '主板检测维修', 'Riparazione scheda madre', '通用', '通用', 300],
            ['软件刷机', '系统刷机', 'Ripristino software', '通用', '通用', 50],
            ['数据恢复', '数据恢复服务', 'Recupero dati', '通用', '通用', 150],
        ];
        defaultPricing.forEach(item => insertPricing.run(...item));
    }

    console.log('数据库初始化完成');
}

// 生成工单号
function generateOrderNo() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `WX${dateStr}${random}`;
}

module.exports = { db, getDb, initDatabase, generateOrderNo, reconnectDatabase, dbPath };
