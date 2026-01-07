
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
  
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [worksheetData, setWorksheetData] = useState<Record<string, Record<QCLevel, { val: string, action: string, rule: string }>>>({});

  useEffect(() => { localStorage.setItem('mdlab_tests', JSON.stringify(tests)); }, [tests]);
  useEffect(() => { localStorage.setItem('mdlab_results', JSON.stringify(results)); }, [results]);

  // Phân tích quy tắc Westgard và đề xuất hành động
  const analyzeWestgard = (testId: string, level: QCLevel, currentValue: number): { rule: string, action: string } => {
    const test = tests.find(t => t.id === testId);
    if (!test) return { rule: '', action: '' };
    
    const config = test.configs[level];
    const sdDiff = (currentValue - config.mean) / config.sd;
    const absSD = Math.abs(sdDiff);

    // Lấy lịch sử 6 kết quả gần nhất của test + level này
    const history = results
      .filter(r => r.testId === testId && r.level === level)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 6);

    // 1. Kiểm tra 1-3s (Lỗi ngẫu nhiên hoặc hệ thống nặng)
    if (absSD >= 3) {
      return {
        rule: "Vi phạm 1-3s",
        action: "Dừng xét nghiệm. Kiểm tra hệ thống (thuốc thử, bệnh phẩm, máy). Hiệu chuẩn lại nếu cần. Chạy lại QC mới."
      };
    }

    // 2. Kiểm tra Shift (6 kết quả liên tiếp cùng phía Mean - Lỗi hệ thống)
    if (history.length >= 5) {
      const recentSDs = history.map(h => (h.value - config.mean) / config.sd);
      const allAbove = recentSDs.every(s => s > 0) && sdDiff > 0;
      const allBelow = recentSDs.every(s => s < 0) && sdDiff < 0;
      if (allAbove || allBelow) {
        return {
          rule: "Phát hiện Shift (6x)",
          action: "Lỗi hệ thống. Kiểm tra độ ổn định thuốc thử/hiệu chuẩn. Cần bảo trì hoặc hiệu chuẩn lại máy."
        };
      }
    }

    // 3. Kiểm tra Trend (6 kết quả liên tiếp tăng hoặc giảm - Lỗi hệ thống)
    if (history.length >= 5) {
      const values = [currentValue, ...history.map(h => h.value)];
      let isIncreasing = true;
      let isDecreasing = true;
      for (let i = 0; i < values.length - 1; i++) {
        if (values[i] <= values[i+1]) isDecreasing = false;
        if (values[i] >= values[i+1]) isIncreasing = false;
      }
      if (isIncreasing || isDecreasing) {
        return {
          rule: "Phát hiện Trend (6t)",
          action: "Thuốc thử hoặc linh kiện máy đang thoái hóa. Kiểm tra hạn dùng, điều kiện bảo quản thuốc thử."
        };
      }
    }

    // 4. Cảnh báo 1-2s
    if (absSD >= 2) {
      return {
        rule: "Cảnh báo 1-2s",
        action: "Kiểm tra các quy tắc Westgard khác. Nếu không vi phạm thêm, kết quả có thể chấp nhận nhưng cần theo dõi sát."
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
        const config = t.configs[r.level];
        const sdDiff = (r.value - config.mean) / config.sd;
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

  const activeTest = tests.find(t => t.id === selectedTestId) || tests[0];
  const activeLevelConfig = activeTest.configs[selectedLevel];
  const activeResults = results.filter(r => r.testId === selectedTestId && r.level === selectedLevel);

  const handleWorksheetChange = (testId: string, level: QCLevel, value: string) => {
    const numVal = parseFloat(value);
    let analysis = { rule: '', action: '' };
    
    if (!isNaN(numVal)) {
      analysis = analyzeWestgard(testId, level, numVal);
    }

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

  const handleActionChange = (testId: string, level: QCLevel, action: string) => {
    setWorksheetData(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [level]: { ...prev[testId][level], action }
      }
    }));
  };

  const quickSelectAction = (testId: string, level: QCLevel, action: string) => {
    handleActionChange(testId, level, action);
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
            testId,
            level: lvl,
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

  const handleUpdateConfig = (testId: string, level: QCLevel, field: 'mean' | 'sd', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    setTests(prev => prev.map(test => test.id === testId ? { ...test, configs: { ...test.configs, [level]: { ...test.configs[level], [field]: numValue } } } : test));
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar - Remains identical as per layout */}
      <aside className="w-full md:w-72 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-8 flex items-center gap-4 border-b border-slate-800">
          <div className="bg-gradient-to-tr from-blue-600 to-blue-400 p-2.5 rounded-xl shadow-lg">
            <i className="fas fa-microscope text-white text-xl"></i>
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-tight">MinhDucLab</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">QC Management</p>
          </div>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Báo cáo Sigma', icon: 'fa-chart-pie' },
            { id: 'entry', label: 'Nhập liệu QC', icon: 'fa-edit' },
            { id: 'config', label: 'Cấu hình Mean/SD', icon: 'fa-sliders-h' },
            { id: 'advisor', label: 'Cố vấn Quy định AI', icon: 'fa-robot' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' 
                : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-lg`}></i>
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
              {activeTab === 'dashboard' && 'Giám sát Nội kiểm IQC'}
              {activeTab === 'entry' && 'Bảng nhập liệu Westgard'}
              {activeTab === 'config' && 'Cấu hình Mean/SD'}
              {activeTab === 'advisor' && 'Trợ lý Quy định AI'}
            </h2>
            <p className="text-slate-500 mt-1 font-medium italic">Hỗ trợ phát hiện Trend & Shift tự động</p>
          </div>
          {activeTab === 'dashboard' && (
            <div className="flex gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
              <select 
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="bg-slate-50 border-none px-4 py-2 rounded-xl font-bold text-sm outline-none"
              >
                {tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="flex gap-1">
                {Object.values(QCLevel).map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                      selectedLevel === lvl ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 border-b-4 border-b-blue-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Mean Target</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">{activeLevelConfig.mean}</span>
                  <span className="text-slate-400 font-bold">{activeTest.unit}</span>
                </div>
              </div>
              <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 border-b-4 border-b-slate-400">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">SD Spec</p>
                <span className="text-4xl font-black text-slate-900">{activeLevelConfig.sd}</span>
              </div>
              <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 border-b-4 border-b-emerald-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">CV Hiện tại</p>
                <span className="text-4xl font-black text-emerald-600">
                  {((activeLevelConfig.sd / activeLevelConfig.mean) * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            <LeveyJenningsChart 
              data={activeResults} 
              config={activeLevelConfig} 
              unit={activeTest.unit}
              title={`${activeTest.name} (${selectedLevel})`} 
            />

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
                <h3 className="font-black text-slate-800 text-xs tracking-widest uppercase">Nhật ký chi tiết</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="px-8 py-5">Thời gian</th>
                      <th className="px-8 py-5">Kết quả</th>
                      <th className="px-8 py-5">SD Index</th>
                      <th className="px-8 py-5">Đánh giá</th>
                      <th className="px-8 py-5">Hành động khắc phục</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {activeResults.length === 0 ? (
                      <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-300">Chưa có dữ liệu vận hành.</td></tr>
                    ) : (
                      activeResults.slice().reverse().map(r => {
                        const sdDiff = (r.value - activeLevelConfig.mean) / activeLevelConfig.sd;
                        const isError = Math.abs(sdDiff) >= 3;
                        const isWarning = Math.abs(sdDiff) >= 2;
                        return (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-5 text-slate-500">{new Date(r.timestamp).toLocaleString('vi-VN')}</td>
                            <td className="px-8 py-5 font-black text-slate-900">{r.value}</td>
                            <td className={`px-8 py-5 font-bold ${isError ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-emerald-600'}`}>
                              {sdDiff > 0 ? '+' : ''}{sdDiff.toFixed(2)} SD
                            </td>
                            <td className="px-8 py-5">
                              <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase ${
                                isError ? 'bg-red-50 text-red-700 border border-red-100' : isWarning ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}>
                                {isError ? 'Vi phạm' : isWarning ? 'Cảnh báo' : 'Hợp lệ'}
                              </span>
                            </td>
                            <td className="px-8 py-5 max-w-xs">
                              <div className="text-[11px] text-slate-500 italic leading-relaxed">{r.correctiveAction || "---"}</div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'entry' && (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
                  <i className="fas fa-calendar-day text-xl"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày trực ghi</p>
                  <input 
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="bg-transparent border-none font-black text-xl outline-none cursor-pointer text-slate-900"
                  />
                </div>
              </div>
              <button 
                onClick={saveWorksheet}
                className="bg-slate-900 text-white font-black px-10 py-4 rounded-2xl shadow-xl hover:bg-blue-600 hover:-translate-y-1 transition-all flex items-center gap-3 active:scale-95"
              >
                <i className="fas fa-save"></i> LƯU DỮ LIỆU LAB
              </button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.15em]">
                    <tr>
                      <th className="px-8 py-6">Thông số</th>
                      <th className="px-4 py-6 text-center" style={{ width: '160px' }}>Level Low</th>
                      <th className="px-4 py-6 text-center" style={{ width: '160px' }}>Level Normal</th>
                      <th className="px-4 py-6 text-center" style={{ width: '160px' }}>Level High</th>
                      <th className="px-8 py-6">Phân tích & Khắc phục</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tests.map(test => (
                      <tr key={test.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="font-black text-slate-800 text-lg">{test.name}</div>
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{test.unit}</div>
                        </td>
                        {Object.values(QCLevel).map(lvl => {
                          const data = worksheetData[test.id]?.[lvl] || { val: '', action: '', rule: '' };
                          const config = test.configs[lvl];
                          const numVal = parseFloat(data.val);
                          const sdDiff = isNaN(numVal) ? 0 : (numVal - config.mean) / config.sd;
                          const isError = Math.abs(sdDiff) >= 3;
                          const isWarning = Math.abs(sdDiff) >= 2;

                          return (
                            <td key={lvl} className={`px-4 py-6 ${isError ? 'bg-red-50/30' : isWarning ? 'bg-orange-50/30' : ''}`}>
                              <div className="relative">
                                <input 
                                  type="number"
                                  step="0.01"
                                  value={data.val}
                                  onChange={(e) => handleWorksheetChange(test.id, lvl, e.target.value)}
                                  placeholder="---"
                                  className={`w-full p-4 rounded-2xl text-center font-black text-xl outline-none border-2 transition-all shadow-inner ${
                                    data.val === '' ? 'bg-slate-50 border-transparent' :
                                    isError ? 'bg-white border-red-500 text-red-700 ring-4 ring-red-500/10' :
                                    isWarning ? 'bg-white border-orange-400 text-orange-700 ring-4 ring-orange-400/10' :
                                    'bg-white border-emerald-400 text-emerald-700'
                                  }`}
                                />
                                {data.val !== '' && (
                                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-[9px] font-black uppercase shadow-sm ${
                                    isError ? 'bg-red-600 text-white' : isWarning ? 'bg-orange-500 text-white' : 'bg-emerald-600 text-white'
                                  }`}>
                                    {sdDiff > 0 ? '+' : ''}{sdDiff.toFixed(2)} SD
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-8 py-4">
                          <div className="space-y-3">
                            {Object.values(QCLevel).map(lvl => {
                              const data = worksheetData[test.id]?.[lvl];
                              if (data?.val && data.rule !== 'Đạt') {
                                return (
                                  <div key={lvl} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-right-2">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                        data.rule.includes('Vi phạm') ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                      }`}>
                                        {lvl}: {data.rule}
                                      </span>
                                      <div className="flex gap-1">
                                        {[
                                          { icon: 'fa-redo', title: 'Chạy lại', action: 'Dừng máy. Chạy lại QC mới.' },
                                          { icon: 'fa-magic', title: 'Calib', action: 'Hiệu chuẩn (Calibration) lại thông số. Chạy lại QC.' },
                                          { icon: 'fa-vials', title: 'Thay thuốc thử', action: 'Thay lô thuốc thử mới. Kiểm tra bảo quản.' }
                                        ].map(quick => (
                                          <button 
                                            key={quick.title}
                                            onClick={() => quickSelectAction(test.id, lvl, quick.action)}
                                            title={quick.title}
                                            className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center"
                                          >
                                            <i className={`fas ${quick.icon} text-[10px]`}></i>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <textarea 
                                      value={data.action}
                                      onChange={(e) => handleActionChange(test.id, lvl, e.target.value)}
                                      placeholder="Ghi nhận hành động khắc phục..."
                                      className="w-full bg-slate-50 p-3 rounded-xl text-[10px] font-medium leading-relaxed border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                      rows={2}
                                    />
                                  </div>
                                );
                              }
                              return null;
                            })}
                            {!Object.values(QCLevel).some(lvl => worksheetData[test.id]?.[lvl]?.val && worksheetData[test.id]?.[lvl]?.rule !== 'Đạt') && (
                              <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                                <i className="fas fa-check-circle"></i> Kiểm soát ổn định
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs remain identical as previous implementation */}
        {activeTab === 'config' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
            {tests.map(test => (
              <div key={test.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-black text-slate-900">{test.name}</h4>
                  <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 shadow-sm"><i className="fas fa-sliders-h"></i></div>
                </div>
                <div className="space-y-4">
                  {Object.values(QCLevel).map(lvl => (
                    <div key={lvl} className="p-5 rounded-3xl bg-slate-50/50 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Target {lvl}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Mean</label>
                          <input type="number" step="0.01" value={test.configs[lvl].mean} onChange={(e) => handleUpdateConfig(test.id, lvl, 'mean', e.target.value)} className="w-full bg-white p-4 rounded-2xl font-black outline-none border border-slate-100 focus:ring-4 focus:ring-blue-500/10 shadow-inner" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase ml-2">SD</label>
                          <input type="number" step="0.01" value={test.configs[lvl].sd} onChange={(e) => handleUpdateConfig(test.id, lvl, 'sd', e.target.value)} className="w-full bg-white p-4 rounded-2xl font-black outline-none border border-slate-100 focus:ring-4 focus:ring-blue-500/10 shadow-inner" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'advisor' && (
          <div className="h-[calc(100vh-250px)]">
            <RegulatoryAdvisor />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
