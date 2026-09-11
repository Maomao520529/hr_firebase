// config/firebase.js
// 初始化 Firebase Admin SDK（伺服器端使用，操作 Firestore、驗證使用者 ID Token）
require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const keyPath = path.resolve(
  process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json'
);

if (!fs.existsSync(keyPath)) {
  console.error(
    `[Firebase] 找不到服務帳戶金鑰檔案：${keyPath}\n` +
    '請至 Firebase Console > 專案設定 > 服務帳戶 > 產生新的私密金鑰，\n' +
    '下載後改名為 serviceAccountKey.json 並放在專案根目錄。'
  );
  process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
