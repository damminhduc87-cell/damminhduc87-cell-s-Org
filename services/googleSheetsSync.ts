import { LabTest, QCResult, QCLevel } from '../types';

export interface GoogleSheetRowPayload {
  NGAY_GIO: string;
  XET_NGHIEM: string;
  MUC_IQC: string;
  GIA_TRI_DO_LUONG: number;
  TAGRET_MEAN: number;
  SD_DOLECHCHUAN: number;
  SD_INDEX_Z_SCORE: number;
  TRANG_THAI: string;
  HANH_DONG_KHAC_PHUC: string;
  TEN_MAY: string;
}

export const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var sheetName = "NhatKy_IQC";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        "NGAY_GIO", "XET_NGHIEM", "MUC_IQC", "GIA_TRI_DO_LUONG", 
        "TAGRET_MEAN", "SD_DOLECHCHUAN", "SD_INDEX_Z-SCORE", 
        "TRANG_THAI", "HANH_DONG_KHAC_PHUC", "TEN_MAY"
      ]);
    }
    
    var payload = JSON.parse(e.postData.contents);
    var rows = payload.rows || [payload];
    
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      sheet.appendRow([
        r.NGAY_GIO || "",
        r.XET_NGHIEM || "",
        r.MUC_IQC || "",
        r.GIA_TRI_DO_LUONG !== undefined ? r.GIA_TRI_DO_LUONG : "",
        r.TAGRET_MEAN !== undefined ? r.TAGRET_MEAN : "",
        r.SD_DOLECHCHUAN !== undefined ? r.SD_DOLECHCHUAN : "",
        r.SD_INDEX_Z_SCORE !== undefined ? r.SD_INDEX_Z_SCORE : "",
        r.TRANG_THAI || "",
        r.HANH_DONG_KHAC_PHUC || "",
        r.TEN_MAY || ""
      ]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "ok", message: "MinhDucLab QC Webhook đang hoạt động" }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

/**
 * Định dạng một QCResult thành đối tượng hàng tương thích với bảng Google Sheet
 */
export function formatResultToSheetRow(result: QCResult, tests: LabTest[]): GoogleSheetRowPayload {
  const test = tests.find(t => t.id === result.testId);
  const testName = test?.name || result.testId;
  const cfg = test?.configs?.[result.level];

  // Định dạng ngày giờ chuẩn y tế DD/MM/YYYY HH:mm
  const d = new Date(result.timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateFormatted = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  let statusText = 'Đạt';
  if (result.westgardStatus === 'violation') {
    statusText = `Vi phạm (${result.westgardRule || 'Lỗi'})`;
  } else if (result.westgardStatus === 'warning') {
    statusText = `Cảnh báo (${result.westgardRule || '1-2s'})`;
  }

  const levelText = result.level === QCLevel.NORMAL ? 'Normal' : result.level === QCLevel.LOW ? 'Low' : 'High';

  return {
    NGAY_GIO: dateFormatted,
    XET_NGHIEM: testName,
    MUC_IQC: levelText,
    GIA_TRI_DO_LUONG: Number(result.value.toFixed(2)),
    TAGRET_MEAN: cfg ? Number(cfg.mean.toFixed(2)) : 0,
    SD_DOLECHCHUAN: cfg ? Number(cfg.sd.toFixed(2)) : 0,
    SD_INDEX_Z_SCORE: Number((result.zScore || 0).toFixed(2)),
    TRANG_THAI: statusText,
    HANH_DONG_KHAC_PHUC: result.correctiveAction || (result.capaId ? `Mã CAPA: ${result.capaId}` : ''),
    TEN_MAY: test?.analyzerName || 'Máy Hóa sinh 1'
  };
}

/**
 * Kiểm tra kết nối tới Google Apps Script Webhook (Ping Test)
 */
export async function testWebhookConnection(webhookUrl: string): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com/')) {
    return { success: false, message: 'URL không hợp lệ. URL phải bắt đầu bằng https://script.google.com/macros/s/...' };
  }

  try {
    // 1. Thử gửi qua Vercel proxy trước để tránh CORS
    try {
      const proxyRes = await fetch('/api/sheets-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, testOnly: true })
      });
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data.status === 'ok' || data.success) {
          return { success: true, message: 'Kết nối thành công tới Google Apps Script!' };
        }
      }
    } catch (e) {
      // Fallback sang gọi trực tiếp nếu không có proxy backend (vd khi chạy dev thuần)
    }

    // 2. Thử gọi trực tiếp với chế độ no-cors
    await fetch(webhookUrl, {
      method: 'GET',
      mode: 'no-cors'
    });
    return { success: true, message: 'Đã gửi tín hiệu kiểm tra thành công tới Webhook!' };
  } catch (err: any) {
    return { success: false, message: 'Không thể kết nối tới Webhook: ' + (err.message || 'Lỗi mạng') };
  }
}

/**
 * Gửi một hoặc nhiều kết quả lên Google Sheets
 */
export async function syncResultsToGoogleSheets(
  webhookUrl: string,
  results: QCResult[],
  tests: LabTest[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!webhookUrl || results.length === 0) {
    return { success: false, count: 0, error: 'Chưa cấu hình URL hoặc không có kết quả để gửi.' };
  }

  const rows = results.map(r => formatResultToSheetRow(r, tests));

  try {
    // 1. Thử gửi qua Serverless Proxy để đảm bảo follow redirect 302 của Google
    try {
      const res = await fetch('/api/sheets-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, rows })
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, count: rows.length };
      }
    } catch (proxyError) {
      console.warn('Lỗi khi gọi qua proxy /api/sheets-sync, thử gọi trực tiếp no-cors...', proxyError);
    }

    // 2. Fallback: gửi trực tiếp từ trình duyệt
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    });

    return { success: true, count: rows.length };
  } catch (err: any) {
    console.error('Lỗi khi đồng bộ Google Sheets:', err);
    return { success: false, count: 0, error: err.message || 'Không thể đồng bộ' };
  }
}
