
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { INITIAL_TESTS, MOCK_RESULTS } from './constants';
import { QCLevel, LabTest, QCResult, QCConfig } from './types';

// --- Components ---

const LeveyJenningsChart = ({ 
  data, 
  config, 
  unit, 
  title 
}: { 
  data: QCResult[], 
  config: QCConfig, 
  unit: string, 
  title: string
}) => {
  const { mean, sd } = config;
  // zoomLevel đại diện cho số lượng SD hiển thị trên trục Y. Mặc định là 4 (±4SD).
  const [zoomLevel, setZoomLevel] = useState(4);

  const chartData = useMemo(() => {
    return [...data].sort((a, b) => a.timestamp - b.timestamp).map(r => ({
      date: new Date(r.timestamp).toLocaleDateString('vi-VN'),
      value: r.value,
    }));
  }, [data]);

  // Tính toán miền giá trị Y dựa trên zoomLevel
  const yDomain = useMemo(() => [
    Number((mean - zoomLevel * sd).toFixed(2)),
    Number((mean + zoomLevel * sd).toFixed(2))
  ], [mean, sd, zoomLevel]);

  const handleZoomIn = () => setZoomLevel(prev => Math.max(1, prev - 0.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.min(10, prev + 0.5));
  const handleReset = () => setZoomLevel(4);

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
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Levey-Jennings Chart</span>
          </div>
        </h3>

        {/* Zoom Controls Area */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
          <button 
            onClick={handleZoomIn}
            className="w-10 h-10 rounded-xl bg-white text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center active:scale-95 group/btn"
            title="Phóng to (Thu hẹp SD)"
          >
            <i className="fas fa-search-plus text-sm"></i>
          </button>
          <button 
            onClick={handleZoomOut}
            className="w-10 h-10 rounded-xl bg-white text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center active:scale-95 group/btn"
            title="Thu nhỏ (Mở rộng SD)"
          >
            <i className="fas fa-search-minus text-sm"></i>
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button 
            onClick={handleReset}
            className="w-10 h-10 rounded-xl bg-white text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center active:scale-95 group/btn"
            title="Đặt lại vùng nhìn (±4SD)"
          >
            <i className="fas fa-expand-arrows-alt text-sm"></i>
          </button>
          <div className="px-3 border-l border-slate-200 ml-1">
             <span className="text-[10px] font-black text-blue-600 tabular-nums">±{zoomLevel.toFixed(1)} SD</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="75%">
        <LineChart data={chartData} margin={{ top: 10, right: 60, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} 
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis 
            domain={yDomain} 
            tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} 
            axisLine={false} 
            tickLine={false} 
            label={{ value: unit, angle: -90, position: 'insideLeft', style: { fill: '#cbd5e1', fontSize: '10px', fontWeight: 'bold' } }}
          />
          <Tooltip 
            contentStyle={{borderRadius: '1.25rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px'}}
            itemStyle={{fontWeight: '900', fontSize: '12px'}}
          />
          
          <ReferenceLine y={mean} stroke="#0f172a" strokeWidth={2.5} label={{ position: 'right', value: 'Mean', fontSize: 11, fill: '#0f172a', fontWeight: '900', offset: 15 }} />
          
          {/* Chỉ hiển thị các đường SD nằm trong zoomLevel */}
          {zoomLevel >= 1 && (
            <>
              <ReferenceLine y={mean + sd} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.5} label={{ position: 'right', value: '+1SD', fontSize: 9, fill: '#94a3b8', fontWeight: '700', offset: 10 }} />
              <ReferenceLine y={mean - sd} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.5} label={{ position: 'right', value: '-1SD', fontSize: 9, fill: '#94a3b8', fontWeight: '700', offset: 10 }} />
            </>
          )}

          {zoomLevel >= 2 && (
            <>
              <ReferenceLine y={mean + 2 * sd} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={1.5} label={{ position: 'right', value: '+2SD', fontSize: 10, fill: '#f59e0b', fontWeight: '800', offset: 10 }} />
              <ReferenceLine y={mean - 2 * sd} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={1.5} label={{ position: 'right', value: '-2SD', fontSize: 10, fill: '#f59e0b', fontWeight: '800', offset: 10 }} />
            </>
          )}

          {zoomLevel >= 3 && (
            <>
              <ReferenceLine y={mean + 3 * sd} stroke="#ef4444" strokeWidth={2} label={{ position: 'right', value: '+3SD', fontSize: 10, fill: '#ef4444', fontWeight: '900', offset: 10 }} />
              <ReferenceLine y={mean - 3 * sd} stroke="#ef4444" strokeWidth={2} label={{ position: 'right', value: '-3SD', fontSize: 10, fill: '#ef4444', fontWeight: '900', offset: 10 }} />
            </>
          )}

          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#2563eb" 
            strokeWidth={4} 
            dot={{ r: 7, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 10, fill: '#1d4ed8', strokeWidth: 3, stroke: '#fff' }}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="mt-4 flex gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-50 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
          <span>Lỗi (±3SD)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div>
          <span>Cảnh báo (±2SD)</span>
        </div>
      </div>
    </div>
  );
};

