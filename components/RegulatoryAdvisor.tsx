import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, LabTest, QCResult } from '../types';
import { askAdvisorApi } from '../services/advisorClient';

interface RegulatoryAdvisorProps {
  currentTest?: LabTest;
  latestViolation?: QCResult;
}

export const RegulatoryAdvisor: React.FC<RegulatoryAdvisorProps> = ({
  currentTest,
  latestViolation
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: `Xin chào! Tôi là Trợ lý AI Cố Vấn Quản Lý Chất Lượng Phòng Xét Nghiệm Y Học (Chuẩn Quyết định 2429/QĐ-BYT & ISO 15189).

Tôi có thể hỗ trợ bạn:
1. 📋 Giải thích và hướng dẫn xử lý các vi phạm đa quy tắc Westgard ($1_{3s}, 2_{2s}, R_{4s}, 4_{1s}, 10_x$).
2. 🔬 Phân tích nguyên nhân sự cố theo mô hình 5M (Con người, Thiết bị, Hóa chất, Phương pháp, Môi trường).
3. 📑 Hướng dẫn lập hồ sơ quản lý mẫu nội kiểm (IQC) và ngoại kiểm (EQA) theo Tiêu chí 2429.
4. 📈 Phương pháp đánh giá Six Sigma & TEa theo khuyến cáo CLIA 2024.

Hãy nhập câu hỏi hoặc chọn các câu hỏi gợi ý bên dưới!`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Quy trình xử lý khi vi phạm 1-3s và 2-2s theo QĐ 2429',
    'Hướng dẫn thiết lập Mean/SD cho Lô chứng mới (chu kỳ 20 ngày)',
    'Cách tính Six Sigma từ TEa và sai số EQA (Ngoại kiểm)',
    'Các tiêu chí điểm mức 3, 4, 5 của Chương VIII - QĐ 2429'
  ];

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: textToSend.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInput('');
    setLoading(true);

    try {
      // Đính kèm ngữ cảnh xét nghiệm nếu có
      let context;
      if (currentTest) {
        const config = latestViolation ? currentTest.configs[latestViolation.level] : currentTest.configs['Normal'];
        context = {
          testName: currentTest.name,
          level: latestViolation?.level,
          value: latestViolation?.value,
          mean: config?.mean,
          sd: config?.sd,
          zScore: latestViolation?.zScore,
          violatedRule: latestViolation?.westgardRule,
          analyzerName: currentTest.analyzerName
        };
      }

      const res = await askAdvisorApi(userMsg.text, context);
      
      const modelMsg: ChatMessage = {
        role: 'model',
        text: res.text,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: 'Đã xảy ra sự cố khi kết nối tới máy chủ AI. Vui lòng kiểm tra lại đường truyền mạng hoặc thử lại sau.',
          timestamp: Date.now()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="flex flex-col h-full bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <i className="fas fa-robot text-base"></i>
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-wide">Cố Vấn AI Quản Lý Chất Lượng 2429</h3>
            <p className="text-[10px] text-slate-400 font-bold">Mô hình: Gemini 2.0 Flash • Bảo mật Vercel Serverless</p>
          </div>
        </div>

        {currentTest && (
          <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-blue-400 border border-slate-700">
            Ngữ cảnh: {currentTest.name}
          </span>
        )}
      </div>

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40 dark:bg-slate-950/40 custom-scrollbar">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
            <div
              className={`max-w-[90%] md:max-w-[80%] p-5 rounded-2xl shadow-xs text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>
              <span className="text-[9px] opacity-60 mt-2 block text-right font-medium">
                {new Date(m.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 flex items-center gap-2">
              <i className="fas fa-spinner fa-spin text-blue-600"></i>
              <span>Cố vấn AI đang tra cứu tiêu chuẩn 2429 & soạn câu trả lời...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="p-3 bg-slate-100/70 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 overflow-x-auto">
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            disabled={loading}
            onClick={() => handleSend(qp)}
            className="text-[11px] font-bold px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Hỏi về quy tắc Westgard, QĐ 2429, cách giải quyết lỗi QC..."
          className="flex-1 bg-slate-100/70 dark:bg-slate-800 rounded-2xl px-5 py-3 text-sm outline-none border border-transparent focus:border-blue-500 transition-all font-medium"
        />
        <button
          type="button"
          disabled={loading || !input.trim()}
          onClick={() => handleSend()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-md shadow-blue-200 shrink-0"
        >
          <i className="fas fa-paper-plane text-sm"></i>
        </button>
      </div>
    </div>
  );
};
