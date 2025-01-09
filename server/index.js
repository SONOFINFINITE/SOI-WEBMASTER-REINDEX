const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Прокси для запросов к API Яндекса
app.all('/v4*', async (req, res) => {
  try {
    const apiPath = req.path;
    console.log('Incoming request:', {
      method: req.method,
      path: apiPath,
      headers: req.headers,
      body: req.body
    });

    // Преобразуем URL для корректной работы с API
    const apiUrl = `https://api.webmaster.yandex.net${apiPath}`
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
      data: req.body,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { 
      error: 'Proxy error',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
