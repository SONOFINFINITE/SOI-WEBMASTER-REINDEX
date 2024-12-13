const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

// Прокси для всех запросов к API Яндекса
app.use('*', async (req, res) => {
    try {
        const apiPath = req.originalUrl.replace('/.netlify/functions/api', '');
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

        const response = await axios({
            method: req.method,
            url: apiUrl,
            headers: {
                'Authorization': req.headers.authorization,
                'Content-Type': 'application/json',
            },
            data: req.method !== 'GET' ? req.body : undefined
        });
        
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

module.exports.handler = serverless(app);
