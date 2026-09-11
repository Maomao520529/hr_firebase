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

## 專案結構
```
hr-database/
├── config/firebase.js          # Firebase Admin 初始化
├── middleware/verifyToken.js   # 驗證 Firebase ID Token 的 middleware
├── routes/employeeRoutes.js    # 匯入/查詢/刪除/匯出 API
├── server.js                   # Express 主程式
├── views/                      # 登入/註冊/儀表板 HTML
├── public/js/                  # 前端邏輯 + Firebase Client 設定
├── public/css/style.css        # 樣式
└── .env.example
```

## 建置步驟

### 1. 建立 Firebase 專案
1. 前往 [Firebase Console](https://console.firebase.google.com/) 建立新專案。
2. 啟用 **Authentication > Sign-in method > 電子郵件/密碼**。
3. 啟用 **Firestore Database**（正式或測試模式皆可，之後可調整規則）。

### 2. 取得後端服務帳戶金鑰（Admin SDK）
1. 專案設定 > 服務帳戶 > 產生新的私密金鑰。
2. 下載的 JSON 檔改名為 `serviceAccountKey.json`，放在專案根目錄（與 `server.js` 同層）。
   > ⚠️ 這個檔案含有敏感金鑰，**不要**提交到公開 Git repo（已加入 `.gitignore`）。

### 3. 取得前端 Web App 設定
1. 專案設定 > 一般 > 新增應用程式（Web）。
2. 複製 `firebaseConfig` 物件內容。
3. 貼到 `public/js/firebase-client-config.js` 中取代預設值。

### 4. 安裝套件並設定環境變數
```bash
cd hr-database
npm install
cp .env.example .env
# 依需要修改 .env 內的 PORT / FIREBASE_PROJECT_ID
```

### 5. 啟動伺服器
```bash
npm start
# 或開發模式（自動重啟）
npm run dev
```
瀏覽器打開 `http://localhost:3000` 會自動導向登入頁。

## 使用流程
1. 開啟 `/register.html` 建立帳號（Email + 密碼）。
2. 登入後進入儀表板 `/dashboard.html`。
3. **匯入**：選擇 `.xls` / `.xlsx` 檔案上傳，第一列標題須包含以下欄位（可只填部分，員工編號與姓名為必填）：

   | 員工編號 | 姓名 | 部門 | 職稱 | 到職日 | Email | 電話 | 薪資 | 狀態 |
   |---|---|---|---|---|---|---|---|---|
   | E001 | 王小明 | 研發部 | 工程師 | 2023-01-10 | wang@example.com | 0912345678 | 55000 | 在職 |

   系統會以「員工編號」作為 Firestore 文件 ID，重複匯入同一編號會覆蓋更新（upsert）。
4. **匯出**：點擊「匯出 Excel」或「匯出 Word」，會即時從 Firestore 撈取全部資料並下載檔案。
5. 列表下方可個別刪除員工資料。

## API 一覽（皆需帶 `Authorization: Bearer <Firebase ID Token>`）

| Method | 路徑 | 說明 |
|---|---|---|
| POST | `/api/employees/import` | 上傳 xls/xlsx（multipart/form-data，欄位名 `file`），匯入資料庫 |
| GET  | `/api/employees` | 取得所有員工資料 |
| DELETE | `/api/employees/:empId` | 刪除指定員工 |
| GET  | `/api/employees/export/xlsx` | 匯出全部資料為 Excel |
| GET  | `/api/employees/export/docx` | 匯出全部資料為 Word |

## 建議的 Firestore 安全規則（僅允許後端 Admin SDK 寫入，前端不直接存取 Firestore）
由於所有資料存取都經過後端 Express（使用 Admin SDK，擁有完整權限），前端並不會直接呼叫 Firestore，
可將 Firestore 規則設為預設拒絕所有用戶端讀寫：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 可再延伸
- 加上角色權限（例如僅 HR 主管能匯入/刪除）
- 匯入前先預覽 / 驗證資料再寫入
- 分頁 / 搜尋 / 篩選部門
- 匯出時支援自訂欄位或篩選條件
