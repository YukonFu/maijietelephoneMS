const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'ocr-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('只支持图片文件 (jpeg, jpg, png, gif, webp)'));
    }
});

// OCR 识别接口
router.post('/recognize', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '请上传图片' });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            // 如果没有配置API Key，删除上传的文件并返回错误
            fs.unlinkSync(req.file.path);
            return res.status(500).json({ error: '未配置 OpenAI API Key，请在环境变量中设置 OPENAI_API_KEY' });
        }

        // 读取图片并转换为 base64
        const imageBuffer = fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = req.file.mimetype;

        // 调用 OpenAI Vision API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `你是一个手机维修单据OCR识别助手。请从图片中识别手写内容，并提取以下信息：
1. 客户姓名 (customer_name)
2. 联系电话 (customer_phone) 
3. 设备品牌 (device_brand) - 如 Apple, Samsung, Huawei, Xiaomi, OPPO, vivo, OnePlus 等
4. 设备型号 (device_model) - 如 iPhone 11, Galaxy S24 等。如果写的是缩写如"IP11"，请转换为完整型号"iPhone 11"
5. 故障描述 (problem)
6. 预估价格 (estimated_price) - 只返回数字

请以JSON格式返回，只返回JSON，不要有其他文字。如果某个字段无法识别，返回空字符串。
示例格式：
{
  "customer_name": "张三",
  "customer_phone": "13812345678",
  "device_brand": "Apple",
  "device_model": "iPhone 11",
  "problem": "屏幕碎裂需要更换",
  "estimated_price": ""
}`
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: '请识别这张手机维修单据中的手写内容，并提取客户信息、设备信息和故障描述。'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500
            })
        });

        // 删除上传的临时文件
        fs.unlinkSync(req.file.path);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Error:', errorData);
            return res.status(500).json({ error: 'OpenAI API 调用失败: ' + (errorData.error?.message || '未知错误') });
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';

        // 尝试解析 JSON
        try {
            // 移除可能的 markdown 代码块标记
            const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
            const result = JSON.parse(jsonStr);
            res.json({
                success: true,
                data: result
            });
        } catch (parseError) {
            // 如果无法解析为JSON，返回原始内容
            res.json({
                success: false,
                raw_content: content,
                error: '无法解析识别结果'
            });
        }

    } catch (error) {
        console.error('OCR Error:', error);
        // 清理上传的文件
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
