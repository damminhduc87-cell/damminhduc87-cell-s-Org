// Client service calling /api/advisor serverless endpoint

export interface AdvisorContext {
  testName?: string;
  level?: string;
  value?: number;
  mean?: number;
  sd?: number;
  zScore?: number;
  violatedRule?: string;
  errorType?: string;
  lotNumber?: string;
  analyzerName?: string;
}

export async function askAdvisorApi(prompt: string, context?: AdvisorContext): Promise<{ text: string; error?: string }> {
  try {
    const res = await fetch('/api/advisor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, context })
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        text: data?.error || `Lỗi máy chủ (${res.status}) khi gửi yêu cầu tới Cố vấn AI.`,
        error: data?.error
      };
    }

    return { text: data.text || 'Không nhận được phản hồi từ AI.' };
  } catch (err: any) {
    console.error('Lỗi kết nối Advisor API:', err);
    return {
      text: `Lỗi kết nối mạng: Không thể liên lạc với máy chủ Cố vấn AI (${err?.message || 'Network error'}).`,
      error: err?.message
    };
  }
}
