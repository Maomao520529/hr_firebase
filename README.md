# 人力資料庫（Firebase + Node.js Express）

功能：
1. 登入頁（Firebase Authentication）
2. 註冊頁（Firebase Authentication）
3. 上傳 `.xls` / `.xlsx`，解析後匯入 Firestore 資料庫
4. 從資料庫匯出資料成 `.xlsx`（Excel）與 `.docx`（Word）

## 技術架構
- **後端**：Node.js + Express
- **資料庫**：Firebase Firestore（透過 firebase-admin）
- **登入驗證**：Firebase Authentication（Email/密碼），前端取得 ID Token，後端用 `firebase-admin` 驗證
- **Excel 解析/產出**：[xlsx (SheetJS)](https://www.npmjs.com/package/xlsx)
- **Word 產出**：[docx](https://www.npmjs.com/package/docx)
- **檔案上傳**：multer

### 1. 安裝套件並設定環境變數
```bash
cd hr-database
npm install
```

### 2. 啟動伺服器
```bash
npm start
```
瀏覽器打開 `http://localhost:3000` 會自動導向登入頁。
