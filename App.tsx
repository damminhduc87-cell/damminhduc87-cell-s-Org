import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { QCLevel, LabTest, QCResult, CAPARecord } from './types';
import { INITIAL_TESTS, MOCK_RESULTS, INITIAL_CAPA_RECORDS, DEFAULT_ANALYZERS } from './constants';
import { evaluateAllResults, evaluateWestgardResult, getWestgardStyle } from './services/westgardEngine';

// Redesigned components
import { Sidebar, NavTabId } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { HeaderFilterBar } from './components/HeaderFilterBar';
import { HeroStatusCard } from './components/HeroStatusCard';
import { KpiCards } from './components/KpiCards';
import { LeveyJenningsChart } from './components/LeveyJenningsChart';
import { SigmaAnalysis } from './components/SigmaAnalysis';
import { LogbookTable } from './components/LogbookTable';
import { ToastContainer, ToastMessage } from './components/Toast';

// Modals
import { CapaReportModal } from './components/CapaReportModal';
import { LotManagementModal } from './components/LotManagementModal';
import { RegulatoryAdvisor } from './components/RegulatoryAdvisor';
import { AddEditTestModal } from './components/AddEditTestModal';
import { ImportDataModal } from './components/ImportDataModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { syncResultsToGoogleSheets } from './services/googleSheetsSync';

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

  const [analyzers, setAnalyzers] = useState<string[]>(() => {
    const saved = localStorage.getItem('mdlab_analyzers');
    return saved ? JSON.parse(saved) : DEFAULT_ANALYZERS;
  });

  // 2. Điều hướng & Bộ lọc
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');
  const [selectedTestId, setSelectedTestId] = useState<string>(tests[0]?.id || INITIAL_TESTS[0].id);
  const [selectedLevel, setSelectedLevel] = useState<QCLevel>(QCLevel.NORMAL);
  const [selectedAnalyzerFilter, setSelectedAnalyzerFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('all');

  // Sidebar responsive & collapse
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // 3. Quản lý Modal
  const [isCapaModalOpen, setIsCapaModalOpen] = useState<boolean>(false);
  const [selectedResultForCapa, setSelectedResultForCapa] = useState<QCResult | null>(null);
  const [isLotModalOpen, setIsLotModalOpen] = useState<boolean>(false);
  const [isAddEditTestModalOpen, setIsAddEditTestModalOpen] = useState<boolean>(false);
  const [editingTestForModal, setEditingTestForModal] = useState<LabTest | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isDriveSyncModalOpen, setIsDriveSyncModalOpen] = useState<boolean>(false);

  // 4. Người thực hiện & Cấu hình tìm kiếm
  const [currentTechnician, setCurrentTechnician] = useState<string>(() => {
    const saved = localStorage.getItem('mdlab_technician');
    if (saved) return saved.replace(/^KTV\.?\s*/i, '');
    return 'Nguyễn Văn A';
  });
  const [selectedWorksheetAnalyzer, setSelectedWorksheetAnalyzer] = useState<string>('all');
  const [configSearchTerm, setConfigSearchTerm] = useState<string>('');
  const [capaSearchTerm, setCapaSearchTerm] = useState<string>('');

  // 5. Trạng thái Form nhập đơn lẻ
  const [singleValue, setSingleValue] = useState<string>('');
  const [singleDate, setSingleDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // 6. Trạng thái Bảng kiểm hàng loạt (Worksheet Batch Entry)
  const [worksheetValues, setWorksheetValues] = useState<Record<string, Record<QCLevel, string>>>({});
  const [worksheetDate, setWorksheetDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // 7. Google Drive / Google Sheets Webhook Sync
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState<string>(() => {
    return localStorage.getItem('mdlab_google_sheets_url') || 'https://script.google.com/macros/s/AKfycbwguwULZKpcHN_HPGZm6VY2ioscO8u1N5TOE0wE3iIFZVMBdSnjerZIXs5GJuqUjJKMqQ/exec';
  });
  const [autoSyncToSheets, setAutoSyncToSheets] = useState<boolean>(() => {
    const saved = localStorage.getItem('mdlab_auto_sync_sheets');
    return saved !== null ? saved === 'true' : true;
  });

  // 8. Toast Notification System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Keyboard accessibility: Escape to close open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCapaModalOpen) setIsCapaModalOpen(false);
        if (isLotModalOpen) setIsLotModalOpen(false);
        if (isAddEditTestModalOpen) setIsAddEditTestModalOpen(false);
        if (isImportModalOpen) setIsImportModalOpen(false);
        if (isDriveSyncModalOpen) setIsDriveSyncModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCapaModalOpen, isLotModalOpen, isAddEditTestModalOpen, isImportModalOpen, isDriveSyncModalOpen]);

  // Lưu trữ tự động vào localStorage
  useEffect(() => { localStorage.setItem('mdlab_tests_v3', JSON.stringify(tests)); }, [tests]);
  useEffect(() => { localStorage.setItem('mdlab_results_v3', JSON.stringify(rawResults)); }, [rawResults]);
  useEffect(() => { localStorage.setItem('mdlab_capas_v3', JSON.stringify(capas)); }, [capas]);
  useEffect(() => { localStorage.setItem('mdlab_analyzers', JSON.stringify(analyzers)); }, [analyzers]);
  useEffect(() => { localStorage.setItem('mdlab_technician', currentTechnician); }, [currentTechnician]);
  useEffect(() => { localStorage.setItem('mdlab_google_sheets_url', googleSheetsUrl); }, [googleSheetsUrl]);
  useEffect(() => { localStorage.setItem('mdlab_auto_sync_sheets', String(autoSyncToSheets)); }, [autoSyncToSheets]);

  // Thêm máy phân tích mới
  const handleAddAnalyzer = (newAnalyzerName: string) => {
    if (!newAnalyzerName.trim()) return;
    const trimmed = newAnalyzerName.trim();
    if (!analyzers.includes(trimmed)) {
      setAnalyzers(prev => [...prev, trimmed]);
    }
  };

  // Khôi phục danh mục 20 xét nghiệm đầy đủ
  const handleRestoreFullCatalog = () => {
    if (confirm('Bạn có muốn bổ sung toàn bộ các chỉ số xét nghiệm hóa sinh chuẩn vào danh mục không? (Dữ liệu kết quả nội kiểm hiện có sẽ được giữ nguyên).')) {
      const existingIds = new Set(tests.map(t => t.id));
      const missingTests = INITIAL_TESTS.filter(t => !existingIds.has(t.id));
      if (missingTests.length === 0) {
        addToast('info', 'Danh mục đầy đủ', 'Danh mục của bạn đã có đầy đủ toàn bộ các chỉ số hóa sinh!');
      } else {
        setTests(prev => [...prev, ...missingTests]);
        addToast('success', 'Đã bổ sung xét nghiệm', `Đã bổ sung thành công ${missingTests.length} xét nghiệm mới vào danh mục!`);
      }
    }
  };

  // Lưu xét nghiệm mới hoặc cập nhật
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
    addToast('success', 'Thành công', `Đã lưu thông số xét nghiệm "${savedTest.name}".`);
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
      addToast('warning', 'Đã xóa xét nghiệm', `Đã xóa xét nghiệm "${testName}" khỏi hệ thống.`);
    }
  };

  // Nạp kết quả từ Google Drive / Excel vào hệ thống
  const handleImportSuccess = (importedResults: QCResult[], updatedTests?: LabTest[]) => {
    if (updatedTests && updatedTests.length > 0) {
      setTests(updatedTests);
    }
    setRawResults(prev => {
      const existingIds = new Set(prev.map(r => r.id));
      const newUnique = importedResults.filter(r => !existingIds.has(r.id));
      return [...prev, ...newUnique];
    });
    addToast('success', 'Đồng bộ thành công', `Đã nạp thành công ${importedResults.length} kết quả từ Google Drive vào hệ thống!`);
  };

  // Xét nghiệm đang chọn
  const activeTest = useMemo(() => {
    return tests.find(t => t.id === selectedTestId) || tests[0] || INITIAL_TESTS[0];
  }, [tests, selectedTestId]);

  const activeLevelConfig = activeTest?.configs?.[selectedLevel] || { mean: 0, sd: 0, bias: 0, currentLot: 'LOT-DEFAULT' };

  // THUẬT TOÁN ĐA QUY TẮC WESTGARD: Tự động đánh giá toàn bộ chuỗi theo thời gian
  const evaluatedResults = useMemo(() => {
    if (!activeTest) return [];
    const testResults = rawResults.filter(r => r.testId === activeTest.id);
    return evaluateAllResults(testResults, activeTest.configs);
  }, [rawResults, activeTest]);

  // Lọc kết quả theo mức và thời gian
  const activeLevelResults = useMemo(() => {
    let list = evaluatedResults.filter(r => r.level === selectedLevel);
    if (timeRange === '7') {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      list = list.filter(r => r.timestamp >= sevenDaysAgo);
    } else if (timeRange === '30') {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      list = list.filter(r => r.timestamp >= thirtyDaysAgo);
    }
    return list;
  }, [evaluatedResults, selectedLevel, timeRange]);

  // Kết quả mới nhất của mức đang chọn
  const latestResult = useMemo(() => {
    if (activeLevelResults.length === 0) return null;
    return activeLevelResults[activeLevelResults.length - 1];
  }, [activeLevelResults]);

  // Xử lý mở biên bản CAPA
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
    addToast('success', 'Đã lập biên bản CAPA', `Biên bản sự cố ${newCapa.code} đã được lưu trữ vào hồ sơ.`);
  };

  // Tự động đồng bộ sang Google Sheets khi lưu kết quả mới
  const triggerGoogleSheetsSync = async (resultsToSync: QCResult[]) => {
    if (!googleSheetsUrl || !autoSyncToSheets || resultsToSync.length === 0) return;
    try {
      const res = await syncResultsToGoogleSheets(googleSheetsUrl, resultsToSync, tests);
      if (res.success) {
        addToast('success', 'Đã lưu lên Google Drive', `Đã đồng bộ tự động ${res.count} kết quả vào file Google Sheets.`);
      } else {
        addToast('warning', 'Lưu ý Google Drive', `Đã lưu trên app nhưng chưa gửi được sang Sheet: ${res.error || 'Lỗi kết nối'}`);
      }
    } catch (e: any) {
      console.error('Lỗi tự động đồng bộ Google Drive:', e);
    }
  };

  // Thêm 1 kết quả QC đơn lẻ
  const handleAddSingleResult = () => {
    const valNum = parseFloat(singleValue);
    if (isNaN(valNum)) {
      addToast('error', 'Giá trị không hợp lệ', 'Vui lòng nhập giá trị đo hợp lệ (dạng số).');
      return;
    }

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

    // Tự động đồng bộ lên Google Sheets nếu đã bật
    triggerGoogleSheetsSync([newRes]);

    if (evaluation.status === 'violation') {
      addToast('error', `Cảnh báo vi phạm ${evaluation.rule}`, evaluation.description);
      if (confirm(`CẢNH BÁO VI PHẠM WESTGARD (${evaluation.rule}):\n${evaluation.description}\n\nBạn có muốn mở ngay Mẫu Biên Bản Khắc Phục Sự Cố CAPA chuẩn QĐ 2429 không?`)) {
        setSelectedResultForCapa(newRes);
        setIsCapaModalOpen(true);
      }
    } else if (evaluation.status === 'warning') {
      addToast('warning', 'Cảnh báo 1-2s', 'Kết quả vượt ±2SD. Cần theo dõi sát lần chạy tiếp theo.');
      setActiveTab('dashboard');
    } else {
      addToast('success', 'Nhập thành công', `Đã ghi nhận giá trị ${valNum} ${activeTest.unit} (Hợp lệ).`);
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

          const testHistory = rawResults.filter(r => r.testId === testId);
          const evaluation = evaluateWestgardResult(itemRes, testHistory, t.configs);

          itemRes.zScore = evaluation.zScore;
          itemRes.westgardRule = evaluation.rule;
          itemRes.westgardStatus = evaluation.status;

          if (evaluation.status === 'violation') violationCount++;
          newResultsToAdd.push(itemRes);
        }
      });
    });

    if (newResultsToAdd.length === 0) {
      addToast('warning', 'Chưa nhập dữ liệu', 'Vui lòng nhập ít nhất một kết quả đo trước khi bấm Lưu.');
      return;
    }

    setRawResults(prev => [...prev, ...newResultsToAdd]);
    setWorksheetValues({});

    // Tự động đồng bộ lên Google Sheets nếu đã bật
    triggerGoogleSheetsSync(newResultsToAdd);

    if (violationCount > 0) {
      addToast('error', 'Phát hiện lỗi Westgard', `Đã lưu ${newResultsToAdd.length} kết quả. Phát hiện ${violationCount} xét nghiệm vi phạm quy tắc Westgard cần lập CAPA.`);
    } else {
      addToast('success', 'Lưu mẻ thành công', `Đã lưu toàn bộ ${newResultsToAdd.length} kết quả nội kiểm đầu ngày. Tất cả đều ĐẠT CHUẨN.`);
    }
    setActiveTab('dashboard');
  };

  // Xóa kết quả QC
  const handleDeleteResult = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa kết quả nội kiểm này?')) {
      setRawResults(prev => prev.filter(r => r.id !== id));
      addToast('info', 'Đã xóa', 'Kết quả nội kiểm đã được gỡ bỏ khỏi nhật ký.');
    }
  };

  // Xuất Excel chuẩn Bộ Y tế
  const handleExportExcel = () => {
    if (activeLevelResults.length === 0) {
      addToast('warning', 'Không có dữ liệu', 'Không có dữ liệu để xuất Excel.');
      return;
    }

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
      'Người thực hiện': (r.technician || currentTechnician).replace(/^KTV\.?\s*/i, '')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NhatKyIQC_2429");
    
    const fileName = `So_Noi_Kiem_${activeTest.name}_${selectedLevel}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    addToast('success', 'Xuất file thành công', `Đã tải về tệp ${fileName}`);
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

  // Lọc danh mục CAPA
  const filteredCapas = useMemo(() => {
    if (!capaSearchTerm.trim()) return capas;
    const term = capaSearchTerm.toLowerCase();
    return capas.filter(c => 
      c.code.toLowerCase().includes(term) ||
      c.testName.toLowerCase().includes(term) ||
      c.violatedRule.toLowerCase().includes(term) ||
      c.technician.toLowerCase().includes(term) ||
      c.approver.toLowerCase().includes(term)
    );
  }, [capas, capaSearchTerm]);

  // Đếm số lượng sự cố vi phạm cần giải quyết
  const unresolvedCapaCount = useMemo(() => {
    return evaluatedResults.filter(r => r.westgardStatus === 'violation' && !r.capaId).length;
  }, [evaluatedResults]);

  return (
    <div className="flex min-h-screen bg-[#F5F8FC] text-[#0F1F3D] font-sans antialiased overflow-x-hidden">
      {/* 1. Modern Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        technician={currentTechnician}
        setTechnician={setCurrentTechnician}
        capaCount={unresolvedCapaCount}
        testCount={tests.length}
        analyzerCount={analyzers.length}
      />

      {/* 2. Main Layout Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Topbar */}
        <Topbar
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsSidebarOpen(true)}
          technician={currentTechnician}
          warningCount={unresolvedCapaCount}
          onOpenCapas={() => setActiveTab('capas')}
          onOpenImport={() => setIsImportModalOpen(true)}
          onOpenDriveSync={() => setIsDriveSyncModalOpen(true)}
          isDriveConnected={!!googleSheetsUrl && googleSheetsUrl.startsWith('https://script.google.com/')}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* TAB 1: GIÁM SÁT IQC (DASHBOARD) */}
          {activeTab === 'dashboard' && activeTest && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Context Filter Bar */}
              <HeaderFilterBar
                tests={tests}
                selectedTestId={selectedTestId}
                onSelectTest={setSelectedTestId}
                selectedLevel={selectedLevel}
                onSelectLevel={setSelectedLevel}
                selectedAnalyzer={selectedAnalyzerFilter}
                onSelectAnalyzer={setSelectedAnalyzerFilter}
                analyzers={analyzers}
                activeTest={activeTest}
                activeLevelConfig={activeLevelConfig}
                onOpenLotModal={() => setIsLotModalOpen(true)}
                timeRange={timeRange}
                onChangeTimeRange={setTimeRange}
              />

              {/* Hero Westgard Status Card */}
              <HeroStatusCard
                latestResult={latestResult}
                activeTest={activeTest}
                onOpenCapa={handleOpenCapa}
                onNewEntry={() => setActiveTab('entry')}
              />

              {/* 4 Balanced KPI Cards (with drag-and-drop support) */}
              <KpiCards
                test={activeTest}
                config={activeLevelConfig}
                totalSamples={activeLevelResults.length}
              />

              {/* Enhanced Levey-Jennings Chart */}
              <LeveyJenningsChart
                key={`${selectedTestId}-${selectedLevel}-${activeLevelResults.length}-${timeRange}`}
                data={activeLevelResults}
                allResultsForTest={evaluatedResults}
                config={activeLevelConfig}
                allConfigs={activeTest.configs}
                unit={activeTest.unit}
                title={`${activeTest.name} - Mức ${selectedLevel}`}
                onPointClick={handleOpenCapa}
              />

              {/* Six Sigma & Total Allowable Error Panel */}
              <SigmaAnalysis
                test={activeTest}
                config={activeLevelConfig}
                onOpenCapa={() => {
                  if (latestResult) handleOpenCapa(latestResult);
                  else setActiveTab('capas');
                }}
                onConsultAdvisor={() => setActiveTab('advisor')}
              />

              {/* IQC Logbook Table */}
              <LogbookTable
                results={activeLevelResults}
                activeTest={activeTest}
                onOpenCapa={handleOpenCapa}
                onDeleteResult={handleDeleteResult}
                onExportExcel={handleExportExcel}
                onOpenImport={() => setIsImportModalOpen(true)}
              />
            </div>
          )}

          {/* TAB 2: BẢNG KIỂM HÀNG LOẠT (WORKSHEET BATCH ENTRY) */}
          {activeTab === 'worksheet' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-[#0F1F3D] flex items-center gap-2">
                    <i className="fas fa-table text-blue-600"></i>
                    Bảng kiểm nội kiểm đầu ngày (Worksheet)
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Nhập nhanh kết quả kiểm soát chất lượng mẻ đầu ngày theo dạng bảng Excel ({filteredWorksheetTests.length} xét nghiệm)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {/* Lọc theo Máy phân tích */}
                  <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <i className="fas fa-filter text-slate-400 ml-1 text-xs"></i>
                    <select
                      value={selectedWorksheetAnalyzer}
                      onChange={e => setSelectedWorksheetAnalyzer(e.target.value)}
                      className="bg-transparent font-semibold text-xs outline-none cursor-pointer text-slate-700 pr-2"
                    >
                      <option value="all">Tất cả máy phân tích ({tests.length})</option>
                      {analyzers.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ngày thực hiện */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={worksheetDate}
                      onChange={e => setWorksheetDate(e.target.value)}
                      className="bg-slate-50 p-2 rounded-xl border border-slate-200 font-semibold text-xs text-slate-700 outline-none"
                    />
                  </div>

                  {/* Nạp từ Google Drive */}
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Nạp kết quả từ file Google Drive hoặc dán trực tiếp"
                  >
                    <i className="fas fa-cloud-upload-alt text-blue-600"></i>
                    <span>Nạp Google Drive</span>
                  </button>
                </div>
              </div>

              {/* Grid Form */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <th className="px-4 py-3">Xét nghiệm</th>
                      <th className="px-4 py-3">Đơn vị</th>
                      <th className="px-4 py-3">Máy phân tích</th>
                      <th className="px-4 py-3 text-center">Mức Thấp (Low)</th>
                      <th className="px-4 py-3 text-center">Mức Chuẩn (Normal)</th>
                      <th className="px-4 py-3 text-center">Mức Cao (High)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredWorksheetTests.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-bold text-[#0F1F3D]">{t.name}</td>
                        <td className="px-4 py-3 text-slate-400 font-medium">{t.unit}</td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px]">
                            {t.analyzerName || 'Máy Hóa sinh 1'}
                          </span>
                        </td>
                        {[QCLevel.LOW, QCLevel.NORMAL, QCLevel.HIGH].map(lvl => {
                          const cfg = t.configs[lvl];
                          const currentVal = worksheetValues[t.id]?.[lvl] || '';
                          const numVal = parseFloat(currentVal);
                          const isEntered = !isNaN(numVal);
                          const isOutOfRange = isEntered && cfg && cfg.sd > 0 && Math.abs(numVal - cfg.mean) > 2 * cfg.sd;

                          return (
                            <td key={lvl} className="px-4 py-2.5 text-center">
                              <input
                                type="number"
                                step="0.01"
                                placeholder={`Mean: ${cfg.mean}`}
                                value={currentVal}
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
                                className={`w-28 text-center p-2 rounded-xl text-xs font-bold border outline-none transition-all ${
                                  isOutOfRange
                                    ? 'bg-amber-50 border-amber-300 text-amber-900 focus:ring-1 focus:ring-amber-500'
                                    : isEntered
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:bg-white'
                                }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <i className="fas fa-keyboard text-slate-400"></i>
                  Mẹo: Dùng phím <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-[10px]">Tab</kbd> để nhảy nhanh giữa các ô nhập kết quả.
                </span>
                <button
                  type="button"
                  onClick={handleSaveWorksheet}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2"
                >
                  <i className="fas fa-save"></i>
                  <span>Lưu toàn bộ mẻ nội kiểm</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: NHẬP KẾT QUẢ ĐƠN LẺ */}
          {activeTab === 'entry' && activeTest && (
            <div className="max-w-xl mx-auto bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6 animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 bg-blue-50 border border-blue-200 text-blue-600 rounded-2xl flex items-center justify-center text-xl mx-auto shadow-2xs">
                  <i className="fas fa-plus"></i>
                </div>
                <h3 className="text-lg font-bold text-[#0F1F3D]">Nhập kết quả nội kiểm đơn lẻ</h3>
                <p className="text-xs text-slate-400 font-medium">Hệ thống sẽ đối chiếu tức thì theo thuật toán chuỗi Westgard</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Xét nghiệm</label>
                    <select
                      value={selectedTestId}
                      onChange={e => setSelectedTestId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      {tests.map(t => <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Mức QC</label>
                    <select
                      value={selectedLevel}
                      onChange={e => setSelectedLevel(e.target.value as QCLevel)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      {Object.values(QCLevel).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Ngày thực hiện</label>
                    <input
                      type="date"
                      value={singleDate}
                      onChange={e => setSingleDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Số Lô (Lot QC)</label>
                    <input
                      type="text"
                      disabled
                      value={activeLevelConfig.currentLot || 'LOT-2026'}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-500"
                    />
                  </div>
                </div>

                {/* Big Value Input Box */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Giá trị đo ({activeTest.unit}) • {activeTest.analyzerName || 'Máy Hóa sinh'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Mean: ${activeLevelConfig.mean}`}
                    value={singleValue}
                    onChange={e => setSingleValue(e.target.value)}
                    className="w-full bg-transparent text-center font-black text-4xl text-blue-600 outline-none p-1"
                  />
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Giới hạn an toàn ±2SD: [{(activeLevelConfig.mean - 2 * activeLevelConfig.sd).toFixed(2)} - {(activeLevelConfig.mean + 2 * activeLevelConfig.sd).toFixed(2)}]
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddSingleResult}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-check"></i>
                  <span>Lưu kết quả & Đánh giá Westgard</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SỔ TAY BIÊN BẢN CAPA (HỒ SƠ 2429) */}
          {activeTab === 'capas' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-[#0F1F3D] flex items-center gap-2">
                    <i className="fas fa-clipboard-check text-red-500"></i>
                    Sổ theo dõi sự cố & Biên bản CAPA
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Hồ sơ hành động khắc phục phòng ngừa theo Chương VIII - Tiêu chí QĐ 2429/QĐ-BYT & ISO 15189
                  </p>
                </div>

                <div className="w-full sm:w-64 relative">
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <input
                    type="text"
                    placeholder="Tìm biên bản theo mã, quy tắc, người thực hiện..."
                    value={capaSearchTerm}
                    onChange={e => setCapaSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium outline-none text-slate-700 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredCapas.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 italic">
                    Không tìm thấy biên bản CAPA nào. Khi có sự cố vi phạm Westgard, hãy nhấn vào điểm lỗi để lập biên bản.
                  </div>
                ) : (
                  filteredCapas.map(capa => (
                    <div
                      key={capa.id}
                      className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-xs transition-all"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <strong className="text-xs font-black text-[#0F1F3D]">{capa.code}</strong>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                            Westgard {capa.violatedRule}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(capa.timestamp).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium">
                          Xét nghiệm: <strong className="text-blue-700">{capa.testName}</strong> (Mức {capa.level} - Lô {capa.lotNumber} - {capa.analyzerName}) • Giá trị: <strong>{capa.value} {capa.unit}</strong> (Z = {capa.zScore > 0 ? '+' : ''}{capa.zScore} SD)
                        </p>
                        <p className="text-xs text-slate-500">
                          <strong>Biện pháp:</strong> {capa.immediateCorrection}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Người thực hiện: <strong>{capa.technician ? capa.technician.replace(/^KTV\.?\s*/i, '') : '---'}</strong> | Người duyệt: <strong>{capa.approver}</strong> | Chạy lại sau xử lý:{' '}
                          <strong className={capa.retestStatus === 'passed' ? 'text-emerald-700' : 'text-red-600'}>
                            {capa.retestValue} {capa.unit} ({capa.retestStatus === 'passed' ? 'ĐẠT' : 'CHƯA ĐẠT'})
                          </strong>
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
                            setSelectedResultForCapa(dummyRes);
                            setIsCapaModalOpen(true);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <i className="fas fa-print"></i>
                          <span>Xem & In A4</span>
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
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Header Action Bar */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[#0F1F3D] flex items-center gap-2">
                    <i className="fas fa-sliders-h text-blue-600"></i>
                    Cấu hình xét nghiệm & Máy phân tích
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Quản lý thông số Mean, SD, Số Lô QC, tự do kê loại máy xét nghiệm và chỉ số TEa%
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsDriveSyncModalOpen(true)}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    title="Cấu hình tự động lưu kết quả vào Google Drive / Sheets"
                  >
                    <i className="fab fa-google-drive text-emerald-600"></i>
                    <span>Liên kết Google Drive</span>
                    {googleSheetsUrl && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                  </button>

                  <button
                    type="button"
                    onClick={handleRestoreFullCatalog}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Khôi phục đầy đủ 20 chỉ số hóa sinh chuẩn"
                  >
                    <i className="fas fa-sync-alt text-slate-500"></i>
                    <span>Khôi phục 20 chỉ số chuẩn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingTestForModal(null);
                      setIsAddEditTestModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <i className="fas fa-plus"></i>
                    <span>THÊM XÉT NGHIỆM MỚI</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Tìm nhanh xét nghiệm theo tên, đơn vị hoặc máy phân tích..."
                  value={configSearchTerm}
                  onChange={e => setConfigSearchTerm(e.target.value)}
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-9 pr-8 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 transition-colors shadow-2xs"
                />
                {configSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setConfigSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>

              {/* Test Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredConfigTests.map(test => (
                  <div key={test.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-[#0F1F3D]">{test.name}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            TEa: {test.tea}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                          Đơn vị: <strong>{test.unit}</strong> • Máy: <strong className="text-indigo-600">{test.analyzerName || 'Máy Hóa sinh'}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTestForModal(test);
                            setIsAddEditTestModalOpen(true);
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 flex items-center justify-center cursor-pointer transition-colors"
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
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors border border-indigo-200"
                          title="Quản lý Lô chứng"
                        >
                          <i className="fas fa-boxes text-[11px]"></i>
                          <span>Lô QC</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTest(test.id, test.name)}
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-500 hover:text-white text-red-500 flex items-center justify-center cursor-pointer transition-colors"
                          title="Xóa xét nghiệm"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {Object.values(QCLevel).map(lvl => {
                        const cfg = test.configs[lvl];
                        return (
                          <div key={lvl} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
                            <span className="font-semibold text-slate-600">
                              Mức {lvl} ({cfg.currentLot || 'LOT-2026'})
                            </span>
                            <span className="font-bold text-[#0F1F3D]">
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
            <div className="h-[680px] md:h-[750px] animate-in fade-in duration-200">
              <RegulatoryAdvisor
                currentTest={activeTest}
                latestViolation={latestResult?.westgardStatus === 'violation' ? latestResult : undefined}
              />
            </div>
          )}
        </main>
      </div>

      {/* 3. Global Modals */}
      {isCapaModalOpen && selectedResultForCapa && (
        <CapaReportModal
          isOpen={isCapaModalOpen}
          onClose={() => setIsCapaModalOpen(false)}
          result={selectedResultForCapa}
          test={activeTest}
          config={activeLevelConfig}
          onSaveCapa={handleSaveCapa}
        />
      )}

      {isLotModalOpen && (
        <LotManagementModal
          isOpen={isLotModalOpen}
          onClose={() => setIsLotModalOpen(false)}
          test={activeTest}
          level={selectedLevel}
          onSaveConfig={(updatedTest) => {
            setTests(prev => prev.map(t => t.id === updatedTest.id ? updatedTest : t));
            addToast('success', 'Đã cập nhật Lô QC', `Thông tin Lô của xét nghiệm ${updatedTest.name} đã được lưu.`);
          }}
        />
      )}

      {isAddEditTestModalOpen && (
        <AddEditTestModal
          isOpen={isAddEditTestModalOpen}
          onClose={() => setIsAddEditTestModalOpen(false)}
          initialTest={editingTestForModal}
          analyzers={analyzers}
          onSave={handleSaveTest}
          onAddNewAnalyzer={handleAddAnalyzer}
        />
      )}

      {isImportModalOpen && (
        <ImportDataModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          tests={tests}
          currentTechnician={currentTechnician}
          onImportSuccess={handleImportSuccess}
        />
      )}

      {isDriveSyncModalOpen && (
        <GoogleDriveSyncModal
          isOpen={isDriveSyncModalOpen}
          onClose={() => setIsDriveSyncModalOpen(false)}
          webhookUrl={googleSheetsUrl}
          onSaveWebhookUrl={setGoogleSheetsUrl}
          autoSync={autoSyncToSheets}
          onToggleAutoSync={setAutoSyncToSheets}
          tests={tests}
          results={rawResults}
          onAddToast={addToast}
        />
      )}

      {/* 4. Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
