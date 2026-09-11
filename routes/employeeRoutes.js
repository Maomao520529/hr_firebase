// routes/employeeRoutes.js
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const {
  Document, Packer, Table, TableRow, TableCell,
  Paragraph, TextRun, HeadingLevel, WidthType, AlignmentType,
} = require('docx');

const { db } = require('../config/firebase');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();
const COLLECTION = 'employees';

// ---- multer：暫存上傳檔案 ----
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  fileFilter: (req, file, cb) => {
    const ok = /\.(xls|xlsx)$/i.test(file.originalname);
    cb(ok ? null : new Error('只接受 .xls 或 .xlsx 檔案'), ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Excel 欄位對應（第一列標題需符合這些名稱其中一種寫法）
const FIELD_MAP = {
  '員工編號': 'empId',
  '姓名': 'name',
  '部門': 'department',
  '職稱': 'position',
  '到職日': 'hireDate',
  'Email': 'email',
  '電子郵件': 'email',
  '電話': 'phone',
  '薪資': 'salary',
  '狀態': 'status',
};

function normalizeRow(row) {
  const out = {};
  for (const key of Object.keys(row)) {
    const mapped = FIELD_MAP[key.trim()];
    if (mapped) out[mapped] = row[key];
  }
  // 型別整理
  if (out.salary !== undefined) out.salary = Number(out.salary) || 0;
  if (out.hireDate instanceof Date) {
    out.hireDate = out.hireDate.toISOString().slice(0, 10);
  } else if (out.hireDate !== undefined) {
    out.hireDate = String(out.hireDate);
  }
  out.status = out.status || '在職';
  return out;
}

/**
 * POST /api/employees/import
 * 上傳 xls/xlsx，解析後寫入 Firestore
 */
router.post('/import', verifyToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '請選擇要上傳的 xls 或 xlsx 檔案' });
  }

  const filePath = req.file.path;

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ error: '檔案內沒有資料，或缺少標題列' });
    }

    let batch = db.batch();
    let count = 0;
    let opsInBatch = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const normalized = normalizeRow(rows[i]);

      if (!normalized.empId || !normalized.name) {
        errors.push(`第 ${i + 2} 列缺少「員工編號」或「姓名」，已略過`);
        continue;
      }

      const docRef = db.collection(COLLECTION).doc(String(normalized.empId));
      batch.set(docRef, {
        ...normalized,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.email,
      }, { merge: true });

      count++;
      opsInBatch++;

      // Firestore 一次 batch 最多 500 筆
      if (opsInBatch === 450) {
        await batch.commit();
        batch = db.batch();
        opsInBatch = 0;
      }
    }

    if (opsInBatch > 0) {
      await batch.commit();
    }

    res.json({
      message: `匯入完成，共寫入 ${count} 筆資料`,
      imported: count,
      total: rows.length,
      errors,
    });
  } catch (err) {
    console.error('匯入失敗:', err);
    res.status(500).json({ error: '匯入失敗: ' + err.message });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

/**
 * GET /api/employees
 * 取得所有員工資料（列表顯示用）
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION).orderBy('empId').get();
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ data });
  } catch (err) {
    console.error('讀取失敗:', err);
    res.status(500).json({ error: '讀取資料失敗: ' + err.message });
  }
});

/**
 * DELETE /api/employees/:empId
 */
router.delete('/:empId', verifyToken, async (req, res) => {
  try {
    await db.collection(COLLECTION).doc(req.params.empId).delete();
    res.json({ message: '刪除成功' });
  } catch (err) {
    res.status(500).json({ error: '刪除失敗: ' + err.message });
  }
});

const COLUMNS = [
  { key: 'empId', label: '員工編號', width: 12 },
  { key: 'name', label: '姓名', width: 10 },
  { key: 'department', label: '部門', width: 12 },
  { key: 'position', label: '職稱', width: 12 },
  { key: 'hireDate', label: '到職日', width: 12 },
  { key: 'email', label: 'Email', width: 22 },
  { key: 'phone', label: '電話', width: 14 },
  { key: 'salary', label: '薪資', width: 10 },
  { key: 'status', label: '狀態', width: 8 },
];

async function fetchAllEmployees() {
  const snapshot = await db.collection(COLLECTION).orderBy('empId').get();
  return snapshot.docs.map((doc) => doc.data());
}

/**
 * GET /api/employees/export/xlsx
 * 匯出資料庫全部資料成 xlsx
 */
router.get('/export/xlsx', verifyToken, async (req, res) => {
  try {
    const employees = await fetchAllEmployees();

    const rows = employees.map((e) => {
      const row = {};
      COLUMNS.forEach((c) => { row[c.label] = e[c.key] ?? ''; });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = COLUMNS.map((c) => ({ wch: c.width }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '人力資料');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="employees_${Date.now()}.xlsx"`
    );
    res.send(buffer);
  } catch (err) {
    console.error('匯出 xlsx 失敗:', err);
    res.status(500).json({ error: '匯出 xlsx 失敗: ' + err.message });
  }
});

/**
 * GET /api/employees/export/docx
 * 匯出資料庫全部資料成 Word 檔（表格形式）
 */
router.get('/export/docx', verifyToken, async (req, res) => {
  try {
    const employees = await fetchAllEmployees();

    const headerRow = new TableRow({
      tableHeader: true,
      children: COLUMNS.map((c) => new TableCell({
        width: { size: 100 / COLUMNS.length, type: WidthType.PERCENTAGE },
        shading: { fill: 'DDDDDD' },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: c.label, bold: true })],
        })],
      })),
    });

    const dataRows = employees.map((e) => new TableRow({
      children: COLUMNS.map((c) => new TableCell({
        width: { size: 100 / COLUMNS.length, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: String(e[c.key] ?? '') })],
        })],
      })),
    }));

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '人力資料庫 匯出報表', bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              text: `匯出時間: ${new Date().toLocaleString('zh-TW')}　共 ${employees.length} 筆`,
              size: 20,
              color: '666666',
            })],
          }),
          new Paragraph({ text: '' }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="employees_${Date.now()}.docx"`
    );
    res.send(buffer);
  } catch (err) {
    console.error('匯出 docx 失敗:', err);
    res.status(500).json({ error: '匯出 docx 失敗: ' + err.message });
  }
});

module.exports = router;
