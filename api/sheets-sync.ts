// Vercel Serverless Function: /api/sheets-sync
// Chuyển tiếp dữ liệu kết quả nội kiểm tới Google Apps Script Webhook (Tránh lỗi CORS & Tự động theo dõi chuyển hướng 302)

export const config = {
  maxDuration: 30,
};

export default async function handler(req: any, res: any) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const isWebAPI = typeof req.json === 'function' && typeof Response !== 'undefined';

  if (req.method === 'OPTIONS') {
    if (isWebAPI) return new Response(null, { status: 204, headers });
    res.writeHead(204, headers);
    return res.end();
  }

  if (req.method !== 'POST') {
    const errBody = JSON.stringify({ error: 'Chỉ chấp nhận phương thức POST' });
    if (isWebAPI) return new Response(errBody, { status: 405, headers });
    res.writeHead(405, { ...headers, 'Content-Type': 'application/json' });
    return res.end(errBody);
  }

  try {
    let body: any;
    if (isWebAPI) {
      body = await req.json();
    } else {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    const { webhookUrl, rows, testOnly, action } = body || {};

    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('https://script.google.com/')) {
      const errRes = JSON.stringify({ error: 'URL Webhook Google Apps Script không hợp lệ.' });
      if (isWebAPI) return new Response(errRes, { status: 400, headers });
      res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
      return res.end(errRes);
    }

    // Trường hợp kiểm tra kết nối (Ping test)
    if (testOnly) {
      const pingResponse = await fetch(webhookUrl, {
        method: 'GET',
        redirect: 'follow'
      });
      const text = await pingResponse.text();
      const okBody = JSON.stringify({ success: true, status: 'ok', raw: text });
      if (isWebAPI) return new Response(okBody, { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
      res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
      return res.end(okBody);
    }

    // Trường hợp kéo dữ liệu (Pull / Read)
    if (action === 'pull') {
      const readUrl = webhookUrl.includes('?') ? `${webhookUrl}&action=read` : `${webhookUrl}?action=read`;
      const gasResponse = await fetch(readUrl, {
        method: 'GET',
        redirect: 'follow'
      });
      const responseText = await gasResponse.text();
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch (e) {
        parsed = { raw: responseText };
      }

      if (parsed && Array.isArray(parsed.rows)) {
        const successBody = JSON.stringify({
          success: true,
          count: parsed.rows.length,
          rows: parsed.rows
        });
        if (isWebAPI) return new Response(successBody, { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
        res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
        return res.end(successBody);
      }

      const fallbackBody = JSON.stringify({
        success: false,
        isOldScript: true,
        message: 'Google Apps Script hiện tại chưa hỗ trợ đọc dữ liệu (cần cập nhật bản script v2 trong Cấu hình Google Drive).',
        raw: parsed
      });
      if (isWebAPI) return new Response(fallbackBody, { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
      res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
      return res.end(fallbackBody);
    }

    // Trường hợp gửi dữ liệu hàng
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      const errRes = JSON.stringify({ error: 'Không có dữ liệu hàng (rows) để gửi.' });
      if (isWebAPI) return new Response(errRes, { status: 400, headers });
      res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
      return res.end(errRes);
    }

    // Gửi POST tới Google Apps Script và tự động follow redirect 302
    const gasResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Google Apps Script tiếp nhận tốt nhất dạng plain text JSON
      },
      body: JSON.stringify({ rows }),
      redirect: 'follow'
    });

    const responseText = await gasResponse.text();
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      parsed = { raw: responseText };
    }

    const successBody = JSON.stringify({
      success: true,
      count: rows.length,
      gasResult: parsed
    });

    if (isWebAPI) {
      return new Response(successBody, { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
    }
    res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
    return res.end(successBody);

  } catch (error: any) {
    console.error('Lỗi khi chuyển tiếp dữ liệu tới Google Sheets:', error);
    const errBody = JSON.stringify({ error: error.message || 'Lỗi kết nối tới máy chủ Google' });
    if (isWebAPI) return new Response(errBody, { status: 500, headers });
    res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
    return res.end(errBody);
  }
}
