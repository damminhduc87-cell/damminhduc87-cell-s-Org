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

  // Quản lý API Key trực tiếp trên trình duyệt
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [savedKey, setSavedKey] = useState<string>(() => {
    return localStorage.getItem('mdlab_api_key') || localStorage.getItem('gemini_api_key') || '';
  });
  const [tempKeyInput, setTempKeyInput] = useState('');
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const quickPrompts = [
    'Quy trình xử lý khi vi phạm 1-3s và 2-2s theo QĐ 2429',
    'Hướng dẫn thiết lập Mean/SD cho Lô chứng mới (chu kỳ 20 ngày)',
    'Cách tính Six Sigma từ TEa và sai số EQA (Ngoại kiểm)',
    'Các tiêu chí điểm mức 3, 4, 5 của Chương VIII - QĐ 2429'
  ];

  const handleOpenKeyModal = () => {
    setTempKeyInput(savedKey);
    setSaveSuccessMsg('');
    setShowKeyModal(true);
  };

  const handleSaveKey = () => {
    const trimmed = tempKeyInput.trim();
    if (trimmed) {
      localStorage.setItem('mdlab_api_key', trimmed);
      localStorage.setItem('gemini_api_key', trimmed);
      setSavedKey(trimmed);
      setSaveSuccessMsg('Đã lưu API Key thành công! Bạn có thể chat với Cố vấn AI ngay bây giờ.');
      setTimeout(() => {
        setShowKeyModal(false);
        setSaveSuccessMsg('');
      }, 1500);
    } else {
      localStorage.removeItem('mdlab_api_key');
      localStorage.removeItem('gemini_api_key');
      setSavedKey('');
      setSaveSuccessMsg('Đã xóa API Key cá nhân. Hệ thống sẽ sử dụng Key từ Vercel Server.');
      setTimeout(() => {
        setShowKeyModal(false);
        setSaveSuccessMsg('');
      }, 1500);
    }
  };

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
        if (latestViolation && typeof latestViolation.value === 'number') {
          const config = currentTest.configs[latestViolation.level];
          context = {
            testName: currentTest.name,
            level: latestViolation.level,
            value: latestViolation.value,
            mean: config?.mean,
            sd: config?.sd,
            zScore: latestViolation.zScore,
            violatedRule: latestViolation.westgardRule,
            analyzerName: currentTest.analyzerName
          };
        } else {
          context = {
            testName: currentTest.name,
            analyzerName: currentTest.analyzerName
          };
        }
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
    <div className="relative flex flex-col h-full bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <i className="fas fa-robot text-base"></i>
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-wide">Cố Vấn AI Quản Lý Chất Lượng 2429</h3>
            <p className="text-[10px] text-slate-400 font-bold">Mô hình: Gemini AI • Bảo mật Vercel Serverless</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút cài đặt API Key */}
          <button
            onClick={handleOpenKeyModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs ${
              savedKey
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Cài đặt mã khóa Gemini API Key"
          >
            <i className={`fas fa-key ${savedKey ? 'text-emerald-400' : 'text-amber-400'}`}></i>
            <span>{savedKey ? 'API Key: Đã lưu' : 'Cài đặt API Key'}</span>
          </button>

          {currentTest && (
            <span className={`hidden sm:inline-block px-3 py-1 rounded-full text-xs font-bold border ${
              latestViolation && typeof latestViolation.value === 'number'
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                : 'bg-slate-800 text-blue-400 border border-slate-700'
            }`}>
              Ngữ cảnh: {currentTest.name} {latestViolation?.westgardRule ? `(Vi phạm ${latestViolation.westgardRule})` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40 dark:bg-slate-950/40 custom-scrollbar">
        {messages.map((m, idx) => {
          const isKeyError = m.role === 'model' && (
            m.text.includes('GEMINI_API_KEY') || 
            m.text.includes('khóa API') || 
            m.text.includes('API key') ||
            m.text.includes('401') ||
            m.text.includes('403')
          );

          return (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
              <div
                className={`max-w-[90%] md:max-w-[80%] p-5 rounded-2xl shadow-xs text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : isKeyError
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-slate-800 dark:text-amber-200 rounded-tl-none border border-amber-300 dark:border-amber-800/60'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                {/* Nút hỗ trợ nhanh khi gặp thông báo chưa cấu hình API Key */}
                {isKeyError && (
                  <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800/60 flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleOpenKeyModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition"
                    >
                      <i className="fas fa-key text-xs"></i>
                      🔑 Nhập API Key trực tiếp tại đây
                    </button>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
                    >
                      <i className="fas fa-external-link-alt text-xs text-blue-500"></i>
                      Lấy API Key Google miễn phí
                    </a>
                  </div>
                )}

                <span className="text-[9px] opacity-60 mt-2 block text-right font-medium">
                  {new Date(m.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}

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

      {/* MODAL CÀI ĐẶT API KEY */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5">
            {/* Modal Title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <i className="fas fa-key text-base"></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">Cấu Hình Khóa Gemini API Key</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Kích hoạt Cố Vấn AI QĐ 2429 & Westgard</p>
                </div>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>

            {/* Notification message if saved */}
            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:border-emerald-800/60">
                <i className="fas fa-check-circle text-emerald-500"></i>
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Input Form */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nhập Gemini API Key của bạn:
              </label>
              <div className="relative">
                <input
                  type={showKeySecret ? 'text' : 'password'}
                  value={tempKeyInput}
                  onChange={e => setTempKeyInput(e.target.value)}
                  placeholder="Dán mã khóa AIzaSy... vào đây"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-mono pr-10 outline-none focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowKeySecret(!showKeySecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <i className={`fas ${showKeySecret ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Khóa được lưu cục bộ trên trình duyệt thiết bị này (Local Storage) để gọi Cố vấn AI mà không cần cấu hình Vercel.
              </p>
            </div>

            {/* Guidance card */}
            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 space-y-2 text-xs">
              <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <i className="fas fa-info-circle text-blue-500"></i>
                <span>Cách lấy Google Gemini API Key miễn phí:</span>
              </div>
              <ol className="list-decimal list-inside text-slate-600 dark:text-slate-300 space-y-1 pl-1 text-[11px] leading-relaxed">
                <li>
                  Truy cập{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 font-bold underline hover:text-blue-700"
                  >
                    Google AI Studio (aistudio.google.com)
                  </a>
                </li>
                <li>Đăng nhập tài khoản Google (Gmail) của bạn.</li>
                <li>Bấm nút <strong>Create API Key</strong> (Tạo khóa API).</li>
                <li>Sao chép mã khóa (bắt đầu bằng <code>AIzaSy...</code>) và dán vào ô bên trên.</li>
              </ol>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              {savedKey ? (
                <button
                  type="button"
                  onClick={() => {
                    setTempKeyInput('');
                    handleSaveKey();
                  }}
                  className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition cursor-pointer"
                >
                  <i className="fas fa-trash-alt mr-1.5"></i> Xóa Key
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fas fa-save"></i>
                  Lưu & Sử dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
