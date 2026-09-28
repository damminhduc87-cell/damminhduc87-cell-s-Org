// Vercel Serverless Function: /api/advisor
// Cố vấn Quản lý Chất lượng Xét nghiệm & Chẩn đoán Sự cố Westgard theo QĐ 2429/QĐ-BYT

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-gemini-api-key',
  };

  // Handle standard Web API Request vs Node.js Serverless Request
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

    const { prompt, context } = body || {};

    if (!prompt || typeof prompt !== 'string') {
      const err = JSON.stringify({ error: 'Vui lòng cung cấp nội dung câu hỏi (prompt).' });
      if (isWebAPI) return new Response(err, { status: 400, headers });
      res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
      return res.end(err);
    }

    // Ưu tiên API key từ biến môi trường hệ thống (Server-side), cho phép fallback qua header nếu có
    const headerKey = req.headers?.['x-gemini-api-key'] || (typeof req.headers?.get === 'function' ? req.headers.get('x-gemini-api-key') : null);
    const envKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
    const apiKey = envKey || (typeof headerKey === 'string' ? headerKey.trim() : '');

    if (!apiKey) {
      const err = JSON.stringify({ 
        error: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ Vercel. Bạn có thể bấm nút "🔑 Nhập API Key trực tiếp" trên màn hình Cố vấn AI để dùng ngay, hoặc thêm biến GEMINI_API_KEY trong Project Settings của Vercel.' 
      });
      if (isWebAPI) return new Response(err, { status: 500, headers });
      res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
      return res.end(err);
    }

    // Xây dựng System Instruction chuyên biệt
    let contextStr = '';
    if (context) {
      contextStr = `\n\n[BỐI CẢNH SỰ CỐ QC ĐANG XẢY RA]:
- Tên xét nghiệm: ${context.testName || 'Chưa rõ'}
- Mức nồng độ: ${context.level || 'Chưa rõ'}
- Giá trị đo: ${context.value} (Mean đích: ${context.mean}, SD: ${context.sd})
- Chỉ số Z-score (SD Index): ${context.zScore} SD
- Quy tắc Westgard vi phạm: ${context.violatedRule || 'Không có'}
- Loại lỗi dự kiến: ${context.errorType || 'Chưa rõ'}
- Thiết bị/Máy xét nghiệm: ${context.analyzerName || 'Máy sinh hóa/huyết học tự động'}
- Số Lô chứng (Lot): ${context.lotNumber || 'Chưa rõ'}`;
    }

    const systemInstruction = `Bạn là một Cố Vấn Chuyên Gia Cấp Cao về Quản Lý Chất Lượng Phòng Xét Nghiệm Y Học tại Việt Nam (Laboratory Quality Management Specialist).
Bạn am hiểu sâu sắc:
1. Quyết định 2429/QĐ-BYT (Tiêu chí đánh giá mức chất lượng phòng xét nghiệm y học, đặc biệt là Chương VIII - Quản lý mẫu nội kiểm và ngoại kiểm).
2. Tiêu chuẩn quốc tế ISO 15189:2022 về yêu cầu chất lượng và năng lực của phòng xét nghiệm y tế.
3. Thông tư 37/2017/TT-BYT và Hướng dẫn An toàn sinh học phòng xét nghiệm.
4. Hệ thống đa quy tắc Westgard (Westgard Multirules: 1-2s, 1-3s, 2-2s, R-4s, 4-1s, 10-x) và phân tích nguyên nhân gốc rễ theo mô hình 5M (Man - Machine - Material - Method - Milieu).

YÊU CẦU TRẢ LỜI:
- Trả lời bằng tiếng Việt chuyên nghiệp, ngôn ngữ chuẩn y khoa dùng trong bệnh viện.
- Nếu có bối cảnh sự cố QC vi phạm: Hãy chỉ rõ bản chất lỗi (Ngẫu nhiên hay Hệ thống), phân tích 3-5 nguyên nhân khả dĩ nhất theo 5M, và hướng dẫn KTV từng bước xử lý khắc phục (CAPA) cụ thể trước khi được phép trả kết quả bệnh nhân.
- Trình bày định dạng Markdown rõ ràng, dùng bullet points, bảng biểu hoặc in đậm các lưu ý an toàn.`;

    const fullPrompt = `${prompt}${contextStr}`;

    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash',
      'gemini-2.5-pro',
      'gemini-pro-latest'
    ];

    const requestPayload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: fullPrompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.3,
        topP: 0.95,
        maxOutputTokens: 2048
      }
    };

    let geminiResponse: any = null;
    let successfulModel = '';
    let lastErrorStatus = 0;
    let lastErrorText = '';

    // Thử lần lượt các mô hình Flash / Pro phổ biến nhất
    for (const model of candidateModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      try {
        const resp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload)
        });

        if (resp.ok) {
          geminiResponse = resp;
          successfulModel = model;
          break;
        }

        lastErrorStatus = resp.status;
        lastErrorText = await resp.text();
        console.warn(`Model ${model} returned HTTP ${resp.status}:`, lastErrorText);

        // Nếu mã lỗi 404 (mô hình không tồn tại/bị tắt ở phiên bản API này), tiếp tục thử model khác
        if (resp.status === 404) {
          continue;
        }

        // Nếu lỗi do xác thực (400, 401, 403) hoặc quá tải (429), không cần thử thêm model khác
        if (resp.status === 400 || resp.status === 401 || resp.status === 403 || resp.status === 429) {
          geminiResponse = resp;
          break;
        }
      } catch (fetchErr: any) {
        console.warn(`Fetch error for model ${model}:`, fetchErr);
      }
    }

    // Nếu vẫn chưa thành công và lỗi là 404, tự động truy vấn danh sách models mà khóa API này được cấp quyền
    if ((!geminiResponse || lastErrorStatus === 404) && !successfulModel) {
      try {
        const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (listResp.ok) {
          const listData = await listResp.json();
          const availableModels: string[] = (listData?.models || [])
            .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
            .map((m: any) => m.name.replace(/^models\//, ''));

          console.log('Discovered available models for key:', availableModels);

          for (const dynamicModel of availableModels) {
            const dynamicUrl = `https://generativelanguage.googleapis.com/v1beta/models/${dynamicModel}:generateContent?key=${apiKey}`;
            const dynResp = await fetch(dynamicUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestPayload)
            });

            if (dynResp.ok) {
              geminiResponse = dynResp;
              successfulModel = dynamicModel;
              break;
            }
          }
        }
      } catch (listErr) {
        console.warn('Could not query dynamic models list:', listErr);
      }
    }

    if (!geminiResponse || !geminiResponse.ok) {
      const status = geminiResponse?.status || lastErrorStatus || 500;
      let detailedMsg = `Máy chủ AI phản hồi mã lỗi ${status}.`;

      if (status === 400 || status === 401) {
        detailedMsg = 'Khóa Gemini API Key không hợp lệ hoặc đã bị vô hiệu hóa. Vui lòng kiểm tra và dán lại mã khóa chính xác từ Google AI Studio.';
      } else if (status === 403) {
        detailedMsg = 'Khóa API không có quyền truy cập hoặc tài khoản bị giới hạn khu vực (Geographic restriction).';
      } else if (status === 429) {
        detailedMsg = 'Hệ thống AI đạt hạn mức yêu cầu tạm thời (Quota limit). Vui lòng đợi 30 giây và gửi lại câu hỏi.';
      } else if (status === 404) {
        detailedMsg = 'Không tìm thấy mô hình AI tương thích với khóa API hiện tại. Vui lòng kiểm tra lại dịch vụ Generative AI trên Google Cloud.';
      }

      console.error('Final Gemini API failure:', status, lastErrorText);
      const errMsg = JSON.stringify({ error: detailedMsg, rawStatus: status });
      if (isWebAPI) return new Response(errMsg, { status: status >= 400 && status < 600 ? status : 500, headers });
      res.writeHead(status >= 400 && status < 600 ? status : 500, { ...headers, 'Content-Type': 'application/json' });
      return res.end(errMsg);
    }

    const data = await geminiResponse.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi không thể tìm thấy câu trả lời phù hợp.';

    const responsePayload = JSON.stringify({
      text: replyText,
      model: successfulModel || 'gemini-flash',
      timestamp: Date.now()
    });

    if (isWebAPI) {
      return new Response(responsePayload, {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
    return res.end(responsePayload);

  } catch (error: any) {
    console.error('Serverless Advisor Error:', error);
    const errPayload = JSON.stringify({ 
      error: `Lỗi máy chủ: ${error?.message || 'Không thể kết nối dịch vụ AI'}` 
    });
    if (isWebAPI) return new Response(errPayload, { status: 500, headers });
    res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
    return res.end(errPayload);
  }
}