const RegulatoryAdvisor = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string; sources?: any[] }[]>([
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
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        config: {
          systemInstruction: "Bạn là chuyên gia về quản lý chất lượng phòng xét nghiệm y học tại Việt Nam. Trả lời súc tích, chuyên nghiệp dựa trên 2429/QĐ-BYT.",
          tools: [{ googleSearch: {} }]
        }
      });
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: response.text || "Tôi không thể xử lý thông tin này.", 
        sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Lỗi kết nối AI." }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
        <h3 className="font-black text-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white"><i className="fas fa-robot text-xs"></i></div>
          Cố vấn Quy định AI
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30">Hỗ trợ 2429</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-white border-t flex gap-3">
        <input className="flex-1 bg-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Hỏi về Westgard, 2429..." value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} />
        <button onClick={sendMessage} className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all"><i className="fas fa-paper-plane text-xs"></i></button>
      </div>
    </div>
  );
};

// --- Main App ---

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
  const [selectedTestId, setSelectedTestId] = useState(INITIAL_TESTS[0].id);
  const [selectedLevel, setSelectedLevel] = useState<QCLevel>(QCLevel.NORMAL);
  const [savingTestId, setSavingTestId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form for adding new test
  const [newTestForm, setNewTestForm] = useState({
    name: '',
    unit: '',
    tea: '10',
    low: { mean: '', sd: '', bias: '' },
    normal: { mean: '', sd: '', bias: '' },
    high: { mean: '', sd: '', bias: '' }
  });

  // New Result Form State
  const [formValue, setFormValue] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => { localStorage.setItem('mdlab_tests', JSON.stringify(tests)); }, [tests]);
  useEffect(() => { localStorage.setItem('mdlab_results', JSON.stringify(results)); }, [results]);

  const activeTest = useMemo(() => tests.find(t => t.id === selectedTestId) || tests[0], [tests, selectedTestId]);
  const activeLevelConfig = activeTest?.configs?.[selectedLevel] || { mean: 0, sd: 0, bias: 0 };
  const activeResults = results.filter(r => r.testId === selectedTestId && r.level === selectedLevel);

  const addQCResult = () => {
    if (!formValue || isNaN(Number(formValue))) return alert('Vui lòng nhập giá trị số hợp lệ');
    setResults(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), testId: selectedTestId, level: selectedLevel, value: Number(formValue), timestamp: new Date(formDate).getTime() }]);
    setFormValue('');
    setActiveTab('dashboard');
  };

  const handleUpdateConfig = (testId: string, level: QCLevel, field: keyof QCConfig, value: string) => {
    const numValue = parseFloat(value);
    setTests(prev => prev.map(test => test.id === testId ? { ...test, configs: { ...test.configs, [level]: { ...test.configs[level], [field]: isNaN(numValue) ? 0 : numValue } } } : test));
  };

  const handleSaveTestConfig = (testId: string) => {
    setSavingTestId(testId);
    setTimeout(() => {
      setSavingTestId(null);
      alert(`Đã lưu thành công cấu hình cho xét nghiệm: ${tests.find(t => t.id === testId)?.name}`);
    }, 600);
  };

  const handleDeleteTest = (testId: string) => {
    if (confirm('Bạn có chắc chắn muốn xoá xét nghiệm này? Toàn bộ dữ liệu kết quả liên quan cũng sẽ bị mất.')) {
      setTests(prev => prev.filter(t => t.id !== testId));
      setResults(prev => prev.filter(r => r.testId !== testId));
      if (selectedTestId === testId) {
        setSelectedTestId(tests.find(t => t.id !== testId)?.id || '');
      }
    }
  };

  const handleAddNewTest = () => {
    if (!newTestForm.name || !newTestForm.unit) {
      return alert('Vui lòng nhập tên và đơn vị xét nghiệm.');
    }

    const newTest: LabTest = {
      id: newTestForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') + '-' + Date.now(),
      name: newTestForm.name,
      unit: newTestForm.unit,
      tea: parseFloat(newTestForm.tea) || 10,
      configs: {
        [QCLevel.LOW]: { 
          mean: parseFloat(newTestForm.low.mean) || 0, 
          sd: parseFloat(newTestForm.low.sd) || 0, 
          bias: parseFloat(newTestForm.low.bias) || 0 
        },
        [QCLevel.NORMAL]: { 
          mean: parseFloat(newTestForm.normal.mean) || 0, 
          sd: parseFloat(newTestForm.normal.sd) || 0, 
          bias: parseFloat(newTestForm.normal.bias) || 0 
        },
        [QCLevel.HIGH]: { 
          mean: parseFloat(newTestForm.high.mean) || 0, 
          sd: parseFloat(newTestForm.high.sd) || 0, 
          bias: parseFloat(newTestForm.high.bias) || 0 
        }
      }
    };

    setTests(prev => [...prev, newTest]);
    setIsAddModalOpen(false);
    setNewTestForm({
      name: '',
      unit: '',
      tea: '10',
      low: { mean: '', sd: '', bias: '' },
      normal: { mean: '', sd: '', bias: '' },
      high: { mean: '', sd: '', bias: '' }
    });
    alert('Đã thêm xét nghiệm mới thành công!');
  };

  // Logic xuất file Excel (CSV format with UTF-8 BOM)
  const exportToExcel = () => {
    if (activeResults.length === 0) {
      alert("Không có dữ liệu để xuất file!");
      return;
    }

    const headers = ["Ngày giờ", "Giá trị", "Chỉ số SD", "Trạng thái"];
    const rows = activeResults.slice().reverse().map(r => {
      const sdDiff = activeLevelConfig.sd !== 0 ? (r.value - activeLevelConfig.mean) / activeLevelConfig.sd : 0;
      const status = Math.abs(sdDiff) >= 3 ? "Lỗi hệ thống" : Math.abs(sdDiff) >= 2 ? "Cảnh báo" : "Hợp lệ";
      return [
        new Date(r.timestamp).toLocaleString('vi-VN'),
        r.value,
        sdDiff.toFixed(2),
        status
      ];
    });

    // Tạo nội dung CSV
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Thêm BOM (Byte Order Mark) để Excel nhận diện đúng tiếng Việt (UTF-8)
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const fileName = `QC_Log_${activeTest.name}_${selectedLevel}_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 z-50 transform lg:relative lg:translate-x-0 hidden lg:flex flex-col">
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
          <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40"><i className="fas fa-microscope text-white text-xl"></i></div>
          <div><h1 className="text-white font-black text-xl tracking-tighter leading-none">MinhDucLab</h1><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">QC Management System</p></div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Bảng điều khiển', icon: 'fa-chart-line' },
            { id: 'entry', label: 'Nhập dữ liệu QC', icon: 'fa-plus-circle' },
            { id: 'config', label: 'Cấu hình Mean/SD', icon: 'fa-sliders-h' },
            { id: 'advisor', label: 'Cố vấn Quy định AI', icon: 'fa-robot' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 font-black' : 'hover:bg-white/5 font-bold'}`}>
              <i className={`fas ${item.icon} w-5`}></i><span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 bg-white/5 m-4 rounded-[2rem] border border-white/5">
           <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black uppercase text-slate-500">Tiêu chuẩn 2429</span><span className="text-blue-400 font-black text-xs">Mức 3</span></div>
           <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-600 w-3/5"></div></div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full p-6 md:p-10 lg:p-14 overflow-y-auto max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
              {activeTab === 'dashboard' && 'Giám sát Nội kiểm IQC'}
              {activeTab === 'entry' && 'Cập nhật Kết quả'}
              {activeTab === 'config' && 'Cấu hình Thông số'}
              {activeTab === 'advisor' && 'Trợ lý Quy định'}
            </h2>
            <p className="text-slate-400 font-bold italic text-sm mt-1">Hệ thống quản lý chất lượng theo tiêu chuẩn ISO 15189 & 2429/QĐ-BYT</p>
          </div>
          {activeTab === 'dashboard' && (
            <div className="flex gap-4 p-2 bg-white rounded-3xl shadow-sm border border-slate-100">
              <select value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)} className="bg-slate-50 border-none px-6 py-2 rounded-2xl font-black text-xs outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">{tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <div className="flex gap-1">{Object.values(QCLevel).map(lvl => (<button key={lvl} onClick={() => setSelectedLevel(lvl)} className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase transition-all ${selectedLevel === lvl ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{lvl}</button>))}</div>
            </div>
          )}
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Mean (Giá trị đích)</p>
                 <div className="flex items-baseline gap-2"><span className="text-5xl font-black text-slate-900 tabular-nums">{activeLevelConfig.mean}</span><span className="text-slate-400 font-bold text-xs uppercase">{activeTest?.unit}</span></div>
              </div>
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">SD (Độ lệch chuẩn)</p>
                 <span className="text-5xl font-black text-slate-900 tabular-nums">{activeLevelConfig.sd}</span>
              </div>
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">CV (Hệ số biến thiên)</p>
                 <span className="text-5xl font-black text-blue-600 tabular-nums">{(activeLevelConfig.mean !== 0 ? (activeLevelConfig.sd / activeLevelConfig.mean) * 100 : 0).toFixed(2)}%</span>
              </div>
            </div>
            {activeTest && <LeveyJenningsChart data={activeResults} config={activeLevelConfig} unit={activeTest.unit} title={`${activeTest.name} - Mức ${selectedLevel}`} />}
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                 <h3 className="font-black text-slate-800 text-sm flex items-center gap-3"><i className="fas fa-history text-blue-500"></i> NHẬT KÝ NỘI KIỂM</h3>
                 <button 
                  onClick={exportToExcel}
                  className="bg-slate-900 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2"
                 >
                   <i className="fas fa-file-excel"></i> Xuất File Excel
                 </button>
               </div>
               <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400"><tr><th className="px-8 py-5">Ngày giờ</th><th className="px-8 py-5">Giá trị</th><th className="px-8 py-5">Chỉ số SD</th><th className="px-8 py-5">Kết quả</th></tr></thead><tbody className="divide-y divide-slate-50">
                  {activeResults.length === 0 ? (<tr><td colSpan={4} className="p-20 text-center text-slate-300 italic font-bold">Chưa có kết quả QC cho mục này.</td></tr>) : 
                    activeResults.slice().reverse().map(r => {
                      const sdDiff = activeLevelConfig.sd !== 0 ? (r.value - activeLevelConfig.mean) / activeLevelConfig.sd : 0;
                      const isError = Math.abs(sdDiff) >= 3;
                      const isWarning = Math.abs(sdDiff) >= 2;
                      return (<tr key={r.id} className="hover:bg-slate-50/50 transition-colors"><td className="px-8 py-6 text-slate-500 font-bold text-xs">{new Date(r.timestamp).toLocaleString('vi-VN')}</td><td className="px-8 py-6 font-black text-slate-900">{r.value}</td><td className={`px-8 py-6 font-black ${isError ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-emerald-500'}`}>{sdDiff > 0 ? '+' : ''}{sdDiff.toFixed(2)} SD</td><td className="px-8 py-6"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${isError ? 'bg-red-50 text-red-600 border border-red-100' : isWarning ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>{isError ? 'Lỗi hệ thống' : isWarning ? 'Cảnh báo' : 'Hợp lệ'}</span></td></tr>);
                    })
                  }
               </tbody></table></div>
            </div>
          </div>
        )}

        {activeTab === 'entry' && (
          <div className="max-w-2xl mx-auto bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500">
            <div className="text-center mb-10"><div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-blue-200"><i className="fas fa-plus text-4xl"></i></div><h3 className="text-3xl font-black text-slate-900 tracking-tight">Cập nhật Kết quả QC</h3><p className="text-slate-400 font-bold mt-2 italic">Dữ liệu sẽ được lưu trữ và vẽ biểu đồ ngay lập tức</p></div>
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Xét nghiệm</label><select value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)} className="w-full bg-slate-50 p-5 rounded-3xl font-black border-none outline-none focus:ring-4 focus:ring-blue-500/10 transition-all">{tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Mức QC</label><select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value as QCLevel)} className="w-full bg-slate-50 p-5 rounded-3xl font-black border-none outline-none focus:ring-4 focus:ring-blue-500/10 transition-all">{Object.values(QCLevel).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}</select></div>
              </div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Ngày thực hiện</label><input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-slate-50 p-5 rounded-3xl font-black border-none outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Giá trị đo ({activeTest?.unit})</label><input type="number" step="0.01" value={formValue} onChange={e => setFormValue(e.target.value)} placeholder="Nhập kết quả..." className="w-full bg-slate-50 p-8 rounded-[2.5rem] font-black text-5xl text-blue-600 border-none outline-none focus:ring-8 focus:ring-blue-500/5 transition-all text-center shadow-inner" /></div>
              <button onClick={addQCResult} className="w-full bg-slate-900 text-white font-black py-6 rounded-3xl shadow-2xl shadow-slate-200 hover:bg-blue-600 hover:scale-[1.02] active:scale-95 transition-all text-xl tracking-tight flex items-center justify-center gap-4"><i className="fas fa-save text-sm"></i> LƯU KẾT QUẢ QC</button>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {tests.map(test => (
              <div key={test.id} className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-500 group relative">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-5">
                    <div className="bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500"><i className="fas fa-flask text-xl"></i></div>
                    <div><h4 className="text-2xl font-black text-slate-900 tracking-tighter group-hover:text-blue-600 transition-colors">{test.name}</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Đơn vị đo: {test.unit}</p></div>
                  </div>
                  <button onClick={() => handleDeleteTest(test.id)} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-sm"><i className="fas fa-trash-alt text-xs"></i></button>
                </div>
                
                <div className="space-y-6 mb-10">
                  {Object.values(QCLevel).map(lvl => (
                    <div key={lvl} className="p-6 rounded-[2.5rem] bg-slate-50/50 border border-slate-50 hover:bg-white hover:border-blue-100 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
                      <div className="flex items-center justify-between mb-4"><span className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${lvl === 'Low' ? 'bg-blue-400' : lvl === 'Normal' ? 'bg-emerald-400' : 'bg-orange-400'}`}></div> Cấu hình {lvl}</span></div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 block uppercase ml-2">Mean</label><input type="number" step="0.01" value={test.configs[lvl].mean} onChange={(e) => handleUpdateConfig(test.id, lvl, 'mean', e.target.value)} className="w-full bg-white/50 border border-slate-100 p-4 rounded-2xl font-black text-slate-900 shadow-inner outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm" /></div>
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 block uppercase ml-2">SD</label><input type="number" step="0.01" value={test.configs[lvl].sd} onChange={(e) => handleUpdateConfig(test.id, lvl, 'sd', e.target.value)} className="w-full bg-white/50 border border-slate-100 p-4 rounded-2xl font-black text-slate-900 shadow-inner outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm" /></div>
                        <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 block uppercase ml-2">Bias</label><input type="number" step="0.01" value={test.configs[lvl].bias} onChange={(e) => handleUpdateConfig(test.id, lvl, 'bias', e.target.value)} className="w-full bg-white/50 border border-slate-100 p-4 rounded-2xl font-black text-slate-900 shadow-inner outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm" /></div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => handleSaveTestConfig(test.id)}
                  disabled={savingTestId === test.id}
                  className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-slate-200 ${savingTestId === test.id ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-blue-200'}`}
                >
                  {savingTestId === test.id ? (
                    <><i className="fas fa-circle-notch animate-spin"></i> ĐANG LƯU...</>
                  ) : (
                    <><i className="fas fa-check-double text-sm"></i> LƯU THAY ĐỔI {test.name}</>
                  )}
                </button>
              </div>
            ))}
            
            <div 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3.5rem] flex flex-col items-center justify-center p-14 text-slate-400 hover:border-blue-300 hover:bg-blue-50/20 cursor-pointer transition-all group min-h-[400px]"
            >
              <div className="w-20 h-20 rounded-[2rem] bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500"><i className="fas fa-plus text-3xl"></i></div>
              <span className="font-black uppercase tracking-widest text-sm">Thêm xét nghiệm mới</span>
              <p className="text-xs mt-3 text-center font-bold opacity-60">Thêm danh mục quản lý nội kiểm</p>
            </div>
          </div>
        )}

        {activeTab === 'advisor' && (
          <div className="h-[700px] animate-in fade-in zoom-in duration-500">
            <RegulatoryAdvisor />
          </div>
        )}
      </main>

      {/* Add New Test Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-3"><i className="fas fa-flask text-blue-400"></i> THÊM XÉT NGHIỆM MỚI</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"><i className="fas fa-times"></i></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tên xét nghiệm</label>
                  <input type="text" placeholder="Ví dụ: Glucose" value={newTestForm.name} onChange={e => setNewTestForm({...newTestForm, name: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 border border-slate-100 shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Đơn vị đo</label>
                  <input type="text" placeholder="Ví dụ: mmol/L" value={newTestForm.unit} onChange={e => setNewTestForm({...newTestForm, unit: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 border border-slate-100 shadow-inner" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">TEa mục tiêu (%)</label>
                <input type="number" value={newTestForm.tea} onChange={e => setNewTestForm({...newTestForm, tea: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 border border-slate-100 shadow-inner" />
              </div>

              <div className="space-y-6">
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b pb-2">Cấu hình Spec (Mean & SD)</p>
                {([QCLevel.LOW, QCLevel.NORMAL, QCLevel.HIGH]).map((lvl) => {
                  const key = lvl.toLowerCase() as 'low' | 'normal' | 'high';
                  return (
                    <div key={lvl} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">Mức {lvl}</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 block uppercase ml-2">Mean</label>
                          <input type="number" placeholder="0.00" value={newTestForm[key].mean} onChange={e => setNewTestForm({...newTestForm, [key]: {...newTestForm[key], mean: e.target.value}})} className="w-full bg-white p-3 rounded-xl font-black text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm border border-slate-100" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 block uppercase ml-2">SD</label>
                          <input type="number" placeholder="0.00" value={newTestForm[key].sd} onChange={e => setNewTestForm({...newTestForm, [key]: {...newTestForm[key], sd: e.target.value}})} className="w-full bg-white p-3 rounded-xl font-black text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm border border-slate-100" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 block uppercase ml-2">Bias</label>
                          <input type="number" placeholder="0.00" value={newTestForm[key].bias} onChange={e => setNewTestForm({...newTestForm, [key]: {...newTestForm[key], bias: e.target.value}})} className="w-full bg-white p-3 rounded-xl font-black text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm border border-slate-100" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t flex gap-4">
              <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 rounded-2xl bg-white border border-slate-200 font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">Huỷ bỏ</button>
              <button onClick={handleAddNewTest} className="flex-[2] py-4 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"><i className="fas fa-check"></i> Xác nhận thêm mới</button>
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
