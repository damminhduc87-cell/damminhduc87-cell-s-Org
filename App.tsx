import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { QCLevel, LabTest, QCResult, CAPARecord } from './types';
import { INITIAL_TESTS, MOCK_RESULTS, INITIAL_CAPA_RECORDS, DEFAULT_ANALYZERS } from './constants';
import { evaluateAllResults, evaluateWestgardResult, getWestgardStyle } from './services/westgardEngine';
import { LeveyJenningsChart } from './components/LeveyJenningsChart';
import { SigmaAnalysis } from './components/SigmaAnalysis';
import { CapaReportModal } from './components/CapaReportModal';
import { LotManagementModal } from './components/LotManagementModal';
import { RegulatoryAdvisor } from './components/RegulatoryAdvisor';
import { AddEditTestModal } from './components/AddEditTestModal';

export const App: React.FC = () => {
  // 1. Quản lý trạng thái dữ liệu (đồng bộ với localStorage)
  const [tests, setTests] = useState<LabTest[]>(() => {
    const saved = localStorage.getItem('mdlab_tests_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    // Fallback nếu có v2
    const savedV2 = localStorage.getItem('mdlab_tests_v2');
    if (savedV2) {
      try {
        const parsedV2 = JSON.parse(savedV2);
        if (Array.isArray(parsedV2) && parsedV2.length >= INITIAL_TESTS.length) return parsedV2;
      } catch (e) {}
    }
    return INITIAL_TESTS;
  });

  const [rawResults, setRawResults] = useState<QCResult[]>(() => {
    const saved = localStorage.getItem('mdlab_results_v3') || localStorage.getItem('mdlab_results_v2');
    return saved ? JSON.parse(saved) : MOCK_RESULTS;
  });

  const [capas, setCapas] = useState<CAPARecord[]>(() => {
    const saved = localStorage.getItem('mdlab_capas_v3') || localStorage.getItem('mdlab_capas_v2');
    return saved ? JSON.parse(saved) : INITIAL_CAPA_RECORDS;
  });

  // Danh mục máy phân tích (Customizable analyzers)
  const [analyzers, setAnalyzers] = useState<string[]>(() => {
    const saved = localStorage.getItem('mdlab_analyzers');
    return saved ? JSON.parse(saved) : DEFAULT_ANALYZERS;
  });

  // 2. Điều hướng & Bộ lọc
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entry' | 'worksheet' | 'config' | 'capas' | 'advisor'>('dashboard');
  const [selectedTestId, setSelectedTestId] = useState<string>(tests[0]?.id || INITIAL_TESTS[0].id);
  const [selectedLevel, setSelectedLevel] = useState<QCLevel>(QCLevel.NORMAL);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 3. Quản lý Modal
  const [isCapaModalOpen, setIsCapaModalOpen] = useState(false);
  const [selectedResultForCapa, setSelectedResultForCapa] = useState<QCResult | null>(null);
  const [isLotModalOpen, setIsLotModalOpen] = useState(false);
  const [isAddEditTestModalOpen, setIsAddEditTestModalOpen] = useState(false);
  const [editingTestForModal, setEditingTestForModal] = useState<LabTest | null>(null);

  // Kỹ thuật viên & Lọc máy phân tích
  const [currentTechnician, setCurrentTechnician] = useState('KTV. Nguyễn Văn A');
  const [selectedWorksheetAnalyzer, setSelectedWorksheetAnalyzer] = useState<string>('all');
  const [configSearchTerm, setConfigSearchTerm] = useState('');

  // 4. Trạng thái Form nhập đơn lẻ
  const [singleValue, setSingleValue] = useState('');
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);

  // 5. Trạng thái Bảng kiểm hàng loạt (Worksheet Batch Entry)
  const [worksheetValues, setWorksheetValues] = useState<Record<string, Record<QCLevel, string>>>({});
  const [worksheetDate, setWorksheetDate] = useState(new Date().toISOString().split('T')[0]);

  // Lưu trữ tự động
  useEffect(() => { localStorage.setItem('mdlab_tests_v3', JSON.stringify(tests)); }, [tests]);
  useEffect(() => { localStorage.setItem('mdlab_results_v3', JSON.stringify(rawResults)); }, [rawResults]);
  useEffect(() => { localStorage.setItem('mdlab_capas_v3', JSON.stringify(capas)); }, [capas]);
  useEffect(() => { localStorage.setItem('mdlab_analyzers', JSON.stringify(analyzers)); }, [analyzers]);

  // Thêm máy phân tích mới
  const handleAddAnalyzer = (newAnalyzerName: string) => {
    if (!newAnalyzerName.trim()) return;
    const trimmed = newAnalyzerName.trim();
    if (!analyzers.includes(trimmed)) {
      setAnalyzers(prev => [...prev, trimmed]);
    }
  };

  // Đồng bộ / khôi phục danh mục 20 xét nghiệm đầy đủ
  const handleRestoreFullCatalog = () => {
    if (confirm('Bạn có muốn bổ sung toàn bộ các chỉ số xét nghiệm hóa sinh chuẩn vào danh mục không? (Dữ liệu kết quả nội kiểm hiện có sẽ được giữ nguyên).')) {
      const existingIds = new Set(tests.map(t => t.id));
      const missingTests = INITIAL_TESTS.filter(t => !existingIds.has(t.id));
      if (missingTests.length === 0) {
        alert('Danh mục của bạn đã có đầy đủ toàn bộ các chỉ số hóa sinh!');
      } else {
        setTests(prev => [...prev, ...missingTests]);
        alert(`Đã bổ sung thành công ${missingTests.length} xét nghiệm mới vào danh mục!`);
      }
    }
  };

  // Lưu xét nghiệm mới hoặc cập nhật xét nghiệm
  const handleSaveTest = (savedTest: LabTest) => {
    setTests(prev => {
      const exists = prev.some(t => t.id === savedTest.id);
      if (exists) {
        return prev.map(t => t.id === savedTest.id ? savedTest : t);
      }
      return [...prev, savedTest];
    });
    handleAddAnalyzer(savedTest.analyzerName || 'Máy Hóa sinh 1');
    setSelectedTestId(savedTest.id);
  };

  // Xóa xét nghiệm
  const handleDeleteTest = (testId: string, testName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa xét nghiệm "${testName}" và toàn bộ kết quả QC của nó?`)) {
      setTests(prev => {
        const filtered = prev.filter(t => t.id !== testId);
        if (selectedTestId === testId && filtered.length > 0) {
          setSelectedTestId(filtered[0].id);
        }
        return filtered;
      });
      setRawResults(prev => prev.filter(r => r.testId !== testId));
      alert(`Đã xóa xét nghiệm "${testName}".`);
    }
  };

  // Xét nghiệm đang chọn
  const activeTest = useMemo(() => tests.find(t => t.id === selectedTestId) || tests[0], [tests, selectedTestId]);
  const activeLevelConfig = activeTest?.configs?.[selectedLevel] || { mean: 0, sd: 0, bias: 0 };

  // 6. THUẬT TOÁN ĐA QUY TẮC WESTGARD: Tự động đánh giá toàn bộ chuỗi theo thời gian
  const evaluatedResults = useMemo(() => {
    if (!activeTest) return [];
    const testResults = rawResults.filter(r => r.testId === activeTest.id);
    return evaluateAllResults(testResults, activeTest.configs);
  }, [rawResults, activeTest]);

  // Lọc kết quả của mức đang chọn
  const activeLevelResults = useMemo(() => {
    return evaluatedResults.filter(r => r.level === selectedLevel);
  }, [evaluatedResults, selectedLevel]);

  // Kết quả mới nhất của mức đang chọn
  const latestResult = useMemo(() => {
    if (activeLevelResults.length === 0) return null;
    return activeLevelResults[activeLevelResults.length - 1];
  }, [activeLevelResults]);

  // Trạng thái Westgard mới nhất
  const currentWestgardStyle = latestResult 
    ? getWestgardStyle(latestResult.westgardStatus || 'passed', latestResult.westgardRule || 'none')
    : null;

  // Xử lý khi bấm vào điểm trên biểu đồ hoặc bảng để lập CAPA
  const handleOpenCapa = (result: QCResult) => {
    setSelectedResultForCapa(result);
    setIsCapaModalOpen(true);
  };

  // Lưu biên bản CAPA
  const handleSaveCapa = (newCapa: CAPARecord) => {
    setCapas(prev => [newCapa, ...prev.filter(c => c.id !== newCapa.id)]);
    if (selectedResultForCapa) {
      setRawResults(prev => prev.map(r => 
        r.id === selectedResultForCapa.id 
          ? { ...r, capaId: newCapa.code, correctiveAction: newCapa.immediateCorrection } 
          : r
      ));
    }
    alert(`Đã lưu biên bản CAPA ${newCapa.code} thành công!`);
  };

  // Thêm 1 kết quả QC đơn lẻ
  const handleAddSingleResult = () => {
    const valNum = parseFloat(singleValue);
    if (isNaN(valNum)) return alert('Vui lòng nhập giá trị đo hợp lệ (dạng số).');

    const now = new Date();
    const [year, month, day] = singleDate.split('-').map(Number);
    const dateToUse = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());

    const newRes: QCResult = {
      id: `qc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      testId: selectedTestId,
      level: selectedLevel,
      value: valNum,
      timestamp: dateToUse.getTime(),
      technician: currentTechnician,
      lotNumber: activeLevelConfig.currentLot || 'LOT-DEFAULT'
    };

    const history = rawResults.filter(r => r.testId === selectedTestId);
    const evaluation = evaluateWestgardResult(newRes, history, activeTest.configs);

    newRes.zScore = evaluation.zScore;
    newRes.westgardRule = evaluation.rule;
    newRes.westgardStatus = evaluation.status;

    setRawResults(prev => [...prev, newRes]);
    setSingleValue('');

    if (evaluation.status === 'violation') {
      if (confirm(`CẢNH BÁO: Kết quả vừa nhập vi phạm quy tắc Westgard (${evaluation.rule}): ${evaluation.description}\n\nBạn có muốn mở ngay Mẫu Biên Bản Khắc Phục Sự Cố CAPA theo chuẩn QĐ 2429 không?`)) {
        setSelectedResultForCapa(newRes);
        setIsCapaModalOpen(true);
      }
    } else {
      setActiveTab('dashboard');
    }
  };

  // Lọc xét nghiệm cho bảng kiểm đầu ngày
  const filteredWorksheetTests = useMemo(() => {
    if (selectedWorksheetAnalyzer === 'all') return tests;
    return tests.filter(t => t.analyzerName === selectedWorksheetAnalyzer);
  }, [tests, selectedWorksheetAnalyzer]);

  // Lưu cả mẻ kiểm soát nội kiểm đầu ngày (Batch Worksheet Entry)
  const handleSaveWorksheet = () => {
    const now = new Date();
    const [year, month, day] = worksheetDate.split('-').map(Number);
    const baseTime = new Date(year, month - 1, day, now.getHours(), now.getMinutes()).getTime();

    const newResultsToAdd: QCResult[] = [];
    let violationCount = 0;

    Object.entries(worksheetValues).forEach(([testId, levels]) => {
      const t = tests.find(x => x.id === testId);
      if (!t) return;

      Object.entries(levels).forEach(([lvl, strVal]) => {
        const numVal = parseFloat(strVal);
        if (!isNaN(numVal)) {
          const cfg = t.configs[lvl as QCLevel];
          const itemRes: QCResult = {
            id: `qc_${Date.now()}_${testId}_${lvl}`,
            testId,
            level: lvl as QCLevel,
            value: numVal,
            timestamp: baseTime,
            technician: currentTechnician,
            lotNumber: cfg?.currentLot || 'LOT-2026'
          };
          
          const history = rawResults.filter(r => r.testId === testId);
          const evaluation = evaluateWestgardResult(itemRes, history, t.configs);
          itemRes.zScore = evaluation.zScore;
          itemRes.westgardRule = evaluation.rule;
          itemRes.westgardStatus = evaluation.status;

          if (evaluation.status === 'violation') violationCount++;
          newResultsToAdd.push(itemRes);
        }
      });
    });

    if (newResultsToAdd.length === 0) {
      return alert('Chưa có chỉ số nào được nhập giá trị.');
    }

    setRawResults(prev => [...prev, ...newResultsToAdd]);
    setWorksheetValues({});

    if (violationCount > 0) {
      alert(`Đã lưu thành công ${newResultsToAdd.length} kết quả nội kiểm!\n⚠️ Phát hiện ${violationCount} chỉ số vi phạm quy tắc Westgard. Vui lòng kiểm tra lại trên Bảng điều khiển và lập biên bản CAPA.`);
    } else {
      alert(`Đã lưu thành công mẻ nội kiểm ${newResultsToAdd.length} kết quả! Toàn bộ đều đạt chuẩn an toàn.`);
    }

    setActiveTab('dashboard');
  };

  // Xóa kết quả QC
  const handleDeleteResult = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa kết quả nội kiểm này?')) {
      setRawResults(prev => prev.filter(r => r.id !== id));
    }
  };

  // Xuất Excel chuẩn Bộ Y tế
  const handleExportExcel = () => {
    if (activeLevelResults.length === 0) return alert('Không có dữ liệu để xuất.');

    const dataToExport = activeLevelResults.slice().sort((a, b) => b.timestamp - a.timestamp).map(r => ({
      'Ngày giờ': new Date(r.timestamp).toLocaleString('vi-VN'),
      'Xét nghiệm': activeTest.name,
      'Máy phân tích': activeTest.analyzerName || 'Máy Hóa sinh',
      'Mức QC': r.level,
      'Số Lô': r.lotNumber || activeLevelConfig.currentLot || '---',
      'Giá trị đo': r.value,
      'Đơn vị': activeTest.unit,
      'Mean Đích': activeLevelConfig.mean,
      'SD Đích': activeLevelConfig.sd,
      'Z-score (SDI)': r.zScore,
      'Quy tắc Westgard': r.westgardRule || 'Hợp lệ',
      'Trạng thái': r.westgardStatus === 'violation' ? 'Vi phạm' : r.westgardStatus === 'warning' ? 'Cảnh báo' : 'Hợp lệ',
      'Mã biên bản CAPA': r.capaId || '',
      'KTV thực hiện': r.technician || currentTechnician
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NhatKyIQC_2429");
    
    const fileName = `So_Noi_Kiem_${activeTest.name}_${selectedLevel}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Lọc danh mục cấu hình
  const filteredConfigTests = useMemo(() => {
    if (!configSearchTerm.trim()) return tests;
    const term = configSearchTerm.toLowerCase();
    return tests.filter(t => 
      t.name.toLowerCase().includes(term) || 
      t.unit.toLowerCase().includes(term) ||
      (t.analyzerName && t.analyzerName.toLowerCase().includes(term))
    );
  }, [tests, configSearchTerm]);

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden font-sans">
      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 z-[70] transition-transform duration-300 lg:relative lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <i className="fas fa-microscope text-lg"></i>
          </div>
          <div>
            <h1 className="text-white font-black text-lg tracking-tight">MinhDucLab QC</h1>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Tiêu chuẩn QĐ 2429/QĐ-BYT</p>
          </div>
        </div>

        {/* Current Technician Profile */}
        <div className="px-6 py-4 bg-slate-800/60 mx-4 my-4 rounded-2xl border border-slate-700/50">
          <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">KTV Trực Máy</span>
          <div className="flex items-center gap-2">
            <i className="fas fa-user-circle text-blue-400"></i>
            <input
              type="text"
              value={currentTechnician}
              onChange={e => setCurrentTechnician(e.target.value)}
              className="bg-transparent text-xs font-black text-white outline-none w-full border-b border-transparent focus:border-blue-400"
            />
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Giám sát IQC (Chart)', icon: 'fa-chart-line' },
            { id: 'worksheet', label: 'Bảng kiểm mẻ đầu ngày', icon: 'fa-table' },
            { id: 'entry', label: 'Nhập kết quả đơn lẻ', icon: 'fa-plus-circle' },
            { id: 'capas', label: 'Sổ tay biên bản CAPA', icon: 'fa-clipboard-check' },
            { id: 'config', label: 'Cấu hình & Danh mục', icon: 'fa-boxes' },
            { id: 'advisor', label: 'Cố vấn AI 2429', icon: 'fa-robot' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-center text-sm`}></i>
              <span>{item.label}</span>
              {item.id === 'capas' && capas.length > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-red-500 text-white">
                  {capas.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 font-bold text-center">
          Tổng: {tests.length} xét nghiệm • {analyzers.length} máy
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Navbar */}
        <header className="lg:hidden h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-5 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs">
              <i className="fas fa-microscope"></i>
            </div>
            <span className="font-black text-sm">MinhDucLab QC</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <i className="fas fa-bars"></i>
          </button>
        </header>

        <main className="p-4 md:p-8 lg:p-10 max-w-7xl w-full mx-auto space-y-8">
          {/* Top Bar / Selectors for Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedTestId}
                  onChange={e => setSelectedTestId(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-2xl font-black text-xs outline-none border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  {tests.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.unit}) - {t.analyzerName || 'Máy Hóa sinh'}</option>
                  ))}
                </select>

                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                  {Object.values(QCLevel).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setSelectedLevel(lvl)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                        selectedLevel === lvl 
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 hidden sm:inline">
                  <i className="fas fa-microchip mr-1"></i> {activeTest?.analyzerName || 'Máy Hóa sinh'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsLotModalOpen(true)}
                  className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all"
                >
                  <i className="fas fa-boxes"></i> Lô: {activeLevelConfig.currentLot || 'Chưa gán'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: GIÁM SÁT IQC (DASHBOARD) */}
          {activeTab === 'dashboard' && activeTest && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Westgard Status Alert Banner */}
              {latestResult && currentWestgardStyle && (
                <div className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${currentWestgardStyle.badgeClass}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl shadow-md ${currentWestgardStyle.dotClass}`}>
                      <i className={`fas ${latestResult.westgardStatus === 'violation' ? 'fa-exclamation-circle' : latestResult.westgardStatus === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm uppercase tracking-wider">{currentWestgardStyle.label}</span>
                        <span className="text-xs font-bold opacity-75">
                          (Lần đo gần nhất: {new Date(latestResult.timestamp).toLocaleString('vi-VN')} - Giá trị: {latestResult.value} {activeTest.unit})
                        </span>
                      </div>
                      <p className="text-xs font-medium mt-1">
                        Z-score = <strong>{latestResult.zScore > 0 ? '+' : ''}{latestResult.zScore} SD</strong>. {latestResult.comment || 'Hệ thống đánh giá tự động theo chuỗi thời gian.'}
                      </p>
                    </div>
                  </div>

                  {latestResult.westgardStatus === 'violation' && (
                    <button
                      type="button"
                      onClick={() => handleOpenCapa(latestResult)}
                      className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-red-200 dark:shadow-none uppercase tracking-wider shrink-0 flex items-center gap-2 cursor-pointer transition-all animate-pulse"
                    >
                      <i className="fas fa-file-medical-alt"></i> LẬP BIÊN BẢN CAPA NGAY
                    </button>
                  )}
                </div>
              )}

              {/* Statistical Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest mb-2">Mean Đích</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{activeLevelConfig.mean}</span>
                  <span className="text-xs text-slate-400 ml-1 font-bold">{activeTest.unit}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest mb-2">Độ Lệch Chuẩn (SD)</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{activeLevelConfig.sd}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest mb-2">Hệ Số Biến Thiên (CV%)</span>
                  <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    {activeLevelConfig.mean > 0 ? ((activeLevelConfig.sd / activeLevelConfig.mean) * 100).toFixed(2) : 0}%
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest mb-2">Máy phân tích</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white block mt-2 truncate">
                    {activeTest.analyzerName || 'Máy Hóa sinh'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">Tổng {activeLevelResults.length} mẫu QC</span>
                </div>
              </div>

              {/* Levey-Jennings Interactive Chart */}
              <LeveyJenningsChart
                key={`${selectedTestId}-${selectedLevel}-${activeLevelResults.length}`}
                data={activeLevelResults}
                allResultsForTest={evaluatedResults}
                config={activeLevelConfig}
                allConfigs={activeTest.configs}
                unit={activeTest.unit}
                title={`${activeTest.name} - Mức ${selectedLevel}`}
                onPointClick={handleOpenCapa}
              />

              {/* Six Sigma Analysis */}
              <SigmaAnalysis test={activeTest} config={activeLevelConfig} />

              {/* Nhật Ký Nội Kiểm Bảng Lưới (Log Table) */}
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-history text-blue-500 text-lg"></i>
                    <h3 className="font-black text-sm uppercase text-slate-800 dark:text-white">
                      Nhật ký kết quả nội kiểm (IQC Logbook)
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                    >
                      <i className="fas fa-file-excel"></i> Xuất Sổ Excel
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        <th className="px-5 py-4">Ngày giờ</th>
                        <th className="px-5 py-4">Máy phân tích</th>
                        <th className="px-5 py-4">Số Lô (Lot)</th>
                        <th className="px-5 py-4">Giá trị đo</th>
                        <th className="px-5 py-4">Z-score</th>
                        <th className="px-5 py-4">Quy tắc Westgard</th>
                        <th className="px-5 py-4">Biên bản CAPA</th>
                        <th className="px-5 py-4">KTV</th>
                        <th className="px-5 py-4 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {activeLevelResults.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-12 text-center text-slate-400 italic font-bold">
                            Chưa có dữ liệu nội kiểm cho xét nghiệm này ở mức {selectedLevel}.
                          </td>
                        </tr>
                      ) : (
                        activeLevelResults.slice().reverse().map(r => {
                          const style = getWestgardStyle(r.westgardStatus || 'passed', r.westgardRule || 'none');
                          return (
                            <tr 
                              key={r.id} 
                              onClick={() => handleOpenCapa(r)}
                              className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 cursor-pointer transition-all"
                            >
                              <td className="px-5 py-4 text-slate-500">
                                {new Date(r.timestamp).toLocaleString('vi-VN')}
                              </td>
                              <td className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">
                                {activeTest.analyzerName || 'Máy Hóa sinh'}
                              </td>
                              <td className="px-5 py-4 font-bold">{r.lotNumber || '---'}</td>
                              <td className="px-5 py-4 font-black text-sm text-slate-900 dark:text-white">
                                {r.value} <span className="text-[10px] text-slate-400 font-normal">{activeTest.unit}</span>
                              </td>
                              <td className={`px-5 py-4 font-black ${style.textClass}`}>
                                {r.zScore > 0 ? '+' : ''}{r.zScore} SD
                              </td>
                              <td className="px-5 py-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${style.badgeClass}`}>
                                  {r.westgardRule === 'none' ? 'Hợp lệ' : r.westgardRule}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                {r.capaId ? (
                                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <i className="fas fa-check-circle"></i> {r.capaId}
                                  </span>
                                ) : r.westgardStatus === 'violation' ? (
                                  <span className="text-red-500 font-black animate-pulse">
                                    Cần lập CAPA ↗
                                  </span>
                                ) : (
                                  <span className="text-slate-300">---</span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-slate-500">{r.technician || 'KTV'}</td>
                              <td className="px-5 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteResult(e, r.id)}
                                  className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-500 text-red-500 hover:text-white transition-all flex items-center justify-center mx-auto cursor-pointer"
                                  title="Xóa kết quả"
                                >
                                  <i className="fas fa-trash-alt text-[10px]"></i>
                                </button>
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

          {/* TAB 2: BẢNG KIỂM HÀNG LOẠT (WORKSHEET BATCH ENTRY) */}
          {activeTab === 'worksheet' && (
            <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <i className="fas fa-table text-blue-600"></i> BẢNG KIỂM NỘI KIỂM ĐẦU NGÀY (WORKSHEET)
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Nhập toàn bộ các chỉ số kiểm soát đầu ngày dạng lưới Excel trong 1 phút ({filteredWorksheetTests.length} xét nghiệm)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {/* Lọc theo Máy phân tích */}
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <i className="fas fa-filter text-slate-400 ml-1"></i>
                    <select
                      value={selectedWorksheetAnalyzer}
                      onChange={e => setSelectedWorksheetAnalyzer(e.target.value)}
                      className="bg-transparent font-black text-xs outline-none cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <option value="all">Tất cả máy phân tích ({tests.length})</option>
                      {analyzers.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={worksheetDate}
                      onChange={e => setWorksheetDate(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Grid Form */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-4 py-3">Xét nghiệm</th>
                      <th className="px-4 py-3">Đơn vị</th>
                      <th className="px-4 py-3">Máy phân tích</th>
                      <th className="px-4 py-3">Mức Thấp (Low)</th>
                      <th className="px-4 py-3">Mức Bình thường (Normal)</th>
                      <th className="px-4 py-3">Mức Cao (High)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredWorksheetTests.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-black text-slate-900 dark:text-white">{t.name}</td>
                        <td className="px-4 py-3 text-slate-400 font-bold">{t.unit}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-bold text-[11px]">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 inline-block">
                            {t.analyzerName || 'Máy Hóa sinh 1'}
                          </span>
                        </td>
                        {[QCLevel.LOW, QCLevel.NORMAL, QCLevel.HIGH].map(lvl => {
                          const cfg = t.configs[lvl];
                          return (
                            <td key={lvl} className="px-4 py-3">
                              <div className="space-y-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder={`Mean: ${cfg.mean}`}
                                  value={worksheetValues[t.id]?.[lvl] || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setWorksheetValues(prev => ({
                                      ...prev,
                                      [t.id]: {
                                        ...prev[t.id],
                                        [lvl]: val
                                      }
                                    }));
                                  }}
                                  className="w-28 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-center text-xs focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 font-bold">
                  Mẹo: Dùng phím Tab để nhảy nhanh giữa các ô nhập kết quả.
                </span>
                <button
                  type="button"
                  onClick={handleSaveWorksheet}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-200 dark:shadow-none uppercase tracking-wider cursor-pointer transition-all"
                >
                  <i className="fas fa-save mr-2"></i> LƯU TOÀN BỘ MẺ NỘI KIỂM ĐẦU NGÀY
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: NHẬP ĐƠN LẺ */}
          {activeTab === 'entry' && activeTest && (
            <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-2xl mx-auto shadow-lg shadow-blue-500/30">
                  <i className="fas fa-plus"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Nhập Kết Quả Nội Kiểm Đơn Lẻ</h3>
                <p className="text-xs text-slate-400 font-bold">Hệ thống sẽ tự động đối chiếu các quy tắc Westgard</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Xét nghiệm</label>
                    <select
                      value={selectedTestId}
                      onChange={e => setSelectedTestId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
                    >
                      {tests.map(t => <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Mức QC</label>
                    <select
                      value={selectedLevel}
                      onChange={e => setSelectedLevel(e.target.value as QCLevel)}
                      className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
                    >
                      {Object.values(QCLevel).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Ngày thực hiện</label>
                    <input
                      type="date"
                      value={singleDate}
                      onChange={e => setSingleDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Số Lô (Lot QC)</label>
                    <input
                      type="text"
                      disabled
                      value={activeLevelConfig.currentLot || 'LOT-2026'}
                      className="w-full bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-500"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Giá trị đo ({activeTest.unit}) • {activeTest.analyzerName || 'Máy Hóa sinh'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Mean: ${activeLevelConfig.mean}`}
                    value={singleValue}
                    onChange={e => setSingleValue(e.target.value)}
                    className="w-full bg-transparent text-center font-black text-4xl text-blue-600 dark:text-blue-400 outline-none p-2"
                  />
                  <span className="text-xs text-slate-400 font-bold block mt-1">
                    Giới hạn an toàn ±2SD: [{(activeLevelConfig.mean - 2 * activeLevelConfig.sd).toFixed(2)} - {(activeLevelConfig.mean + 2 * activeLevelConfig.sd).toFixed(2)}]
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddSingleResult}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-200 dark:shadow-none uppercase tracking-wider cursor-pointer transition-all"
                >
                  LƯU KẾT QUẢ & ĐÁNH GIÁ WESTGARD
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SỔ TAY BIÊN BẢN CAPA (HỒ SƠ 2429) */}
          {activeTab === 'capas' && (
            <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <i className="fas fa-clipboard-check text-red-500"></i> SỔ THEO DÕI SỰ CỐ & BIÊN BẢN CAPA
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Lưu trữ hồ sơ xử lý sự cố chất lượng theo Chương VIII - Tiêu chí 2429/QĐ-BYT & ISO 15189
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {capas.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 italic font-bold">
                    Chưa có biên bản CAPA nào được tạo. Khi có sự cố vi phạm Westgard, hãy nhấn vào điểm lỗi để lập biên bản.
                  </div>
                ) : (
                  capas.map(capa => (
                    <div
                      key={capa.id}
                      className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xs transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <strong className="text-sm font-black text-slate-900 dark:text-white">{capa.code}</strong>
                          <span className="px-3 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-700 uppercase">
                            Westgard {capa.violatedRule}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">
                            {new Date(capa.timestamp).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                          Xét nghiệm: <span className="text-blue-600">{capa.testName}</span> (Mức {capa.level} - Lô {capa.lotNumber} - {capa.analyzerName}) • Giá trị vi phạm: <strong>{capa.value} {capa.unit}</strong> (Z = {capa.zScore > 0 ? '+' : ''}{capa.zScore} SD)
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          <strong>Khắc phục:</strong> {capa.immediateCorrection}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Người lập: <strong>{capa.technician}</strong> | Người duyệt: <strong>{capa.approver}</strong> | Chạy lại: <strong className={capa.retestStatus === 'passed' ? 'text-emerald-600' : 'text-red-500'}>{capa.retestValue} {capa.unit} ({capa.retestStatus === 'passed' ? 'ĐẠT' : 'CHƯA ĐẠT'})</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const dummyRes: QCResult = {
                              id: capa.id,
                              testId: capa.testId,
                              level: capa.level,
                              value: capa.value,
                              timestamp: capa.timestamp,
                              lotNumber: capa.lotNumber,
                              technician: capa.technician,
                              approver: capa.approver,
                              westgardRule: capa.violatedRule,
                              capaId: capa.code
                            };
                            const targetTest = tests.find(t => t.id === capa.testId) || activeTest;
                            setSelectedResultForCapa(dummyRes);
                            setIsCapaModalOpen(true);
                          }}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                        >
                          <i className="fas fa-print"></i> Xem & In Lại A4
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CẤU HÌNH & QUẢN LÝ XÉT NGHIỆM */}
          {activeTab === 'config' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Header Actions Bar */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <i className="fas fa-sliders-h text-blue-600"></i> CẤU HÌNH XÉT NGHIỆM & MÁY PHÂN TÍCH
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Quản lý thông số kỹ thuật, tự do kê loại máy phân tích, thiết lập Mean, SD và Số Lô
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRestoreFullCatalog}
                    className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all"
                    title="Khôi phục đầy đủ 20 chỉ số hóa sinh chuẩn"
                  >
                    <i className="fas fa-sync-alt"></i> Khôi phục 20 chỉ số chuẩn
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingTestForModal(null);
                      setIsAddEditTestModalOpen(true);
                    }}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-200 dark:shadow-none flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <i className="fas fa-plus"></i> THÊM XÉT NGHIỆM MỚI
                  </button>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <i className="fas fa-search text-slate-400 ml-2"></i>
                <input
                  type="text"
                  placeholder="Tìm nhanh xét nghiệm theo tên, đơn vị hoặc máy phân tích..."
                  value={configSearchTerm}
                  onChange={e => setConfigSearchTerm(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold outline-none"
                />
                {configSearchTerm && (
                  <button onClick={() => setConfigSearchTerm('')} className="text-slate-400 hover:text-slate-600 text-xs">
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>

              {/* Test Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredConfigTests.map(test => (
                  <div key={test.id} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-xs border border-slate-200 dark:border-slate-800 space-y-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-black text-slate-900 dark:text-white">{test.name}</h4>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-100 text-blue-700">
                            TEa: {test.tea}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-bold mt-1">
                          Đơn vị: <strong>{test.unit}</strong> • Máy: <strong className="text-indigo-600 dark:text-indigo-400">{test.analyzerName || 'Máy Hóa sinh'}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTestForModal(test);
                            setIsAddEditTestModalOpen(true);
                          }}
                          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-all"
                          title="Sửa thông số & Đổi máy"
                        >
                          <i className="fas fa-edit text-xs"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTestId(test.id);
                            setIsLotModalOpen(true);
                          }}
                          className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all border border-indigo-200 dark:border-indigo-800"
                          title="Quản lý Lô chứng"
                        >
                          <i className="fas fa-boxes"></i> Lô QC
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTest(test.id, test.name)}
                          className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-500 hover:text-white text-red-500 flex items-center justify-center cursor-pointer transition-all"
                          title="Xóa xét nghiệm"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      {Object.values(QCLevel).map(lvl => {
                        const cfg = test.configs[lvl];
                        return (
                          <div key={lvl} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-between">
                            <span className="font-bold text-slate-600 dark:text-slate-300">
                              Mức {lvl} ({cfg.currentLot || 'LOT-2026'})
                            </span>
                            <span className="font-black text-slate-900 dark:text-white">
                              Mean: {cfg.mean} | SD: {cfg.sd} | CV: {cfg.mean > 0 ? ((cfg.sd / cfg.mean) * 100).toFixed(2) : 0}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: CỐ VẤN AI 2429 */}
          {activeTab === 'advisor' && (
            <div className="h-[650px] md:h-[750px] animate-in fade-in duration-300">
              <RegulatoryAdvisor currentTest={activeTest} latestViolation={latestResult?.westgardStatus === 'violation' ? latestResult : undefined} />
            </div>
          )}
        </main>
      </div>

      {/* MODAL: THÊM / SỬA XÉT NGHIỆM (ADD / EDIT TEST) */}
      {isAddEditTestModalOpen && (
        <AddEditTestModal
          isOpen={isAddEditTestModalOpen}
          onClose={() => setIsAddEditTestModalOpen(false)}
          onSaveTest={handleSaveTest}
          editingTest={editingTestForModal}
          availableAnalyzers={analyzers}
          onAddAnalyzer={handleAddAnalyzer}
        />
      )}

      {/* MODAL: BIÊN BẢN CAPA IN A4 */}
      {isCapaModalOpen && selectedResultForCapa && activeTest && (
        <CapaReportModal
          isOpen={isCapaModalOpen}
          onClose={() => setIsCapaModalOpen(false)}
          result={selectedResultForCapa}
          test={tests.find(t => t.id === selectedResultForCapa.testId) || activeTest}
          onSaveCapa={handleSaveCapa}
          existingCapa={capas.find(c => c.code === selectedResultForCapa.capaId || (c.timestamp === selectedResultForCapa.timestamp && c.testId === selectedResultForCapa.testId))}
        />
      )}

      {/* MODAL: QUẢN LÝ LÔ CHỨNG (LOT QC) */}
      {isLotModalOpen && activeTest && (
        <LotManagementModal
          isOpen={isLotModalOpen}
          onClose={() => setIsLotModalOpen(false)}
          test={activeTest}
          onUpdateTestLots={(updatedTest) => {
            setTests(prev => prev.map(t => t.id === updatedTest.id ? updatedTest : t));
          }}
        />
      )}
    </div>
  );
};

export default App;
