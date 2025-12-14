// 工具函数

// ============ 角色权限配置 ============
const rolePermissions = {
    admin: ['index.html', 'register.html', 'front-desk.html', 'repair.html', 'customers.html', 'pricing.html', 'admin.html', 'backup.html', 'history.html'],
    boss: ['index.html', 'register.html', 'front-desk.html', 'repair.html', 'customers.html', 'pricing.html', 'backup.html', 'history.html'],
    repair: ['repair.html'],
    frontdesk: ['register.html', 'front-desk.html']
};

const defaultPage = {
    admin: 'index.html',
    boss: 'index.html',
    repair: 'repair.html',
    frontdesk: 'register.html'
};

// ============ 用户认证 ============
// 检查登录状态和页面权限
(function checkAuth() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const isLoginPage = currentPage === 'login.html';
    const currentUserStr = localStorage.getItem('currentUser');

    // 未登录 -> 跳转登录页
    if (!isLoginPage && !currentUserStr) {
        window.location.href = 'login.html';
        return;
    }

    // 已登录 -> 检查页面权限
    if (!isLoginPage && currentUserStr) {
        try {
            const currentUser = JSON.parse(currentUserStr);
            const role = currentUser.role || 'frontdesk';
            const allowedPages = rolePermissions[role] || rolePermissions.frontdesk;

            // 如果当前页面不在允许列表中，跳转到默认页面
            if (!allowedPages.includes(currentPage)) {
                const targetPage = defaultPage[role] || 'login.html';
                window.location.href = targetPage;
                return;
            }
        } catch (e) {
            // 解析失败，跳转登录页
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        }
    }
})();

// 获取当前用户
function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('currentUser') || '{}');
    } catch {
        return {};
    }
}

// 注销
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}


