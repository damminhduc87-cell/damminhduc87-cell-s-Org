
import React, { useState, useEffect, useMemo } from 'react';
import { QCLevel, LabTest, QCResult, QCConfig } from './types';
import { INITIAL_TESTS, MOCK_RESULTS } from './constants';
import LeveyJenningsChart from './components/LeveyJenningsChart';
import RegulatoryAdvisor from './components/RegulatoryAdvisor';

const App: React.FC = () => {
  const [tests, setTests] = useState<LabTest[]>(() => {
    const saved = localStorage.getItem('mdlab_tests');
    return saved ? JSON.parse(saved) : INITIAL_TESTS;
  });
  const [results, setResults] = useState<QCResult[]>(() => {
    const saved = localStorage.getItem('mdlab_results');
    return saved ? JSON.parse(saved) : MOCK_RESULTS;
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'config' | 'entry' | 'advisor'>('dashboard');
  const [selectedTestId, setSelectedTestId] = useState<string>(tests[0]?.id || INITIAL_TESTS[0].id);
  const [selectedLevel, setSelectedLevel] = useState<QCLevel>(QCLevel.NORMAL);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedResultForAction, setSelectedResultForAction] = useState<QCResult | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [savingTestId, setSavingTestId] = useState<string | null>(null);

  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [worksheetData, setWorksheetData] = useState<Record<string, Record<QCLevel, { val: string, action: string, rule: string }>>>({});

  // State for new test creation
  const [newTestDraft, setNewTestDraft] = useState<LabTest>({
    id: '', name: '', unit: '', tea: 10,
    configs: {
      [QCLevel.LOW]: { mean: 0, sd: 0, bias: 0 },
      [QCLevel.NORMAL]: { mean: 0, sd: 0, bias: 0 },
      [QCLevel.HIGH]: { mean: 0, sd: 0, bias: 0 },
    }
  });

  useEffect(() => { localStorage.setItem('mdlab_tests', JSON.stringify(tests)); }, [tests]);
  useEffect(() => { localStorage.setItem('mdlab_results', JSON.stringify(results)); }, [results]);

  // Phân tích quy tắc Westgard và đề xuất hành động
  const analyzeWestgard = (testId: string, level: QCLevel, currentValue: number): { rule: string, action: string } => {
    const test = tests.find(t => t.id === testId);
    if (!test) return { rule: '', action: '' };
    
    const config = test.configs[level];
    if (config.sd === 0) return { rule: 'Chưa cấu hình SD', action: '' };
    
    const sdDiff = (currentValue - config.mean) / config.sd;
    const absSD = Math.abs(sdDiff);

    if (absSD >= 3) {
      return {
        rule: "Vi phạm 1-3s",
        action: "Lỗi ngẫu nhiên hoặc hệ thống nặng. Dừng xét nghiệm. Kiểm tra hệ thống, calib lại hoặc thay thuốc thử."
      };
    }

    if (absSD >= 2) {
      return {
        rule: "Cảnh báo 1-2s",
        action: "Cần kiểm tra các quy tắc Westgard khác (2-2s, R-4s). Nếu đạt, có thể chấp nhận kết quả nhưng cần theo dõi."
      };
    }

    return { rule: "Đạt", action: "" };
  };

  useEffect(() => {
    const startOfDay = new Date(entryDate).setHours(0,0,0,0);
    const endOfDay = new Date(entryDate).setHours(23,59,59,999);
    
    const initialData: Record<string, Record<QCLevel, { val: string, action: string, rule: string }>> = {};
    tests.forEach(t => {
      initialData[t.id] = {
        [QCLevel.LOW]: { val: '', action: '', rule: '' },
        [QCLevel.NORMAL]: { val: '', action: '', rule: '' },
        [QCLevel.HIGH]: { val: '', action: '', rule: '' }
      };
      
      const dayResults = results.filter(r => 
        r.testId === t.id && 
        r.timestamp >= startOfDay && 
        r.timestamp <= endOfDay
      );
      
      dayResults.forEach(r => {
        const analysis = analyzeWestgard(t.id, r.level, r.value);
        initialData[t.id][r.level] = { 
          val: r.value.toString(), 
          action: r.correctiveAction || '',
          rule: analysis.rule
        };
      });
    });
    setWorksheetData(initialData);
  }, [entryDate, results, tests, activeTab]);

  const activeTest = useMemo(() => tests.find(t => t.id === selectedTestId) || tests[0], [tests, selectedTestId]);
  const activeLevelConfig = activeTest.configs[selectedLevel];
  const activeResults = results.filter(r => r.testId === selectedTestId && r.level === selectedLevel);

  const handleAddNewTest = () => {
    if (!newTestDraft.name || !newTestDraft.unit) return alert('Vui lòng nhập tên và đơn vị xét nghiệm');
    const id = newTestDraft.name.toLowerCase().replace(/\s/g, '-') + '-' + Date.now();
    setTests(prev => [...prev, { ...newTestDraft, id }]);
    setIsAddModalOpen(false);
    setNewTestDraft({ id: '', name: '', unit: '', tea: 10, configs: { [QCLevel.LOW]: { mean: 0, sd: 0, bias: 0 }, [QCLevel.NORMAL]: { mean: 0, sd: 0, bias: 0 }, [QCLevel.HIGH]: { mean: 0, sd: 0, bias: 0 } } });
  };

  const handleDeleteTest = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xoá xét nghiệm này và toàn bộ dữ liệu QC liên quan?')) {
      setTests(prev => prev.filter(t => t.id !== id));
      setResults(prev => prev.filter(r => r.testId !== id));
      if (selectedTestId === id) setSelectedTestId(tests.find(t => t.id !== id)?.id || '');
    }
  };

  const handleSaveConfig = (id: string) => {
    setSavingTestId(id);
    // Simulating a save effect
    setTimeout(() => {
      setSavingTestId(null);
      // Data is already updated in state via onChange
    }, 600);
  };

  const openActionModal = (res: QCResult) => {
    const config = activeTest.configs[res.level];
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

  const handleWorksheetChange = (testId: string, level: QCLevel, value: string) => {
    const numVal = parseFloat(value);
    let analysis = { rule: '', action: '' };
    if (!isNaN(numVal)) analysis = analyzeWestgard(testId, level, numVal);

    setWorksheetData(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [level]: { 
          val: value, 
          action: analysis.action || prev[testId][level].action,
          rule: analysis.rule
        }
      }
    }));
  };

  const saveWorksheet = () => {
    const startOfDay = new Date(entryDate).setHours(0,0,0,0);
    const endOfDay = new Date(entryDate).setHours(23,59,59,999);
    const timestamp = new Date(entryDate).getTime();

    const otherResults = results.filter(r => r.timestamp < startOfDay || r.timestamp > endOfDay);
    const newResults: QCResult[] = [];
    
    Object.keys(worksheetData).forEach(testId => {
      Object.keys(worksheetData[testId]).forEach(lvlKey => {
        const lvl = lvlKey as QCLevel;
        const data = worksheetData[testId][lvl];
        if (data.val && !isNaN(parseFloat(data.val))) {
          newResults.push({
            id: Math.random().toString(36).substr(2, 9),
            testId, level: lvl,
            value: parseFloat(data.val),
            correctiveAction: data.action,
            timestamp: timestamp + (newResults.length * 1000)
          });
        }
      });
    });

    setResults([...otherResults, ...newResults]);
    alert(`Đã lưu ${newResults.length} kết quả thành công!`);
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-transparent">
      <aside className="w-full md:w-72 bg-slate-900/95 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 backdrop-blur-md">
        <div className="p-8 flex items-center gap-4 border-b border-slate-800">
          <div className="bg-gradient-to-tr from-blue-600 to-blue-400 p-2.5 rounded-xl shadow-lg"><i className="fas fa-microscope text-white text-xl"></i></div>
          <div><h1 className="font-bold text-white text-lg leading-tight">MinhDucLab</h1><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">QC Management</p></div>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          {[{ id: 'dashboard', label: 'Biểu đồ IQC', icon: 'fa-chart-line' }, { id: 'entry', label: 'Nhập liệu QC', icon: 'fa-edit' }, { id: 'config', label: 'Cấu hình Mean/SD', icon: 'fa-sliders-h' }, { id: 'advisor', label: 'Cố vấn AI', icon: 'fa-robot' }].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl' : 'hover:bg-slate-800 hover:text-white'}`}>
              <i className={`fas ${item.icon} w-5 text-lg`}></i><span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
              {activeTab === 'dashboard' ? 'Giám sát Nội kiểm IQC' : activeTab === 'entry' ? 'Bảng nhập liệu Westgard' : activeTab === 'config' ? 'Cấu hình Thông số' : 'Trợ lý Quy định AI'}
            </h2>
            <p className="text-slate-600 mt-1 font-medium italic">Tiêu chuẩn ISO 15189 & 2429/QĐ-BYT</p>
          </div>
          {activeTab === 'dashboard' && (
            <div className="flex gap-3 glass-panel p-2 rounded-2xl shadow-sm">
              <select value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)} className="bg-white/50 border-none px-4 py-2 rounded-xl font-bold text-sm outline-none">
                {tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="flex gap-1">{Object.values(QCLevel).map(lvl => <button key={lvl} onClick={() => setSelectedLevel(lvl)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${selectedLevel === lvl ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-white/50'}`}>{lvl}</button>)}</div>
            </div>
          )}
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/90 backdrop-blur-sm p-7 rounded-3xl shadow-sm border border-slate-200 border-b-4 border-b-blue-500"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Mean Target</p><div className="flex items-baseline gap-2"><span className="text-4xl font-black text-slate-900">{activeLevelConfig.mean}</span><span className="text-slate-400 font-bold">{activeTest.unit}</span></div></div>
              <div className="bg-white/90 backdrop-blur-sm p-7 rounded-3xl shadow-sm border border-slate-200 border-b-4 border-b-slate-400"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">SD Spec</p><span className="text-4xl font-black text-slate-900">{activeLevelConfig.sd}</span></div>
              <div className="bg-white/90 backdrop-blur-sm p-7 rounded-3xl shadow-sm border border-slate-200 border-b-4 border-b-emerald-500"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">CV Hiện tại</p><span className="text-4xl font-black text-emerald-600">{activeLevelConfig.mean !== 0 ? ((activeLevelConfig.sd / activeLevelConfig.mean) * 100).toFixed(2) : '0'}%</span></div>
            </div>

            <LeveyJenningsChart data={activeResults} config={activeLevelConfig} unit={activeTest.unit} title={`${activeTest.name} (${selectedLevel})`} />

            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100"><h3 className="font-black text-slate-800 text-xs tracking-widest uppercase">Nhật ký chi tiết (Nhấn hàng vi phạm để xử lý)</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase"><tr><th className="px-8 py-5">Thời gian</th><th className="px-8 py-5">Kết quả</th><th className="px-8 py-5">SD Index</th><th className="px-8 py-5">Trạng thái</th><th className="px-8 py-5">Ghi chú</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {activeResults.length === 0 ? (<tr><td colSpan={5} className="px-8 py-12 text-center text-slate-300 italic">Chưa có dữ liệu.</td></tr>) : 
                      activeResults.slice().sort((a,b) => b.timestamp - a.timestamp).map(r => {
                        const sdDiff = activeLevelConfig.sd !== 0 ? (r.value - activeLevelConfig.mean) / activeLevelConfig.sd : 0;
                        const isViolated = Math.abs(sdDiff) >= 2;
                        return (
                          <tr key={r.id} onClick={() => openActionModal(r)} className={`transition-colors ${isViolated ? 'cursor-pointer hover:bg-red-50 bg-red-50/20' : 'hover:bg-slate-100/50'}`}>
                            <td className="px-8 py-5 text-slate-500">{new Date(r.timestamp).toLocaleString('vi-VN')}</td>
                            <td className="px-8 py-5 font-black text-slate-900">{r.value}</td>
                            <td className={`px-8 py-5 font-bold ${Math.abs(sdDiff) >= 3 ? 'text-red-600' : Math.abs(sdDiff) >= 2 ? 'text-orange-600' : 'text-emerald-600'}`}>{sdDiff > 0 ? '+' : ''}{sdDiff.toFixed(2)} SD</td>
                            <td className="px-8 py-5"><span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase ${Math.abs(sdDiff) >= 3 ? 'bg-red-100 text-red-700' : Math.abs(sdDiff) >= 2 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{Math.abs(sdDiff) >= 3 ? 'Vi phạm' : Math.abs(sdDiff) >= 2 ? 'Cảnh báo' : 'Hợp lệ'}</span></td>
                            <td className="px-8 py-5 text-[10px] italic text-slate-500">{r.correctiveAction || "---"}</td>
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
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/90 backdrop-blur-sm p-6 rounded-[2rem] shadow-sm border border-slate-200">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200"><i className="fas fa-calendar-day text-xl"></i></div>
                   <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày thực hiện</p><input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="bg-transparent border-none font-black text-xl outline-none cursor-pointer" /></div>
                </div>
                <button onClick={saveWorksheet} className="bg-slate-900 text-white font-black px-10 py-4 rounded-2xl shadow-xl hover:bg-blue-600 transition-all flex items-center gap-3 active:scale-95"><i className="fas fa-save"></i> LƯU KẾT QUẢ</button>
             </div>
             <div className="bg-white/90 backdrop-blur-sm rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"><tr><th className="px-8 py-6">Xét nghiệm</th><th className="px-4 py-6 text-center">Low</th><th className="px-4 py-6 text-center">Normal</th><th className="px-4 py-6 text-center">High</th><th className="px-8 py-6">Westgard</th></tr></thead>
                  <tbody className="divide-y divide-slate-200">
                    {tests.map(test => (
                      <tr key={test.id} className="hover:bg-white/50">
                        <td className="px-8 py-6"><div className="font-black text-slate-800">{test.name}</div><div className="text-[9px] text-slate-400 font-black uppercase">{test.unit}</div></td>
                        {Object.values(QCLevel).map(lvl => (
                          <td key={lvl} className="px-2 py-6">
                            <input type="number" step="0.01" value={worksheetData[test.id]?.[lvl]?.val || ''} onChange={(e) => handleWorksheetChange(test.id, lvl, e.target.value)} placeholder="---" className="w-full p-4 rounded-2xl text-center font-black text-xl bg-slate-100/50 border-2 border-transparent focus:bg-white focus:border-blue-400 outline-none transition-all" />
                          </td>
                        ))}
                        <td className="px-8 py-6">
                          {Object.values(QCLevel).map(lvl => {
                             const data = worksheetData[test.id]?.[lvl];
                             if (data?.val && data.rule !== 'Đạt') return <div key={lvl} className="text-[9px] font-black uppercase text-red-600 mb-1">{lvl}: {data.rule}</div>;
                             return null;
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500 pb-10">
            {tests.map(test => (
              <div key={test.id} className="bg-white/90 backdrop-blur-sm p-8 rounded-[2.5rem] shadow-sm border border-slate-200 relative group flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-blue-600 transition-colors"><i className="fas fa-flask"></i></div>
                     <div><h4 className="text-xl font-black text-slate-900">{test.name}</h4><p className="text-[10px] text-slate-400 font-bold uppercase">{test.unit}</p></div>
                  </div>
                  <button onClick={() => handleDeleteTest(test.id)} className="w-9 h-9 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"><i className="fas fa-trash-alt text-xs"></i></button>
                </div>
                <div className="space-y-4 flex-1">
                  {Object.values(QCLevel).map(lvl => (
                    <div key={lvl} className="p-5 rounded-3xl bg-slate-100/50 border border-slate-200 hover:bg-white transition-all">
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-3 flex items-center gap-2">
                         <span className={`w-1.5 h-1.5 rounded-full ${lvl === 'Low' ? 'bg-blue-400' : lvl === 'Normal' ? 'bg-emerald-400' : 'bg-orange-400'}`}></span>
                         Mức {lvl}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[8px] font-black text-slate-400 block ml-2">Mean</label><input type="number" step="0.01" value={test.configs[lvl].mean} onChange={(e) => setTests(prev => prev.map(t => t.id === test.id ? { ...t, configs: { ...t.configs, [lvl]: { ...t.configs[lvl], mean: Number(e.target.value) } } } : t))} className="w-full bg-white p-3 rounded-xl font-black border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm" /></div>
                        <div><label className="text-[8px] font-black text-slate-400 block ml-2">SD</label><input type="number" step="0.01" value={test.configs[lvl].sd} onChange={(e) => setTests(prev => prev.map(t => t.id === test.id ? { ...t, configs: { ...t.configs, [lvl]: { ...t.configs[lvl], sd: Number(e.target.value) } } } : t))} className="w-full bg-white p-3 rounded-xl font-black border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm" /></div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => handleSaveConfig(test.id)} className={`w-full mt-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 ${savingTestId === test.id ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                   {savingTestId === test.id ? <><i className="fas fa-check"></i> ĐÃ LƯU</> : <><i className="fas fa-save"></i> LƯU CẤU HÌNH</>}
                </button>
              </div>
            ))}
            <button onClick={() => setIsAddModalOpen(true)} className="bg-white/40 backdrop-blur-sm border-4 border-dashed border-slate-300 rounded-[2.5rem] flex flex-col items-center justify-center p-16 text-slate-400 hover:border-blue-400 hover:bg-white/60 transition-all cursor-pointer min-h-[500px]">
              <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-300 flex items-center justify-center mb-6 group-hover:border-blue-300"><i className="fas fa-plus text-3xl"></i></div>
              <span className="font-black uppercase tracking-widest text-sm text-slate-500">Thêm xét nghiệm mới</span>
              <p className="text-[10px] mt-2 font-bold opacity-60">Nhấn để mở trình cài đặt</p>
            </button>
          </div>
        )}

        {activeTab === 'advisor' && <div className="h-[calc(100vh-250px)]"><RegulatoryAdvisor /></div>}
      </main>

      {/* MODAL: THÊM XÉT NGHIỆM */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900">THIẾT LẬP XÉT NGHIỆM</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center"><i className="fas fa-times"></i></button>
             </div>
             <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Tên xét nghiệm</label><input placeholder="VD: Glucose" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setNewTestDraft({...newTestDraft, name: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Đơn vị</label><input placeholder="VD: mmol/L" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setNewTestDraft({...newTestDraft, unit: e.target.value})} /></div>
             </div>
             <div className="space-y-4">
                {Object.values(QCLevel).map(lvl => (
                  <div key={lvl} className="p-5 bg-slate-50 rounded-3xl space-y-4 border border-slate-100">
                     <p className="font-black text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${lvl === 'Low' ? 'bg-blue-400' : lvl === 'Normal' ? 'bg-emerald-400' : 'bg-orange-400'}`}></span>
                        THÔNG SỐ MỨC {lvl}
                     </p>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 ml-2">Mean Target</label><input type="number" step="0.01" placeholder="0.0" className="w-full p-4 rounded-xl border bg-white font-black" onChange={e => setNewTestDraft({...newTestDraft, configs: {...newTestDraft.configs, [lvl]: {...newTestDraft.configs[lvl], mean: Number(e.target.value)}}})} /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 ml-2">SD Spec</label><input type="number" step="0.01" placeholder="0.0" className="w-full p-4 rounded-xl border bg-white font-black" onChange={e => setNewTestDraft({...newTestDraft, configs: {...newTestDraft.configs, [lvl]: {...newTestDraft.configs[lvl], sd: Number(e.target.value)}}})} /></div>
                     </div>
                  </div>
                ))}
             </div>
             <div className="flex gap-4 mt-8">
                <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-xs">Huỷ bỏ</button>
                <button onClick={handleAddNewTest} className="flex-2 bg-blue-600 text-white px-10 py-5 rounded-3xl font-black shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-xs">Xác nhận tạo mới</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL: HÀNH ĐỘNG KHẮC PHỤC */}
      {isActionModalOpen && selectedResultForAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsActionModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10">
            <div className="flex items-center gap-5 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl shadow-inner shadow-red-50"><i className="fas fa-exclamation-triangle"></i></div>
              <div><h3 className="text-2xl font-black text-slate-900 leading-none mb-2">XỬ LÝ LỖI QC</h3><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Corrective Action Record</p></div>
            </div>
            <div className="space-y-5 mb-10">
               <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Phân tích vi phạm Westgard</p>
                  <p className="font-black text-slate-800 text-sm leading-relaxed">
                    {analyzeWestgard(selectedResultForAction.testId, selectedResultForAction.level, selectedResultForAction.value).rule}: 
                    <span className="font-medium text-slate-600 ml-2 italic">{analyzeWestgard(selectedResultForAction.testId, selectedResultForAction.level, selectedResultForAction.value).action}</span>
                  </p>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Nội dung hành động thực tế</label>
                  <textarea value={actionComment} onChange={e => setActionComment(e.target.value)} placeholder="Mô tả hành động của bạn (VD: Kiểm tra đường ống, thay thuốc thử mới...)" className="w-full bg-slate-50 p-6 rounded-[2rem] border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none h-36 text-sm font-medium transition-all" />
               </div>
               <div className="flex flex-wrap gap-2">
                  {['Chạy lại mẫu QC mới', 'Hiệu chuẩn (Calibration)', 'Thay thuốc thử', 'Bảo trì kim hút', 'Kiểm tra nhiệt độ'].map(txt => (
                    <button key={txt} onClick={() => setActionComment(txt)} className="text-[10px] font-black px-4 py-2 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-xl transition-all">{txt}</button>
                  ))}
               </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsActionModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Đóng</button>
              <button onClick={saveAction} className="flex-2 bg-slate-900 text-white px-10 py-5 rounded-3xl font-black shadow-2xl hover:bg-blue-600 transition-all uppercase tracking-widest text-[10px]">Xác nhận xử lý lỗi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
