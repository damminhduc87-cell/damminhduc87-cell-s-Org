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
    
    // Trường hợp Xóa một dòng kết quả khỏi Google Sheet
    if (payload.action === "delete") {
      var target = payload.target || {};
      var values = sheet.getDataRange().getValues();
      var deletedCount = 0;
      
      function norm(s) {
        return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      }
      function getDateStr(val) {
        if (!val) return "";
        if (val instanceof Date) {
          var d = val.getDate();
          var m = val.getMonth() + 1;
          var y = val.getFullYear();
          return (d < 10 ? '0' : '') + d + '/' + (m < 10 ? '0' : '') + m + '/' + y;
        }
        var s = String(val).trim();
        if (s.indexOf('T') !== -1) {
          var parts = s.split('T')[0].split('-');
          if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
        }
        if (s.indexOf('/') !== -1) return s.split(' ')[0];
        return s;
      }
      
      var targetTest = norm(target.XET_NGHIEM);
      var targetLevel = norm(target.MUC_IQC);
      var targetVal = parseFloat(String(target.GIA_TRI_DO_LUONG || "0").replace(",", "."));
      var targetDate = getDateStr(target.NGAY_GIO);
      
      for (var i = values.length - 1; i >= 1; i--) {
        var rowTest = norm(values[i][1]);
        var rowLevel = norm(values[i][2]);
        var rowVal = parseFloat(String(values[i][3] || "").replace(",", "."));
        var rowDate = getDateStr(values[i][0]);
        
        var testMatch = !targetTest || rowTest.indexOf(targetTest) !== -1 || targetTest.indexOf(rowTest) !== -1;
        var levelMatch = !targetLevel || rowLevel.indexOf(targetLevel) !== -1 || targetLevel.indexOf(rowLevel) !== -1;
        var valMatch = isNaN(targetVal) || Math.abs(rowVal - targetVal) < 0.05;
        var dateMatch = !targetDate || !rowDate || targetDate === rowDate;
        
        if (testMatch && levelMatch && valMatch && dateMatch) {
          sheet.deleteRow(i + 1);
          deletedCount++;
          break; // Xóa đúng 1 dòng khớp nhất từ dưới lên
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "delete", deletedCount: deletedCount }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
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
  var action = (e && e.parameter && e.parameter.action) || "read";
  if (action === "ping") {
    return ContentService.createTextOutput(JSON.stringify({ status: "ok", message: "MinhDucLab QC Webhook đang hoạt động" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    var sheetName = "NhatKy_IQC";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: 0, rows: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: 0, rows: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = values[0];
    var rows = [];
    for (var i = 1; i < values.length; i++) {
      var rowObj = {};
      for (var j = 0; j < headers.length; j++) {
        rowObj[headers[j]] = values[i][j];
      }
      rows.push(rowObj);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: rows.length, rows: rows }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

/**
 * Định dạng một QCResult thành đối tượng hàng tương thích với bảng Google Sheet
 */
export function formatResultToSheetRow(result: QCResult, tests: LabTest[]): GoogleSheetRowPayload {
  const test = tests.find(t => t.id === result.testId);
  const rawName = test?.name || result.testId;
  const testName = rawName.includes('(') ? rawName.split('(')[0].trim() : rawName.trim();
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

/**
 * Tải danh sách kết quả nội kiểm từ Google Sheets (Pull / Read 2 chiều)
 */
export async function pullResultsFromGoogleSheets(
  webhookUrl: string,
  tests: LabTest[]
): Promise<{ success: boolean; results: QCResult[]; count: number; error?: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com/')) {
    return { success: false, results: [], count: 0, error: 'Chưa cấu hình URL Webhook hợp lệ.' };
  }

  try {
    const res = await fetch('/api/sheets-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl, action: 'pull' })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.success || !Array.isArray(data.rows)) {
      return {
        success: false,
        results: [],
        count: 0,
        error: data.error || 'Dữ liệu từ Google Sheets không đúng định dạng hoặc script chưa hỗ trợ đọc.'
      };
    }

    const parsedResults: QCResult[] = [];
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const testMap = new Map<string, LabTest>();
    tests.forEach(t => {
      testMap.set(normalize(t.name), t);
      const shortName = t.name.includes('(') ? t.name.split('(')[0].trim() : t.name.trim();
      testMap.set(normalize(shortName), t);
      testMap.set(normalize(t.id), t);
    });

    data.rows.forEach((row: any, idx: number) => {
      const rawTestName = String(row.XET_NGHIEM || row['Xét nghiệm'] || row['Tên xét nghiệm'] || '').trim();
      if (!rawTestName) return;

      const normName = normalize(rawTestName);
      let matchedTest = testMap.get(normName);
      if (!matchedTest) {
        matchedTest = tests.find(t => {
          const tNorm = normalize(t.name);
          return normName.includes(tNorm) || tNorm.includes(normName);
        });
      }

      const testId = matchedTest ? matchedTest.id : `test_${normName}`;

      const rawLevel = String(row.MUC_IQC || row['Mức QC'] || row['Level'] || '').toUpperCase();
      let level = QCLevel.NORMAL;
      if (rawLevel.includes('LOW') || rawLevel.includes('THẤP') || rawLevel.includes('THAP') || rawLevel === 'L' || rawLevel.includes('MỨC 1')) {
        level = QCLevel.LOW;
      } else if (rawLevel.includes('HIGH') || rawLevel.includes('CAO') || rawLevel === 'H' || rawLevel.includes('MỨC 3')) {
        level = QCLevel.HIGH;
      }

      let rawVal = row.GIA_TRI_DO_LUONG ?? row['Giá trị đo'] ?? row['Giá trị'];
      if (typeof rawVal === 'string') {
        rawVal = parseFloat(rawVal.replace(',', '.'));
      }
      const valNum = Number(rawVal);
      if (isNaN(valNum)) return;

      const rawDate = row.NGAY_GIO || row['Ngày giờ'] || row['Ngày'];
      let timestamp = Date.now() - idx * 1000;
      if (rawDate) {
        if (typeof rawDate === 'string' && rawDate.includes('/')) {
          const parts = rawDate.split(' ');
          const dateParts = parts[0].split('/');
          const timeParts = (parts[1] || '08:00').split(':');
          if (dateParts.length >= 3) {
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const year = parseInt(dateParts[2], 10);
            const hour = parseInt(timeParts[0] || '8', 10);
            const minute = parseInt(timeParts[1] || '0', 10);
            const parsedD = new Date(year, month, day, hour, minute);
            if (!isNaN(parsedD.getTime())) timestamp = parsedD.getTime();
          }
        } else {
          const parsedD = new Date(rawDate);
          if (!isNaN(parsedD.getTime())) timestamp = parsedD.getTime();
        }
      }

      let zScore = 0;
      let rawZ = row['SD_INDEX_Z-SCORE'] || row.SD_INDEX_Z_SCORE || row['Z-score'] || row['Z-Score'];
      if (typeof rawZ === 'string') rawZ = parseFloat(rawZ.replace(',', '.'));
      if (!isNaN(Number(rawZ))) zScore = Number(rawZ);

      const rawStatus = String(row.TRANG_THAI || row['Trạng thái'] || '').toLowerCase();
      let westgardStatus: 'passed' | 'warning' | 'violation' = 'passed';
      let westgardRule = 'none';

      if (rawStatus.includes('vi phạm') || rawStatus.includes('vi pham') || rawStatus.includes('violation')) {
        westgardStatus = 'violation';
        const matchRule = rawStatus.match(/(\d[_\-]?\d?s|r[_\-]?4s|\d+x)/i);
        if (matchRule) westgardRule = matchRule[0];
      } else if (rawStatus.includes('cảnh báo') || rawStatus.includes('canh bao') || rawStatus.includes('warning')) {
        westgardStatus = 'warning';
        westgardRule = '1_2s';
      }

      parsedResults.push({
        id: `sheet_${timestamp}_${idx}`,
        testId,
        level,
        value: valNum,
        timestamp,
        zScore,
        westgardStatus,
        westgardRule,
        technician: 'KTV (Google Sheets)',
        lotNumber: 'LOT-SHEET',
        correctiveAction: String(row.HANH_DONG_KHAC_PHUC || row['Hành động khắc phục'] || '')
      });
    });

    return {
      success: true,
      results: parsedResults,
      count: parsedResults.length
    };
  } catch (err: any) {
    console.error('Lỗi tải dữ liệu từ Google Sheets:', err);
    return {
      success: false,
      results: [],
      count: 0,
      error: err.message || 'Không thể tải dữ liệu từ Google Sheets'
    };
  }
}

/**
 * Gửi yêu cầu xóa một dòng kết quả khỏi Google Sheets
 */
export async function deleteResultFromGoogleSheets(
  webhookUrl: string,
  result: QCResult,
  tests: LabTest[]
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com/')) {
    return { success: false, error: 'Chưa cấu hình URL Webhook hợp lệ.' };
  }

  const target = formatResultToSheetRow(result, tests);

  try {
    const res = await fetch('/api/sheets-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl, action: 'delete', target })
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true };
    }

    // Fallback sang gửi trực tiếp no-cors
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', target })
    });
    return { success: true };
  } catch (err: any) {
    console.error('Lỗi khi xóa kết quả trên Google Sheets:', err);
    return { success: false, error: err.message || 'Không thể xóa trên Google Sheets' };
  }
}