// 显示提示消息
function showToast(message, type = 'success') {
    // 移除现有的 toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✓' : '✕'}</span>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // 显示动画
    setTimeout(() => toast.classList.add('show'), 10);

    // 自动隐藏
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// 格式化价格
function formatPrice(price) {
    if (price === undefined || price === null) return '-';
    return `€${parseFloat(price).toFixed(2)}`;
}

// 打开模态框
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

// 关闭模态框
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// 点击遮罩关闭模态框
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// HTML 转义函数 - 防止 XSS 攻击
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 创建订单卡片 HTML
function createOrderCard(order) {
    return `
        <div class="order-card" draggable="true" data-id="${order.id}" data-status="${escapeHtml(order.status)}">
            <div class="order-card-header">
                <span class="order-no">${escapeHtml(order.order_no)}</span>
                <span class="order-time">${formatDate(order.created_at)}</span>
            </div>
            <div class="order-device">${escapeHtml(order.device_brand)} ${escapeHtml(order.device_model)}</div>
            <div class="order-problem">${escapeHtml(order.problem)}</div>
            <div class="order-customer">
                <span>👤 ${escapeHtml(order.customer_name) || '-'}</span>
                <span class="order-price">${formatPrice(order.estimated_price)}</span>
            </div>
        </div>
    `;
}

// 打印工单 (意大利语版)
function printOrder(order) {
    const printWindow = window.open('', '_blank');
    const amountDue = (order.estimated_price || 0) - (order.deposit || 0);
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ordine - ${order.order_no}</title>
            <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 15px;
                    max-width: 80mm;
                    margin: 0 auto;
                    font-size: 12px;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 10px;
                    margin-bottom: 12px;
                }
                .shop-name {
                    font-size: 16px;
                    font-weight: bold;
                    margin: 0 0 5px 0;
                }
                .shop-info {
                    font-size: 11px;
                    color: #333;
                    line-height: 1.4;
                }
                .order-no {
                    font-size: 14px;
                    font-weight: bold;
                    margin-top: 8px;
                }
                .section {
                    margin-bottom: 12px;
                }
                .section-title {
                    font-weight: bold;
                    font-size: 11px;
                    color: #666;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                }
                .row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    margin-bottom: 2px;
                }
                .row span:first-child {
                    color: #666;
                }
                .problem {
                    font-size: 11px;
                    padding: 6px;
                    background: #f5f5f5;
                    border-radius: 3px;
                    margin-top: 4px;
                }
                .footer {
                    text-align: center;
                    border-top: 2px dashed #000;
                    padding-top: 10px;
                    margin-top: 12px;
                    font-size: 10px;
                    color: #666;
                }
                .qr-code {
                    margin: 10px auto;
                    display: flex;
                    justify-content: center;
                }
                .terms {
                    font-size: 9px;
                    color: #666;
                    margin-top: 10px;
                    padding: 8px;
                    background: #f9f9f9;
                    border-radius: 3px;
                    line-height: 1.4;
                }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="shop-name">MAI.JIE Telefonia</div>
                <div class="shop-info">
                    Via Pistoiese, 94<br>
                    59100 Prato (PO)<br>
                    Tel: 0574 401258
                </div>
                <div class="order-no">N° ${order.order_no}</div>
            </div>
            
            <div class="section">
                <div class="section-title">Informazioni Cliente</div>
                <div class="row">
                    <span>Nome:</span>
                    <span>${order.customer_name || '-'}</span>
                </div>
                <div class="row">
                    <span>Telefono:</span>
                    <span>${order.customer_phone || '-'}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Informazioni Dispositivo</div>
                <div class="row">
                    <span>Modello:</span>
                    <span>${order.device_brand} ${order.device_model}</span>
                </div>
                ${order.device_power_on ? `
                <div class="row">
                    <span>Accensione:</span>
                    <span>${order.device_power_on === '是' ? 'Sì' : 'No'}</span>
                </div>
                ` : ''}
                <div class="row">
                    <span>Problema:</span>
                </div>
                <div class="problem">${order.problem}</div>
            </div>
            
            <div class="section">
                <div class="section-title">Informazioni Costo</div>
                <div class="row">
                    <span>Preventivo:</span>
                    <span>€${(order.estimated_price || 0).toFixed(2)}</span>
                </div>
                <div class="row">
                    <span>Acconto:</span>
                    <span>€${(order.deposit || 0).toFixed(2)}</span>
                </div>
                <div class="row" style="font-weight: bold;">
                    <span>Da Pagare:</span>
                    <span>€${amountDue.toFixed(2)}</span>
                </div>
                ${order.final_price ? `
                <div class="row">
                    <span>Prezzo Finale:</span>
                    <span>€${(order.final_price || 0).toFixed(2)}</span>
                </div>
                ` : ''}
                ${order.estimated_date ? `
                <div class="row">
                    <span>Data Prevista:</span>
                    <span>${order.estimated_date}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="section">
                <div class="row">
                    <span>Stato:</span>
                    <span><strong>${order.status === '待维修' ? 'In Attesa' : order.status === '维修中' ? 'In Riparazione' : order.status === '待取机' ? 'Pronto per Ritiro' : order.status === '已完成' ? 'Completato' : order.status}</strong></span>
                </div>
                <div class="row">
                    <span>Data:</span>
                    <span>${new Date(order.created_at).toLocaleDateString('it-IT')}</span>
                </div>
            </div>
            
            ${order.repair_notes ? `
            <div class="section">
                <div class="section-title">Note Riparazione</div>
                <div class="problem">${order.repair_notes}</div>
            </div>
            ` : ''}
            
            <div class="footer">
                <div class="qr-code" id="qrcode"></div>
                <p><strong>Conservare questo scontrino per il ritiro</strong></p>
            </div>

            <div class="terms">
                <strong>Condizioni di Assistenza:</strong><br>
                Per riparazioni dei dispositivi mobili nel nostro centro offriamo una garanzia di durata di 90GG, che è valida soltanto per le parti del hardware riparato, sono fuori copertura tutti i casi di danni dovuti alla presenza di liquidi o dovuti a cadute.
            </div>

            <script>
                var qr = qrcode(0, 'M');
                qr.addData('${order.order_no}');
                qr.make();
                document.getElementById('qrcode').innerHTML = qr.createImgTag(3, 4);
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
}

// 设置当前导航激活状态（并根据权限隐藏菜单）
function setActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.navbar-menu a');
    const currentUser = getCurrentUser();
    const role = currentUser.role || 'frontdesk';
    const allowedPages = rolePermissions[role] || rolePermissions.frontdesk;

    navLinks.forEach(link => {
        const href = link.getAttribute('href');

        // 设置激活状态
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }

        // 根据权限隐藏菜单项
        if (!allowedPages.includes(href)) {
            link.parentElement.style.display = 'none';
        }
    });
}


// 初始化用户菜单
function initUserMenu() {
    const isLoginPage = window.location.pathname.includes('login.html');
    if (isLoginPage) return;

    const currentUser = getCurrentUser();
    if (!currentUser.username) return;

    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // 创建用户菜单容器
    const userMenu = document.createElement('div');
    userMenu.style.cssText = 'display: flex; align-items: center; gap: 1rem; margin-left: auto;';

    // 用户信息
    const userInfo = document.createElement('span');
    userInfo.style.cssText = 'color: var(--text-secondary); font-size: 0.9rem;';
    userInfo.textContent = `👤 ${currentUser.name || currentUser.username}`;
    userMenu.appendChild(userInfo);

    // 管理员链接
    if (currentUser.role === 'admin') {
        const adminLink = document.createElement('a');
        adminLink.href = 'admin.html';
        adminLink.className = 'btn btn-sm btn-ghost';
        adminLink.textContent = '⚙️ 用户管理';
        userMenu.appendChild(adminLink);
    }

    // 备份链接 (管理员和老板)
    if (currentUser.role === 'admin' || currentUser.role === 'boss') {
        const backupLink = document.createElement('a');
        backupLink.href = 'backup.html';
        backupLink.className = 'btn btn-sm btn-ghost';
        backupLink.textContent = '💾 备份';
        userMenu.appendChild(backupLink);
    }

    // 登出按钮
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-sm btn-ghost';
    logoutBtn.style.color = 'var(--accent-orange)';
    logoutBtn.textContent = '🚪 登出';
    logoutBtn.onclick = logout;
    userMenu.appendChild(logoutBtn);

    navbar.appendChild(userMenu);
}

// 页面加载时设置导航状态
document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    initUserMenu();
});

// 导出工具函数
window.utils = {
    showToast,
    formatDate,
    formatPrice,
    openModal,
    closeModal,
    createOrderCard,
    printOrder,
    escapeHtml,
    getCurrentUser,
    logout,
};
