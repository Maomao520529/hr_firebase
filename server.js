// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./config/firebase'); // 啟動時檢查 Firebase Admin 初始化

const employeeRoutes = require('./routes/employeeRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// API 路由
app.use('/api/employees', employeeRoutes);

// 前端頁面路由
app.get('/', (req, res) => res.redirect('/login.html'));
app.get('/login.html', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register.html', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/dashboard.html', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));

app.listen(PORT, () => {
  console.log(`人力資料庫伺服器啟動：http://localhost:${PORT}`);
});
