const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Прокси для всех запросов к API Яндекса
app.use('/api/*', async (req, res) => {
    try {
        const apiPath = req.originalUrl.replace('/api', '');
        console.log('Incoming request:', {
            method: req.method,
            path: apiPath,
            headers: req.headers,
            body: req.body
        });

        // Преобразуем URL для корректной работы с API
        const apiUrl = `https://api.webmaster.yandex.net/v4${apiPath}`
            .replace(/\/hosts\/([^\/]+)\//, (match, hostId) => {
                // Заменяем : на %3A только в идентификаторе хоста
                return `/hosts/${hostId.replace(/:/g, '%3A')}/`;
            });

        console.log('Making request to Yandex API:', {
            method: req.method,
            url: apiUrl,
            headers: {
                'Authorization': req.headers.authorization,
                'Content-Type': 'application/json',
            },
            data: req.method !== 'GET' ? req.body : undefined
        });

        const response = await axios({
            method: req.method,
            url: apiUrl,
            headers: {
                'Authorization': req.headers.authorization,
                'Content-Type': 'application/json',
            },
            data: req.method !== 'GET' ? req.body : undefined
        });
        
        console.log('API Response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Proxy error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
            config: error.config
        });
        res.status(error.response?.status || 500).json(error.response?.data || { message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
