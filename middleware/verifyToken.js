// middleware/verifyToken.js
// 驗證前端傳來的 Firebase ID Token（登入後夾在 Authorization: Bearer <token>）
const { auth } = require('../config/firebase');

async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: '未登入或缺少驗證憑證' });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch (err) {
    console.error('Token 驗證失敗:', err.message);
    return res.status(401).json({ error: 'Token 無效或已過期，請重新登入' });
  }
}

module.exports = verifyToken;
