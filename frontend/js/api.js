// API 基础配置
const API_BASE = '/api';
const API_TIMEOUT = 10000; // 10 秒超时

// 通用 API 请求函数
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const config = {
        headers: {
            'Content-Type': 'application/json',
        },
        signal: controller.signal,
        ...options,
    };

    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '请求失败');
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('请求超时，请检查网络连接');
        }
        console.error('API 错误:', error);
        throw error;
    }
}

// 工单 API
const ordersAPI = {
    // 获取所有工单
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/orders${query ? '?' + query : ''}`);
    },

    // 获取单个工单
    getById: (id) => apiRequest(`/orders/${id}`),

    // 创建工单
    create: (data) => apiRequest('/orders', {
        method: 'POST',
        body: data,
    }),

    // 更新工单状态
    updateStatus: (id, status) => apiRequest(`/orders/${id}/status`, {
        method: 'PATCH',
        body: { status },
    }),

    // 更新工单详情
    update: (id, data) => apiRequest(`/orders/${id}`, {
        method: 'PUT',
        body: data,
    }),

    // 删除工单
    delete: (id) => apiRequest(`/orders/${id}`, {
        method: 'DELETE',
    }),
};

// 客户 API
const customersAPI = {
    // 获取所有客户
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/customers${query ? '?' + query : ''}`);
    },

    // 获取客户详情
    getById: (id) => apiRequest(`/customers/${id}`),

    // 通过手机号查询
    getByPhone: (phone) => apiRequest(`/customers/phone/${phone}`),

    // 更新客户信息
    update: (id, data) => apiRequest(`/customers/${id}`, {
        method: 'PUT',
        body: data,
    }),
};

// 价格 API
const pricingAPI = {
    // 获取所有价格项目
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/pricing${query ? '?' + query : ''}`);
    },

    // 获取分类
    getCategories: () => apiRequest('/pricing/categories'),

    // 获取所有品牌
    getBrands: () => apiRequest('/pricing/brands'),

    // 根据品牌获取型号
    getModelsByBrand: (brand) => apiRequest(`/pricing/models/${encodeURIComponent(brand)}`),

    // 根据品牌和型号获取维修项目
    getItemsByBrandModel: (brand, model) => apiRequest(`/pricing/items/${encodeURIComponent(brand)}/${encodeURIComponent(model)}`),

    // 添加价格项目
    create: (data) => apiRequest('/pricing', {
        method: 'POST',
        body: data,
    }),

    // 更新价格项目
    update: (id, data) => apiRequest(`/pricing/${id}`, {
        method: 'PUT',
        body: data,
    }),

    // 删除价格项目
    delete: (id) => apiRequest(`/pricing/${id}`, {
        method: 'DELETE',
    }),
};

// 统计 API
const statsAPI = {
    get: () => apiRequest('/stats'),
};

// OCR API
const ocrAPI = {
    // 识别手写内容
    recognize: async (imageFile) => {
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await fetch(`${API_BASE}/ocr/recognize`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '识别失败');
        }
        return data;
    },
};

// 导出
window.API = {
    orders: ordersAPI,
    customers: customersAPI,
    pricing: pricingAPI,
    stats: statsAPI,
    ocr: ocrAPI,
};
