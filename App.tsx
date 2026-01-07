
import React, { useState, useEffect } from 'react';
import { QCLevel, LabTest, QCResult, QCConfig } from './types';
import { INITIAL_TESTS, MOCK_RESULTS } from './constants';
import LeveyJenningsChart from './components/LeveyJenningsChart';
import RegulatoryAdvisor from './components/RegulatoryAdvisor';

const App: React.FC = () => {
  const [tests, setTests] = useState<LabTest[]>(INITIAL_TESTS);
  const [results, setResults] = useState<QCResult[]>(MOCK_RESULTS);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'config' | 'entry' | 'advisor'>('dashboard');
  const [selectedTestId, setSelectedTestId] = useState<string>(INITIAL_TESTS[0].id);
  const [selectedLevel, setSelectedLevel] = useState<QCLevel>(QCLevel.NORMAL);

  // New Result Form State
  const [formValue, setFormValue] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const activeTest = tests.find(t => t.id === selectedTestId) || tests[0];
  const activeLevelConfig = activeTest.configs[selectedLevel];
  const activeResults = results.filter(r => r.testId === selectedTestId && r.level === selectedLevel);

  const addQCResult = () => {
    if (!formValue || isNaN(Number(formValue))) {
      alert('Vui lòng nhập giá trị số hợp lệ');
      return;
    }
    const newResult: QCResult = {
      id: Math.random().toString(36).substr(2, 9),
      testId: selectedTestId,
      level: selectedLevel,
      value: Number(formValue),
      timestamp: new Date(formDate).getTime(),
    };
    setResults(prev => [...prev, newResult]);
    setFormValue('');
    alert('Đã thêm kết quả QC thành công!');
    setActiveTab('dashboard');
  };

  const handleUpdateConfig = (testId: string, level: QCLevel, field: 'mean' | 'sd', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setTests(prev => prev.map(test => {
      if (test.id === testId) {
        return {
          ...test,
          configs: {
            ...test.configs,
            [level]: {
              ...test.configs[level],
              [field]: numValue
            }
          }
        };
      }
      return test;
    }));
  };

  const saveConfigNotification = () => {
    alert('Đã lưu cấu hình thông số kỹ thuật mới thành công!');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-8 flex items-center gap-4 border-b border-slate-800">
          <div className="bg-gradient-to-tr from-blue-600 to-blue-400 p-2.5 rounded-xl shadow-lg shadow-blue-900/40">
            <i className="fas fa-microscope text-white text-xl"></i>
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-tight tracking-tight">MinhDucLab</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Management System</p>
          </div>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Bảng điều khiển', icon: 'fa-chart-line' },
            { id: 'entry', label: 'Nhập dữ liệu QC', icon: 'fa-plus-circle' },
            { id: 'config', label: 'Cấu hình Mean/SD', icon: 'fa-cog' },
            { id: 'advisor', label: 'Cố vấn Quy định AI', icon: 'fa-robot' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 ${
                activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' 
                : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-lg ${activeTab === item.id ? 'text-white' : 'text-slate-500'}`}></i>
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 bg-slate-800/40 m-4 rounded-3xl border border-slate-700/50 text-xs">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-slate-100 uppercase tracking-tighter">Tiêu chuẩn 2429</p>
            <span className="text-blue-400 font-black">Mức 3/5</span>
          </div>
          <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 w-[65%]"></div>
          </div>
          <p className="mt-3 text-slate-400 italic leading-relaxed">Phòng xét nghiệm đang tuân thủ tốt các quy định nội kiểm.</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50 overflow-y-auto p-6 md:p-10">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'Giám sát Nội kiểm IQC'}
              {activeTab === 'entry' && 'Cập nhật Kết quả'}
              {activeTab === 'config' && 'Cấu hình Thông số'}
              {activeTab === 'advisor' && 'Trợ lý Quy định Thông minh'}
            </h2>
            <p className="text-slate-500 mt-1 font-medium italic">
              ISO 15189 & Quyết định 2429/QĐ-BYT
            </p>
          </div>
          {activeTab === 'dashboard' && (
            <div className="flex gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
              <select 
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="bg-slate-50 border-none px-4 py-2 rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Target Mean</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">{activeLevelConfig.mean}</span>
                  <span className="text-slate-400 font-bold">{activeTest.unit}</span>
                </div>
              </div>
              <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Std. Deviation (SD)</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">{activeLevelConfig.sd}</span>
                </div>
              </div>
              <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">CV (%)</p>
                <span className="text-4xl font-black text-blue-600">
                  {((activeLevelConfig.sd / activeLevelConfig.mean) * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            <LeveyJenningsChart 
              data={activeResults} 
              config={activeLevelConfig} 
              /* Fix: Pass unit prop separately to the chart */
              unit={activeTest.unit}
              title={`${activeTest.name} (${selectedLevel})`} 
            />

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white">
                <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Nhật ký QC</h3>
                <button className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-2">
                  <i className="fas fa-file-pdf"></i> Xuất báo cáo
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="px-8 py-4">Ngày giờ thực hiện</th>
                      <th className="px-8 py-4">Giá trị đo</th>
                      <th className="px-8 py-4">Độ lệch (SD)</th>
                      <th className="px-8 py-4">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {activeResults.length === 0 ? (
                      <tr><td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-medium italic">Chưa có dữ liệu QC cho mức này</td></tr>
                    ) : (
                      activeResults.slice().reverse().map(r => {
                        const sdDiff = (r.value - activeLevelConfig.mean) / activeLevelConfig.sd;
                        const isError = Math.abs(sdDiff) > 3;
                        const isWarning = Math.abs(sdDiff) > 2;
                        const statusLabel = isError ? 'Vi phạm' : isWarning ? 'Cảnh báo' : 'Đạt';
                        const colorClass = isError ? 'bg-red-100 text-red-700' : isWarning ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700';
                        
                        return (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-5 text-slate-600">{new Date(r.timestamp).toLocaleString('vi-VN')}</td>
                            <td className="px-8 py-5 font-black text-slate-900">{r.value}</td>
                            <td className={`px-8 py-5 font-bold ${isError ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-emerald-600'}`}>
                              {sdDiff > 0 ? '+' : ''}{sdDiff.toFixed(2)} SD
                            </td>
                            <td className="px-8 py-5">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${colorClass}`}>
                                {statusLabel}
                              </span>
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
          <div className="max-w-xl mx-auto bg-white p-10 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-200">
                <i className="fas fa-plus text-3xl"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Cập nhật Kết quả QC</h3>
              <p className="text-slate-500 text-sm mt-2 font-medium">Nhập giá trị đo được từ máy xét nghiệm</p>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Xét nghiệm</label>
                  <select 
                    value={selectedTestId}
                    onChange={(e) => setSelectedTestId(e.target.value)}
                    className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all shadow-inner"
                  >
                    {tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mức QC</label>
                  <select 
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value as QCLevel)}
                    className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all shadow-inner"
                  >
                    {Object.values(QCLevel).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ngày thực hiện</label>
                <input 
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Giá trị đo ({activeTest.unit})</label>
                <input 
                  type="number"
                  step="0.01"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 p-6 rounded-3xl font-black text-4xl text-blue-600 border-none outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all shadow-inner text-center"
                />
              </div>
              <button 
                onClick={addQCResult}
                className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all text-lg tracking-tight flex items-center justify-center gap-3"
              >
                <i className="fas fa-save"></i> Lưu kết quả QC
              </button>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {tests.map(test => (
              <div key={test.id} className="bg-white p-8 rounded-[36px] shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">{test.name}</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Đơn vị: {test.unit}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                    <i className="fas fa-vial"></i>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {Object.values(QCLevel).map(lvl => (
                    <div key={lvl} className="p-5 rounded-3xl bg-slate-50/50 border border-slate-100 hover:border-blue-200 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cấu hình Mức {lvl}</span>
                        <div className={`w-2 h-2 rounded-full ${lvl === 'Low' ? 'bg-blue-400' : lvl === 'Normal' ? 'bg-emerald-400' : 'bg-orange-400'}`}></div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-slate-500 block uppercase">Target Mean</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={test.configs[lvl].mean}
                            onChange={(e) => handleUpdateConfig(test.id, lvl, 'mean', e.target.value)}
                            className="w-full bg-white border-none p-3 rounded-xl font-black text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-slate-500 block uppercase">Std. Dev (SD)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={test.configs[lvl].sd}
                            onChange={(e) => handleUpdateConfig(test.id, lvl, 'sd', e.target.value)}
                            className="w-full bg-white border-none p-3 rounded-xl font-black text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={saveConfigNotification}
                  className="mt-8 w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-blue-600 shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-check-circle"></i> Lưu thay đổi thông số
                </button>
              </div>
            ))}
            
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[36px] flex flex-col items-center justify-center p-12 text-slate-400 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-all group">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                <i className="fas fa-plus text-2xl"></i>
              </div>
              <span className="font-black uppercase tracking-widest text-sm">Thêm xét nghiệm mới</span>
              <p className="text-xs mt-2 text-center opacity-60">Thêm mục nội kiểm vào danh sách quản lý</p>
            </div>
          </div>
        )}

        {activeTab === 'advisor' && (
          <div className="h-[calc(100vh-200px)]">
            <RegulatoryAdvisor />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
