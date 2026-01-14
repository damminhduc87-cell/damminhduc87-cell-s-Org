
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import * as XLSX from 'xlsx';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { INITIAL_TESTS, MOCK_RESULTS } from './constants';
import { QCLevel, LabTest, QCResult, QCConfig } from './types';

// --- Components ---

const LeveyJenningsChart: React.FC<{ 
  data: QCResult[], 
  config: QCConfig, 
  unit: string, 
  title: string
}> = ({ data, config, unit, title }) => {
  const { mean, sd } = config;
  const [zoomLevel, setZoomLevel] = useState(4);

  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(r => ({
        timestamp: r.timestamp,
        fullLabel: new Date(r.timestamp).toLocaleString('vi-VN'), 
        value: r.value,
      }));
  }, [data]);

  const yDomain = useMemo(() => [
    Number((mean - zoomLevel * sd).toFixed(2)),
    Number((mean + zoomLevel * sd).toFixed(2))
  ], [mean, sd, zoomLevel]);

  const formatRefLabel = (label: string, value: number) => {
    return `${value.toFixed(2)} (${label})`;
  };

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 w-full h-[500px] relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-transparent pointer-events-none"></div>
      <div className="flex justify-between items-center mb-6 relative z-10">
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
             <i className="fas fa-chart-line text-xs"></i>
          </div>
          <div className="flex flex-col">
            <span>{title}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Levey-Jennings Chart (±SD Values)</span>
          </div>
        </h3>
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
          <button onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.5))} className="w-8 h-8 rounded-xl bg-white text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center"><i className="fas fa-search-plus text-xs"></i></button>
          <button onClick={() => setZoomLevel(prev => Math.min(10, prev + 0.5))} className="w-8 h-8 rounded-xl bg-white text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center"><i className="fas fa-search-minus text-xs"></i></button>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button onClick={() => setZoomLevel(4)} className="w-8 h-8 rounded-xl bg-white text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center"><i className="fas fa-expand-arrows-alt text-xs"></i></button>
        </div>
      </div>
      <div className="h-[340px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 80, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="fullLabel" tickFormatter={(tick) => tick.split(' ')[0]} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
            <YAxis domain={yDomain} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
            <Tooltip labelStyle={{ fontWeight: 'bold' }} contentStyle={{borderRadius: '1.25rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
            <ReferenceLine y={mean} stroke="#0f172a" strokeWidth={2.5} label={{ position: 'right', value: formatRefLabel('Mean', mean), fontSize: 9, fill: '#0f172a', fontWeight: '900' }} />
            <ReferenceLine y={mean + sd} stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={1} label={{ position: 'right', value: formatRefLabel('+1SD', mean + sd), fontSize: 8, fill: '#94a3b8', fontWeight: 'bold' }} />
            <ReferenceLine y={mean - sd} stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={1} label={{ position: 'right', value: formatRefLabel('-1SD', mean - sd), fontSize: 8, fill: '#94a3b8', fontWeight: 'bold' }} />
            <ReferenceLine y={mean + 2*sd} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={1.5} label={{ position: 'right', value: formatRefLabel('+2SD', mean + 2*sd), fontSize: 9, fill: '#f59e0b', fontWeight: 'bold' }} />
            <ReferenceLine y={mean - 2*sd} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={1.5} label={{ position: 'right', value: formatRefLabel('-2SD', mean - 2*sd), fontSize: 9, fill: '#f59e0b', fontWeight: 'bold' }} />
            <ReferenceLine y={mean + 3*sd} stroke="#ef4444" strokeWidth={2} label={{ position: 'right', value: formatRefLabel('+3SD', mean + 3*sd), fontSize: 9, fill: '#ef4444', fontWeight: 'bold' }} />
            <ReferenceLine y={mean - 3*sd} stroke="#ef4444" strokeWidth={2} label={{ position: 'right', value: formatRefLabel('-3SD', mean - 3*sd), fontSize: 9, fill: '#ef4444', fontWeight: 'bold' }} />
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={4} dot={{ r: 7, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} animationDuration={500} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- Sigma Analysis Component ---
const SigmaAnalysis: React.FC<{ test: LabTest, config: QCConfig }> = ({ test, config }) => {
  const { mean, sd, bias, eqaTarget, eqaResult } = config;
  
  // Tính Bias% thực tế từ Ngoại kiểm (nếu có dữ liệu)
  const actualBias = (eqaTarget && eqaResult) 
    ? (Math.abs(eqaResult - eqaTarget) / eqaTarget) * 100 
    : bias;

  const cv = mean !== 0 ? (sd / mean) * 100 : 0;
  const tea = test.tea;
  
  // TE Actual = |Bias%| + 2*CV%
  const teActual = Math.abs(actualBias) + 2 * cv;
  
  // Sigma = (TEa - |Bias%|) / CV%
  const sigma = cv !== 0 ? (tea - Math.abs(actualBias)) / cv : 0;

  const getStatus = (s: number) => {
    if (s >= 6) return { label: 'Đẳng cấp Thế giới', color: 'text-emerald-600', bg: 'bg-emerald-50', advice: 'Máy vận hành cực kỳ ổn định. Có thể giảm tần suất chạy QC.' };
    if (s >= 5) return { label: 'Xuất sắc', color: 'text-blue-600', bg: 'bg-blue-50', advice: 'Quy trình kiểm soát chất lượng rất tốt. Duy trì vận hành.' };
    if (s >= 4) return { label: 'Khá', color: 'text-indigo-600', bg: 'bg-indigo-50', advice: 'Mức khá, máy vận hành ổn định.' };
    if (s >= 3) return { label: 'Trung bình', color: 'text-amber-600', bg: 'bg-amber-50', advice: 'Cần giám sát chặt chẽ các quy tắc Westgard. Cân nhắc hiệu chuẩn máy.' };
    return { label: 'Kém', color: 'text-red-600', bg: 'bg-red-50', advice: 'Cần cải tiến quy trình hoặc bảo trì máy ngay lập tức. Sai số thực tế quá lớn.' };
  };

  const status = getStatus(sigma);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col gap-6 animate-in slide-in-from-right duration-500">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white"><i className="fas fa-microchip text-xs"></i></div>
          Phân tích Sigma & TE (CLIA 2024)
        </h3>
        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${status.bg} ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 rounded-2xl">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TEa (CLIA)</p>
          <p className="text-xl font-black text-slate-800">{tea}%</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bias (%) {eqaTarget ? '(EQA)' : '(Manual)'}</p>
          <p className="text-xl font-black text-slate-800">{actualBias.toFixed(2)}%</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TE thực tế</p>
          <p className={`text-xl font-black ${teActual > tea ? 'text-red-600' : 'text-slate-800'}`}>
            {teActual.toFixed(2)}%
          </p>
        </div>
        <div className={`p-4 rounded-2xl flex flex-col justify-center ${status.bg}`}>
          <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${status.color}`}>Chỉ số Sigma</p>
          <p className={`text-3xl font-black ${status.color}`}>{sigma.toFixed(2)}</p>
        </div>
      </div>

      <div className={`p-5 rounded-2xl border-l-4 ${status.bg} border-l-current space-y-2`}>
        <p className={`text-xs font-bold leading-relaxed ${status.color}`}>
          <i className="fas fa-lightbulb mr-2"></i>
          {status.advice}
        </p>
        <p className="text-[10px] text-slate-400 italic">
          Công thức: Sigma = (TEa - |Bias%|) / CV% | TE_thct = |Bias%| + 2*CV%
        </p>
      </div>
    </div>
  );
};

// --- Predictive Analytics Component ---
const PredictiveInsights: React.FC<{ results: QCResult[], config: QCConfig }> = ({ results, config }) => {
  const { mean, sd } = config;
  const last10 = useMemo(() => [...results].sort((a,b) => b.timestamp - a.timestamp).slice(0, 10).reverse(), [results]);
  
  const analysis = useMemo(() => {
    if (last10.length < 6) return null;
    
    const vals = last10.map(r => r.value);
    const last6 = vals.slice(-6);
    
    // Shift Detection (6 consecutive points on one side)
    const allAbove = last6.every(v => v > mean);
    const allBelow = last6.every(v => v < mean);
    
    // Trend Detection (6 consecutive points increasing or decreasing)
    let isIncreasing = true;
    let isDecreasing = true;
    for (let i = 1; i < last6.length; i++) {
      if (last6[i] <= last6[i-1]) isIncreasing = false;
      if (last6[i] >= last6[i-1]) isDecreasing = false;
    }

    // Predictive Maintenance (Wide Variation check)
    const currentSD = Math.sqrt(vals.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (vals.length - 1));
    const variationStatus = currentSD > 1.5 * sd ? 'high' : currentSD > 1.2 * sd ? 'warning' : 'stable';

    return {
      shift: allAbove || allBelow ? (allAbove ? 'Dịch chuyển Dương' : 'Dịch chuyển Âm') : null,
      trend: isIncreasing || isDecreasing ? (isIncreasing ? 'Xu hướng Tăng' : 'Xu hướng Giảm') : null,
      maintenance: variationStatus
    };
  }, [last10, mean, sd]);

  if (!analysis) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top duration-500">
      {(analysis.shift || analysis.trend) && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-[2rem] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-200 shrink-0">
            <i className="fas fa-wave-square text-xl"></i>
          </div>
          <div>
            <h4 className="font-black text-amber-800 text-xs uppercase tracking-widest mb-1">Cảnh báo Xu hướng AI</h4>
            <p className="text-amber-700 text-xs font-medium leading-relaxed">
              Phát hiện {analysis.shift || analysis.trend}. Dữ liệu đang có dấu hiệu trôi dần về phía sai số. 
              <span className="block font-black mt-1">Gợi ý: Kiểm tra thuốc thử hoặc Calibration.</span>
            </p>
          </div>
        </div>
      )}
      <div className={`p-5 rounded-[2rem] border flex items-center gap-4 ${analysis.maintenance === 'high' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${analysis.maintenance === 'high' ? 'bg-red-500 text-white shadow-red-200' : 'bg-blue-600 text-white shadow-blue-200'}`}>
          <i className="fas fa-tools text-xl"></i>
        </div>
        <div>
          <h4 className={`font-black text-xs uppercase tracking-widest mb-1 ${analysis.maintenance === 'high' ? 'text-red-800' : 'text-blue-800'}`}>Dự báo Bảo trì</h4>
          <p className={`text-xs font-medium leading-relaxed ${analysis.maintenance === 'high' ? 'text-red-700' : 'text-blue-700'}`}>
            {analysis.maintenance === 'high' ? 
              'Biến động cực lớn (CV tăng vọt). Nguy cơ hỏng linh kiện hoặc kim hút bị tắc.' : 
              'Hệ thống đang hoạt động ổn định. Dự báo lần bảo trì định kỳ tiếp theo sau 150 mẫu.'}
          </p>
        </div>
      </div>
    </div>
  );
};

const RegulatoryAdvisor = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Chào bạn! Tôi là trợ lý AI chuyên về quy định xét nghiệm. Bạn cần hỗ trợ gì về tiêu chuẩn 2429/QĐ-BYT hay các quy tắc Westgard không?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userText,
        config: { 
          systemInstruction: "Bạn là chuyên gia về quản lý chất lượng phòng xét nghiệm y học tại Việt Nam. Trả lời súc tích, chuyên nghiệp dựa trên 2429/QĐ-BYT. Sử dụng Markdown để trình bày đẹp mắt.", 
          tools: [{ googleSearch: {} }] 
        }
      });
      
      let modelText = response.text || "Tôi không thể xử lý thông tin này.";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && groundingChunks.length > 0) {
        const links = groundingChunks
          .map((chunk: any) => chunk.web ? `[${chunk.web.title}](${chunk.web.uri})` : null)
          .filter(Boolean);
        if (links.length > 0) {
          modelText += '\n\n**Nguồn tham khảo:**\n' + links.join('\n');
        }
      }

      setMessages(prev => [...prev, { role: 'model', text: modelText }]);
    } catch (err) { 
      setMessages(prev => [...prev, { role: 'model', text: "Lỗi kết nối AI." }]); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center"><h3 className="font-black text-sm flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white"><i className="fas fa-robot text-xs"></i></div>Cố vấn AI</h3></div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}><div className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</div></div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-white border-t flex gap-3"><input className="flex-1 bg-slate-100 rounded-xl px-4 py-2 text-sm outline-none" placeholder="Hỏi về Westgard..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} /><button onClick={sendMessage} className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-blue-700"><i className="fas fa-paper-plane text-xs"></i></button></div>
    </div>
  );
};

const App = () => {
  const [tests, setTests] = useState<LabTest[]>(() => {
    const saved = localStorage.getItem('mdlab_tests');
    return saved ? JSON.parse(saved) : INITIAL_TESTS;
  });
  const [results, setResults] = useState<QCResult[]>(() => {
    const saved = localStorage.getItem('mdlab_results');
    return saved ? JSON.parse(saved) : MOCK_RESULTS;
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'config' | 'entry' | 'advisor'>('dashboard');
  const [selectedTestId, setSelectedTestId] = useState(tests[0]?.id || INITIAL_TESTS[0].id);
  const [selectedLevel, setSelectedLevel] = useState<QCLevel>(QCLevel.NORMAL);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedResultForAction, setSelectedResultForAction] = useState<QCResult | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [savingTestId, setSavingTestId] = useState<string | null>(null);

  const [formValue, setFormValue] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [newTest, setNewTest] = useState<LabTest>({
    id: '', name: '', unit: '', tea: 10,
    configs: {
      [QCLevel.LOW]: { mean: 0, sd: 0, bias: 0 },
      [QCLevel.NORMAL]: { mean: 0, sd: 0, bias: 0 },
      [QCLevel.HIGH]: { mean: 0, sd: 0, bias: 0 }
    }
  });

  useEffect(() => { localStorage.setItem('mdlab_tests', JSON.stringify(tests)); }, [tests]);
  useEffect(() => { localStorage.setItem('mdlab_results', JSON.stringify(results)); }, [results]);

  const activeTest = useMemo(() => tests.find(t => t.id === selectedTestId) || tests[0], [tests, selectedTestId]);
  const activeLevelConfig = activeTest?.configs?.[selectedLevel] || { mean: 0, sd: 0, bias: 0 };
  const activeResults = useMemo(() => results.filter(r => r.testId === selectedTestId && r.level === selectedLevel), [results, selectedTestId, selectedLevel]);

  const addQCResult = () => {
    if (!formValue || isNaN(Number(formValue))) return alert('Vui lòng nhập số hợp lệ');
    const now = new Date();
    const dateToUse = new Date(formDate);
    dateToUse.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    const newRes: QCResult = { id: Math.random().toString(36).substr(2, 9), testId: selectedTestId, level: selectedLevel, value: Number(formValue), timestamp: dateToUse.getTime() };
    setResults(prev => [...prev, newRes]);
    setFormValue('');
    setActiveTab('dashboard');
  };

  const handleDeleteTest = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xoá xét nghiệm này và toàn bộ dữ liệu QC của nó?')) {
      setTests(prev => prev.filter(t => t.id !== id));
      setResults(prev => prev.filter(r => r.testId !== id));
      if (selectedTestId === id) {
        const remaining = tests.filter(t => t.id !== id);
        setSelectedTestId(remaining.length > 0 ? remaining[0].id : '');
      }
    }
  };

  const handleDeleteQCResult = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xoá kết quả QC này?')) {
      setResults(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleSaveConfig = (id: string) => {
    setSavingTestId(id);
    setTimeout(() => {
      setSavingTestId(null);
    }, 1000);
  };

  const exportToExcel = () => {
    if (activeResults.length === 0) return alert('Không có dữ liệu để xuất');
    
    const dataToExport = activeResults.slice().sort((a,b) => b.timestamp - a.timestamp).map(r => {
      const sdDiff = activeLevelConfig.sd !== 0 ? (r.value - activeLevelConfig.mean) / activeLevelConfig.sd : 0;
      return {
        'Thời gian': new Date(r.timestamp).toLocaleString('vi-VN'),
        'Xét nghiệm': activeTest.name,
        'Mức QC': r.level,
        'Giá trị đo': r.value,
        'Đơn vị': activeTest.unit,
        'Mean Đích': activeLevelConfig.mean,
        'SD Đích': activeLevelConfig.sd,
        'SD Index (Z-score)': sdDiff.toFixed(2),
        'Trạng thái Westgard': Math.abs(sdDiff) >= 3 ? 'Vi phạm (1-3s)' : Math.abs(sdDiff) >= 2 ? 'Cảnh báo (1-2s)' : 'Hợp lệ',
        'Hành động khắc phục': r.correctiveAction || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NhatKyQC");
    
    const fileName = `QC_Log_${activeTest.name}_${selectedLevel}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleAddNewTest = () => {
    if (!newTest.name || !newTest.unit) return alert('Vui lòng nhập tên và đơn vị');
    const id = newTest.name.toLowerCase().replace(/\s/g, '-') + '-' + Date.now();
    setTests(prev => [...prev, { ...newTest, id }]);
    setIsAddModalOpen(false);
    setNewTest({ id: '', name: '', unit: '', tea: 10, configs: { [QCLevel.LOW]: { mean: 0, sd: 0, bias: 0 }, [QCLevel.NORMAL]: { mean: 0, sd: 0, bias: 0 }, [QCLevel.HIGH]: { mean: 0, sd: 0, bias: 0 } } });
  };

  const openActionModal = (res: QCResult) => {
    const test = tests.find(t => t.id === res.testId);
    if (!test) return;
    const config = test.configs[res.level];
    const sdDiff = Math.abs((res.value - config.mean) / config.sd);
    if (sdDiff >= 2) {
      setSelectedResultForAction(res);
      setActionComment(res.correctiveAction || '');
      setIsActionModalOpen(true);
    }
  };

  const saveAction = () => {
    if (selectedResultForAction) {
      setResults(prev => prev.map(r => r.id === selectedResultForAction.id ? { ...r, correctiveAction: actionComment } : r));
      setIsActionModalOpen(false);
    }
  };

  const analyzeWestgard = (res: QCResult) => {
    const test = tests.find(t => t.id === res.testId);
    if (!test) return { rule: '', action: '' };
    const config = test.configs[res.level];
    const sdDiff = (res.value - config.mean) / config.sd;
    const absSD = Math.abs(sdDiff);

    if (absSD >= 3) {
      return { rule: 'Vi phạm 1-3s', action: 'Lỗi ngẫu nhiên hoặc hệ thống nặng. Dừng xét nghiệm, kiểm tra máy/thuốc thử.' };
    }
    if (absSD >= 2) {
      return { rule: 'Cảnh báo 1-2s', action: 'Cần xem xét các quy tắc tích lũy (2-2s, R-4s, 10x). Thận trọng khi duyệt kết quả.' };
    }
    return { rule: 'Hợp lệ', action: '' };
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 z-[70] transition-transform duration-300 lg:relative lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
          <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200"><i className="fas fa-microscope text-xl"></i></div>
          <h1 className="text-white font-black text-xl tracking-tighter">MinhDucLab</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[{ id: 'dashboard', label: 'Bảng điều khiển', icon: 'fa-chart-line' }, { id: 'entry', label: 'Nhập dữ liệu QC', icon: 'fa-plus-circle' }, { id: 'config', label: 'Cấu hình & Ngoại kiểm', icon: 'fa-sliders-h' }, { id: 'advisor', label: 'Cố vấn AI', icon: 'fa-robot' }].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl' : 'hover:bg-white/5 font-bold'}`}>
              <i className={`fas ${item.icon} w-5`}></i>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 h-20 bg-white border-b z-50 flex items-center justify-between px-6">
        <span className="font-black text-lg">MinhDucLab</span>
        <button onClick={() => setIsSidebarOpen(true)} className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center"><i className="fas fa-bars text-xl"></i></button>
      </div>

      <main className="flex-1 w-full p-6 md:p-10 lg:p-14 mt-20 lg:mt-0 max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
            {activeTab === 'dashboard' ? 'Giám sát IQC' : activeTab === 'entry' ? 'Nhập kết quả' : activeTab === 'config' ? 'Cấu hình & Ngoại kiểm' : 'Cố vấn AI'}
          </h2>
          {activeTab === 'dashboard' && tests.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 p-2 bg-white rounded-3xl shadow-sm border">
              <select value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)} className="bg-slate-50 px-6 py-2 rounded-2xl font-black text-xs outline-none border-none">
                {tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="flex gap-1">
                {Object.values(QCLevel).map(lvl => (
                  <button key={lvl} onClick={() => setSelectedLevel(lvl)} className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase transition-all ${selectedLevel === lvl ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>{lvl}</button>
                ))}
              </div>
            </div>
          )}
        </header>

        {activeTab === 'dashboard' && activeTest && (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Sigma & Predictive Section */}
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                  <h3 className="font-black text-slate-900 text-sm tracking-widest uppercase">Phân tích chuyên sâu AI</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PredictiveInsights results={activeResults} config={activeLevelConfig} />
                  <SigmaAnalysis test={activeTest} config={activeLevelConfig} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 border-b-4 border-b-blue-600"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Mean (Đích)</p><span className="text-4xl font-black text-slate-900">{activeLevelConfig.mean}</span></div>
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 border-b-4 border-b-slate-400"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">SD (Lệch chuẩn)</p><span className="text-4xl font-black text-slate-900">{activeLevelConfig.sd}</span></div>
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 border-b-4 border-b-emerald-600"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">CV (%)</p><span className="text-4xl font-black text-blue-600">{((activeLevelConfig.sd / activeLevelConfig.mean) * 100 || 0).toFixed(2)}%</span></div>
            </div>
            
            <LeveyJenningsChart key={`${selectedTestId}-${selectedLevel}-${activeResults.length}`} data={activeResults} config={activeLevelConfig} unit={activeTest.unit} title={`${activeTest.name} - Mức ${selectedLevel}`} />
            
            <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden">
               <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                 <h3 className="font-black text-slate-800 text-sm flex items-center gap-3"><i className="fas fa-history text-blue-500"></i> NHẬT KÝ NỘI KIỂM</h3>
                 <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-slate-400 italic hidden sm:inline">Nhấn vào hàng vi phạm để xử lý lỗi</span>
                    <button 
                      onClick={exportToExcel}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      <i className="fas fa-file-excel"></i> Xuất Excel
                    </button>
                 </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400">
                     <tr><th className="px-6 py-5">Ngày giờ</th><th className="px-6 py-5">Giá trị</th><th className="px-6 py-5">SD Index</th><th className="px-6 py-5">Kết quả</th><th className="px-6 py-5">Hành động</th><th className="px-6 py-5 text-center">Thao tác</th></tr>
                   </thead>
                   <tbody className="divide-y text-sm">
                    {activeResults.length === 0 ? (
                      <tr><td colSpan={6} className="p-20 text-center text-slate-300 font-bold italic">Chưa có kết quả.</td></tr>
                    ) : 
                      activeResults.slice().sort((a,b) => b.timestamp - a.timestamp).map(r => {
                        const sdDiff = activeLevelConfig.sd !== 0 ? (r.value - activeLevelConfig.mean) / activeLevelConfig.sd : 0;
                        const isViolated = Math.abs(sdDiff) >= 2;
                        return (
                          <tr key={r.id} onClick={() => openActionModal(r)} className={`transition-all ${isViolated ? 'cursor-pointer hover:bg-red-50' : 'hover:bg-slate-50'}`}>
                            <td className="px-6 py-6 text-slate-500">{new Date(r.timestamp).toLocaleString('vi-VN')}</td>
                            <td className="px-6 py-6 font-black">{r.value}</td>
                            <td className={`px-6 py-6 font-black ${Math.abs(sdDiff) >= 3 ? 'text-red-600' : Math.abs(sdDiff) >= 2 ? 'text-orange-500' : 'text-emerald-500'}`}>
                              {sdDiff > 0 ? '+' : ''}{sdDiff.toFixed(2)} SD
                            </td>
                            <td className="px-6 py-6">
                              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${Math.abs(sdDiff) >= 3 ? 'bg-red-50 text-red-600 border border-red-100' : Math.abs(sdDiff) >= 2 ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                {Math.abs(sdDiff) >= 3 ? 'Vi phạm' : Math.abs(sdDiff) >= 2 ? 'Cảnh báo' : 'Hợp lệ'}
                              </span>
                            </td>
                            <td className="px-6 py-6 text-[10px] font-bold text-slate-400 italic">
                              {r.correctiveAction ? <span className="text-emerald-600"><i className="fas fa-check-circle mr-1"></i> Đã xử lý</span> : isViolated ? <span className="text-blue-600 animate-pulse">Cần xử lý</span> : '---'}
                            </td>
                            <td className="px-6 py-6 text-center">
                              <button 
                                onClick={(e) => handleDeleteQCResult(e, r.id)}
                                className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center mx-auto shadow-sm"
                                title="Xoá kết quả này"
                              >
                                <i className="fas fa-trash-alt text-xs"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    }
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'entry' && (
          <div className="max-w-2xl mx-auto bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border animate-in zoom-in-95 duration-500">
            <div className="text-center mb-10"><div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-blue-200"><i className="fas fa-plus text-3xl"></i></div><h3 className="text-2xl font-black text-slate-900 tracking-tight">Nhập Kết quả QC</h3></div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Xét nghiệm</label><select value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-black border-none outline-none">{tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Mức QC</label><select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value as QCLevel)} className="w-full bg-slate-50 p-4 rounded-2xl font-black border-none outline-none">{Object.values(QCLevel).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}</select></div>
              </div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Ngày thực hiện</label><input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-black border-none outline-none" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Giá trị đo ({activeTest?.unit})</label><input type="number" step="0.01" value={formValue} onChange={e => setFormValue(e.target.value)} placeholder="Nhập kết quả..." className="w-full bg-slate-50 p-8 rounded-[2rem] font-black text-5xl text-blue-600 border-none outline-none text-center shadow-inner" /></div>
              <button onClick={addQCResult} className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl shadow-xl hover:bg-blue-600 transition-all text-lg tracking-tight">LƯU KẾT QUẢ QC</button>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-700 pb-10">
            {tests.map(test => (
              <div key={test.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 relative group flex flex-col min-h-[600px]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><i className="fas fa-flask text-lg"></i></div>
                    <div><h4 className="text-xl font-black text-slate-900">{test.name}</h4><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{test.unit}</p></div>
                  </div>
                  <button onClick={() => handleDeleteTest(test.id)} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-trash-alt text-xs"></i></button>
                </div>
                
                <div className="space-y-6 flex-1">
                  <div className="px-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TEa Cho phép (%) - CLIA 2024</label><input type="number" step="0.1" value={test.tea} onChange={(e) => setTests(prev => prev.map(t => t.id === test.id ? { ...t, tea: Number(e.target.value) } : t))} className="w-full bg-slate-50 p-3 rounded-xl font-black text-blue-600 mt-1" /></div>
                  
                  {Object.values(QCLevel).map(lvl => (
                    <div key={lvl} className="p-5 rounded-3xl bg-slate-50/50 border border-slate-100 hover:bg-white transition-all">
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">Cấu hình IQC & EQA - Mức {lvl}</p>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 block ml-2 uppercase">Mean (Nội kiểm)</label><input type="number" step="0.01" value={test.configs[lvl].mean} onChange={(e) => setTests(prev => prev.map(t => t.id === test.id ? { ...t, configs: { ...t.configs, [lvl]: { ...t.configs[lvl], mean: Number(e.target.value) } } } : t))} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-black text-xs outline-none focus:ring-2 focus:ring-blue-100" /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 block ml-2 uppercase">SD (Nội kiểm)</label><input type="number" step="0.01" value={test.configs[lvl].sd} onChange={(e) => setTests(prev => prev.map(t => t.id === test.id ? { ...t, configs: { ...t.configs, [lvl]: { ...t.configs[lvl], sd: Number(e.target.value) } } } : t))} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-black text-xs outline-none focus:ring-2 focus:ring-blue-100" /></div>
                      </div>
                      <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                        <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest text-center">Nhập dữ liệu Ngoại kiểm (EQA) để tính Bias%</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 block ml-1 uppercase">Giá trị mục tiêu EQA</label><input type="number" step="0.01" value={test.configs[lvl].eqaTarget || ''} placeholder="0.00" onChange={(e) => setTests(prev => prev.map(t => t.id === test.id ? { ...t, configs: { ...t.configs, [lvl]: { ...t.configs[lvl], eqaTarget: Number(e.target.value) } } } : t))} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-black text-xs outline-none" /></div>
                          <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 block ml-1 uppercase">Kết quả Lab đo được</label><input type="number" step="0.01" value={test.configs[lvl].eqaResult || ''} placeholder="0.00" onChange={(e) => setTests(prev => prev.map(t => t.id === test.id ? { ...t, configs: { ...t.configs, [lvl]: { ...t.configs[lvl], eqaResult: Number(e.target.value) } } } : t))} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl font-black text-xs outline-none" /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleSaveConfig(test.id)} 
                  className={`w-full mt-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 ${savingTestId === test.id ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}
                >
                  {savingTestId === test.id ? <><i className="fas fa-check"></i> ĐÃ LƯU</> : <><i className="fas fa-save"></i> LƯU THÔNG SỐ</>}
                </button>
              </div>
            ))}

            <button onClick={() => setIsAddModalOpen(true)} className="bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center p-14 text-slate-400 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all min-h-[500px]">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-6"><i className="fas fa-plus text-2xl"></i></div>
              <span className="font-black uppercase tracking-widest text-sm">Thêm xét nghiệm mới</span>
              <p className="text-[10px] mt-2 font-bold opacity-60">Theo chuẩn CLIA 2024</p>
            </button>
          </div>
        )}

        {activeTab === 'advisor' && <div className="h-[600px] md:h-[700px] animate-in fade-in duration-500"><RegulatoryAdvisor /></div>}
      </main>

      {/* MODAL: THÊM XÉT NGHIỆM */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900">THIẾT LẬP XÉT NGHIỆM MỚI</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center"><i className="fas fa-times"></i></button>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Tên xét nghiệm</label><input placeholder="VD: Glucose" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none" onChange={e => setNewTest({...newTest, name: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Đơn vị</label><input placeholder="VD: mmol/L" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none" onChange={e => setNewTest({...newTest, unit: e.target.value})} /></div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">TEa CLIA 2024 (%)</label><input type="number" placeholder="VD: 8" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none" onChange={e => setNewTest({...newTest, tea: Number(e.target.value)})} /></div>
              {Object.values(QCLevel).map(lvl => (
                <div key={lvl} className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-100">
                  <p className="font-black text-[10px] uppercase tracking-widest text-slate-500">Mức {lvl}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" step="0.01" placeholder="Mean Target" className="w-full p-3 rounded-xl border bg-white font-bold" onChange={e => setNewTest({...newTest, configs: {...newTest.configs, [lvl]: {...newTest.configs[lvl], mean: Number(e.target.value)}}})} />
                    <input type="number" step="0.01" placeholder="SD Spec" className="w-full p-3 rounded-xl border bg-white font-bold" onChange={e => setNewTest({...newTest, configs: {...newTest.configs, [lvl]: {...newTest.configs[lvl], sd: Number(e.target.value)}}})} />
                  </div>
                </div>
              ))}
              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 font-black uppercase tracking-widest text-slate-400 text-xs">Huỷ bỏ</button>
                <button onClick={handleAddNewTest} className="flex-2 bg-blue-600 text-white px-10 py-5 rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs">Tạo xét nghiệm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HÀNH ĐỘNG KHẮC PHỤC (ACTION MODAL) */}
      {isActionModalOpen && selectedResultForAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsActionModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10">
            <div className="flex items-center gap-5 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl shadow-inner shadow-red-50"><i className="fas fa-exclamation-triangle"></i></div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-none mb-2">XỬ LÝ LỖI QC</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Hành động khắc phục Westgard</p>
              </div>
            </div>
            
            <div className="space-y-6 mb-10">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Phân tích vi phạm</p>
                <p className="font-black text-slate-800 text-sm leading-relaxed">
                  {analyzeWestgard(selectedResultForAction).rule}: 
                  <span className="font-medium text-slate-600 ml-2 italic">{analyzeWestgard(selectedResultForAction).action}</span>
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Nội dung khắc phục chi tiết</label>
                <textarea 
                  value={actionComment} 
                  onChange={e => setActionComment(e.target.value)} 
                  placeholder="Mô tả các bước xử lý (VD: Calib lại máy, thay lô thuốc thử mới...)" 
                  className="w-full bg-slate-50 p-6 rounded-[2rem] border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none h-36 text-sm font-medium transition-all" 
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {['Chạy lại mẫu QC mới', 'Hiệu chuẩn (Calibration)', 'Thay thuốc thử', 'Bảo trì kim hút', 'Kiểm tra đường ống'].map(txt => (
                  <button key={txt} onClick={() => setActionComment(txt)} className="text-[10px] font-black px-4 py-2 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-xl transition-all">{txt}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setIsActionModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Đóng</button>
              <button onClick={saveAction} className="flex-2 bg-slate-900 text-white px-10 py-5 rounded-3xl font-black shadow-2xl hover:bg-blue-600 transition-all uppercase tracking-widest text-[10px]">Xác nhận xử lý</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Rendering ---
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
