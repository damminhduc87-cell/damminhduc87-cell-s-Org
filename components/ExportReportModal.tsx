import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { LabTest, QCLevel, QCResult, QCConfig } from '../types';
import { evaluateAllResults, getWestgardStyle } from '../services/westgardEngine';
import { getStandardLotForTest } from '../constants';

export interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tests: LabTest[];
  activeTest: LabTest;
  selectedLevel: QCLevel;
  rawResults: QCResult[];
  analyzers: string[];
  currentTechnician: string;
  initialStartDate?: string;
  initialEndDate?: string;
  addToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
}

// Chuyển đổi YYYY-MM-DD sang định dạng dd/mm/yyyy
export function formatDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Chuyển đổi YYYY-MM-DD sang định dạng văn bản: "ngày ... tháng ... năm ..."
export function formatFullDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  tests,
  activeTest,
  selectedLevel,
  rawResults,
  analyzers,
  currentTechnician,
  initialStartDate = '',
  initialEndDate = '',
  addToast
}) => {
  // 1. Quản lý khoảng thời gian xuất báo cáo
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);

  // 2. Bộ lọc phạm vi dữ liệu
  const [testFilter, setTestFilter] = useState<string>(activeTest?.id || 'all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [analyzerFilter, setAnalyzerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 3. Thông tin người lập & phê duyệt
  const [technicianName, setTechnicianName] = useState<string>(
    currentTechnician ? currentTechnician.replace(/^KTV\.?\s*/i, '') : 'Đàm Minh Đức'
  );
  const [approverTitle, setApproverTitle] = useState<string>('Trưởng Khoa');
  const [approverName, setApproverName] = useState<string>('');

  if (!isOpen) return null;

  // Xử lý các phím tắt chọn khoảng thời gian nhanh (Quick Presets)
  const handleQuickPreset = (preset: string) => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = toYMD(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setStartDate(toYMD(d));
      setEndDate(toYMD(today));
    } else if (preset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setStartDate(toYMD(d));
      setEndDate(toYMD(today));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(lastDay));
    } else if (preset === 'lastMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(lastDay));
    } else if (preset === 'phase1') {
      // Giai đoạn 1: Tháng 5 & Tháng 6 năm 2026
      setStartDate('2026-05-01');
      setEndDate('2026-06-30');
    } else if (preset === 'phase2') {
      // Giai đoạn 2: Tháng 7 & Tháng 8 năm 2026
      setStartDate('2026-07-01');
      setEndDate('2026-08-31');
    }
  };

  // Tính toán dữ liệu khớp bộ lọc thời gian thực
  const evaluatedItems = useMemo(() => {
    const list: Array<{
      id: string;
      timestamp: number;
      dateStr: string;
      timeStr: string;
      testId: string;
      testName: string;
      unit: string;
      analyzerName: string;
      level: QCLevel;
      lotNumber: string;
      value: number;
      meanTarget: number;
      sdTarget: number;
      zScore: number;
      westgardRule: string;
      westgardStatus: string;
      capaId: string;
      technician: string;
    }> = [];

    const targetTests = testFilter === 'all' ? tests : tests.filter(t => t.id === testFilter);

    targetTests.forEach(test => {
      const testRaw = rawResults.filter(r => r.testId === test.id);
      const evaluated = evaluateAllResults(testRaw, test.configs);

      evaluated.forEach(res => {
        const d = new Date(res.timestamp);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;

        // Lọc theo khoảng ngày
        if (startDate && dateStr < startDate) return;
        if (endDate && dateStr > endDate) return;

        // Lọc theo mức QC
        if (levelFilter !== 'all' && res.level !== levelFilter) return;

        // Lọc theo trạng thái Westgard
        if (statusFilter !== 'all' && res.westgardStatus !== statusFilter) return;

        // Lọc theo máy phân tích
        if (analyzerFilter !== 'all' && (test.analyzerName || 'Máy Hóa sinh') !== analyzerFilter) return;

        const cfg = test.configs?.[res.level] || { mean: 0, sd: 0, bias: 0, currentLot: '---' };

        list.push({
          id: res.id,
          timestamp: res.timestamp,
          dateStr: `${day}/${m}/${y}`,
          timeStr: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          testId: test.id,
          testName: test.name,
          unit: test.unit,
          analyzerName: test.analyzerName || 'Máy Hóa sinh',
          level: res.level,
          lotNumber: (res.lotNumber && res.lotNumber !== '---' && res.lotNumber !== 'LOT-DEFAULT' && res.lotNumber !== 'LOT-2026')
            ? res.lotNumber
            : (cfg.currentLot && cfg.currentLot !== '---' && cfg.currentLot !== 'LOT-DEFAULT' && cfg.currentLot !== 'LOT-2026'
                ? cfg.currentLot
                : getStandardLotForTest(test.id, res.level)),
          value: res.value,
          meanTarget: cfg.mean,
          sdTarget: cfg.sd,
          zScore: res.zScore || 0,
          westgardRule: res.westgardRule && res.westgardRule !== 'none' ? res.westgardRule : 'Hợp lệ',
          westgardStatus: res.westgardStatus || 'passed',
          capaId: res.capaId || '',
          technician: res.technician && !res.technician.toLowerCase().includes('google')
            ? res.technician.replace(/^KTV\.?\s*/i, '')
            : technicianName
        });
      });
    });

    // Sắp xếp tăng dần theo thời gian (từ cũ đến mới) để tạo sổ nhật ký liền mạch
    return list.sort((a, b) => a.timestamp - b.timestamp);
  }, [tests, rawResults, testFilter, levelFilter, statusFilter, analyzerFilter, startDate, endDate, technicianName]);

  // Các chỉ số thống kê tổng hợp của dải ngày đã chọn
  const totalCount = evaluatedItems.length;
  const passedCount = evaluatedItems.filter(i => i.westgardStatus === 'passed').length;
  const warningCount = evaluatedItems.filter(i => i.westgardStatus === 'warning').length;
  const violationCount = evaluatedItems.filter(i => i.westgardStatus === 'violation').length;
  const passRate = totalCount > 0 ? ((passedCount / totalCount) * 100).toFixed(1) : '0';

  // Văn bản hiển thị khoảng ngày (Ngày... tháng... năm... đến ngày... tháng... năm...)
  const displayPeriodText = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) {
        return `trong ngày ${formatDateVN(startDate)} (${formatFullDateVN(startDate)})`;
      }
      return `từ ${formatFullDateVN(startDate)} đến ${formatFullDateVN(endDate)}`;
    }
    if (startDate) {
      return `từ ${formatFullDateVN(startDate)} đến nay`;
    }
    if (endDate) {
      return `đến ${formatFullDateVN(endDate)}`;
    }
    return 'toàn bộ thời gian theo dõi';
  }, [startDate, endDate]);

  const displayShortPeriodText = useMemo(() => {
    if (startDate && endDate) {
      return `Từ ${formatDateVN(startDate)} đến ${formatDateVN(endDate)}`;
    }
    if (startDate) return `Từ ${formatDateVN(startDate)} đến nay`;
    if (endDate) return `Đến ${formatDateVN(endDate)}`;
    return 'Toàn bộ thời gian';
  }, [startDate, endDate]);

  // Kiểm tra tính hợp lệ của ngày
  const isDateRangeInvalid = Boolean(startDate && endDate && startDate > endDate);

  // 1. XỬ LÝ XUẤT FILE EXCEL (.xlsx) CHUẨN BỘ Y TẾ QĐ 2429
  const handleExportExcel = () => {
    if (isDateRangeInvalid) {
      addToast('error', 'Khoảng ngày không hợp lệ', 'Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    if (totalCount === 0) {
      addToast('warning', 'Không có dữ liệu', 'Không tìm thấy kết quả nội kiểm nào trong khoảng thời gian đã chọn.');
      return;
    }

    const exportRows: any[][] = [
      ['BỆNH VIỆN Y HỌC CỔ TRUYỀN', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['KHOA XÉT NGHIỆM & CHẨN ĐOÁN HÌNH ẢNH', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['BÁO CÁO NHẬT KÝ KIỂM SOÁT CHẤT LƯỢNG NỘI KIỂM (IQC LOGBOOK)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Tiêu chuẩn áp dụng: Quyết định 2429/QĐ-BYT & Tiêu chuẩn ISO 15189', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [`Khoảng thời gian: ${displayPeriodText.toUpperCase()}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [
        `Phạm vi xét nghiệm: ${testFilter === 'all' ? 'Tất cả các xét nghiệm' : activeTest?.name} | Mức QC: ${
          levelFilter === 'all' ? 'Tất cả các mức' : levelFilter
        }`,
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
      ],
      [
        `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')} | Người lập: ${technicianName} | Phê duyệt: ${approverTitle} ${approverName}`,
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
      ],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [
        'STT',
        'Ngày giờ đo',
        'Xét nghiệm',
        'Máy phân tích',
        'Mức QC',
        'Số Lô (Lot)',
        'Giá trị đo',
        'Đơn vị',
        'Mean đích',
        'SD đích',
        'SDI (Z-Score)',
        'Quy tắc Westgard',
        'Trạng thái',
        'Biên bản CAPA',
        'Kỹ thuật viên',
        'Người phê duyệt'
      ]
    ];

    evaluatedItems.forEach((item, idx) => {
      exportRows.push([
        idx + 1,
        `${item.dateStr} ${item.timeStr}`,
        item.testName,
        item.analyzerName,
        item.level === QCLevel.LOW ? 'Mức Thấp (Low)' : item.level === QCLevel.HIGH ? 'Mức Cao (High)' : 'Mức Chuẩn (Normal)',
        item.lotNumber,
        item.value,
        item.unit,
        item.meanTarget,
        item.sdTarget,
        item.zScore,
        item.westgardRule,
        item.westgardStatus === 'violation' ? 'Vi phạm' : item.westgardStatus === 'warning' ? 'Cảnh báo' : 'Hợp lệ',
        item.capaId || '---',
        item.technician,
        approverName ? `${approverTitle} ${approverName}` : approverTitle
      ]);
    });

    // Thống kê tổng kết
    exportRows.push([]);
    exportRows.push(['TỔNG HỢP KẾT QUẢ THEO DÕI NỘI KIỂM:']);
    exportRows.push(['1. Tổng số lần chạy kiểm tra:', `${totalCount} lần đo`]);
    exportRows.push(['2. Số lần Đạt chuẩn (Passed):', `${passedCount} lần`, `Tỷ lệ: ${passRate}%`]);
    exportRows.push(['3. Số lần Cảnh báo (Warning 1-2s):', `${warningCount} lần`, `Tỷ lệ: ${totalCount ? ((warningCount / totalCount) * 100).toFixed(1) : 0}%`]);
    exportRows.push(['4. Số lần Vi phạm Westgard:', `${violationCount} lần`, `Tỷ lệ: ${totalCount ? ((violationCount / totalCount) * 100).toFixed(1) : 0}%`]);
    exportRows.push([]);
    exportRows.push(['', '', '', '', '', 'NGƯỜI LẬP BÁO CÁO', '', '', '', '', '', '', 'TRƯỞNG KHOA']);
    exportRows.push(['', '', '', '', '', '(Ký và ghi rõ họ tên)', '', '', '', '', '', '', '(Ký duyệt và đóng dấu)']);
    exportRows.push([]);
    exportRows.push([]);
    exportRows.push(['', '', '', '', '', technicianName, '', '', '', '', '', '', approverName || '']);

    const ws = XLSX.utils.aoa_to_sheet(exportRows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 19 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nhat_Ky_IQC_2429');

    // TẠO SHEET 2: BẢNG THỐNG KÊ MEAN, SD, CV% CHO CÁC XÉT NGHIỆM TRONG KHOẢNG NGÀY ĐÃ CHỌN
    const statsRows: any[][] = [
      ['BỆNH VIỆN Y HỌC CỔ TRUYỀN', '', '', '', '', '', '', ''],
      ['KHOA XÉT NGHIỆM & CHẨN ĐOÁN HÌNH ẢNH', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['BẢNG TỔNG HỢP CHỈ SỐ THỐNG KÊ NỘI KIỂM (MEAN, SD, CV%)', '', '', '', '', '', '', ''],
      [`Khoảng thời gian: ${displayPeriodText.toUpperCase()}`, '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['STT', 'Xét nghiệm', 'Mức QC', 'Số mẫu (N)', 'Mean thực tế', 'SD thực tế', 'CV% thực tế', 'Đơn vị']
    ];

    // Nhóm theo từng test và level để tính Mean, SD, CV%
    const groups = new Map<string, { testName: string; level: string; unit: string; values: number[] }>();
    evaluatedItems.forEach(item => {
      const key = `${item.testId}__${item.level}`;
      if (!groups.has(key)) {
        groups.set(key, {
          testName: item.testName,
          level: item.level === QCLevel.LOW ? 'Thấp (Low)' : item.level === QCLevel.HIGH ? 'Cao (High)' : 'Chuẩn (Normal)',
          unit: item.unit,
          values: []
        });
      }
      groups.get(key)!.values.push(item.value);
    });

    let statIdx = 1;
    groups.forEach(g => {
      const n = g.values.length;
      if (n > 0) {
        const mean = g.values.reduce((acc, v) => acc + v, 0) / n;
        let sd = 0;
        if (n > 1) {
          const sumSq = g.values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
          sd = Math.sqrt(sumSq / (n - 1));
        }
        const cv = mean > 0 ? (sd / mean) * 100 : 0;

        statsRows.push([
          statIdx++,
          g.testName,
          g.level,
          n,
          Number(mean.toFixed(2)),
          Number(sd.toFixed(2)),
          Number(cv.toFixed(2)) + '%',
          g.unit
        ]);
      }
    });

    const wsStats = XLSX.utils.aoa_to_sheet(statsRows);
    wsStats['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(wb, wsStats, 'Thong_Ke_Mean_SD_CV');

    // Tạo tên tệp rõ ràng theo ngày tháng
    const safeStart = startDate ? startDate.replace(/-/g, '') : 'Dau';
    const safeEnd = endDate ? endDate.replace(/-/g, '') : 'Nay';
    const fileName = `Bao_Cao_Nhat_Ky_IQC_${safeStart}_den_${safeEnd}.xlsx`;

    XLSX.writeFile(wb, fileName);
    addToast('success', 'Xuất Excel thành công', `Đã tải về tệp ${fileName} (${totalCount} kết quả)`);
  };

  // 2. XỬ LÝ IN BÁO CÁO A4 NGANG (PRINT PREVIEW / PDF)
  const handlePrintReport = () => {
    if (isDateRangeInvalid) {
      addToast('error', 'Khoảng ngày không hợp lệ', 'Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    if (totalCount === 0) {
      addToast('warning', 'Không có dữ liệu', 'Không có dữ liệu trong khoảng thời gian đã chọn để in.');
      return;
    }

    const printableHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Báo Cáo Nhật Ký Nội Kiểm - Bệnh Viện Y Học Cổ Truyền</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm 15mm 12mm 15mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10.5pt;
      line-height: 1.35;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .header-table td {
      vertical-align: top;
      border: none;
      padding: 0;
    }
    .inst-title {
      font-size: 10.5pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .dept-title {
      font-size: 10pt;
      font-weight: bold;
      color: #1e3a8a;
    }
    .motto {
      text-align: center;
      font-size: 11pt;
      font-weight: bold;
    }
    .motto-sub {
      text-align: center;
      font-size: 10pt;
      font-style: italic;
    }
    .report-title {
      text-align: center;
      font-size: 15pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 10px;
      margin-bottom: 3px;
      color: #0f172a;
    }
    .report-standard {
      text-align: center;
      font-size: 9.5pt;
      font-style: italic;
      color: #475569;
      margin-bottom: 5px;
    }
    .report-period {
      text-align: center;
      font-size: 11.5pt;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 15px;
    }
    .summary-card {
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #2563eb;
      padding: 6px 12px;
      margin-bottom: 12px;
      font-size: 10pt;
      display: flex;
      justify-content: space-between;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-bottom: 15px;
    }
    .data-table th, .data-table td {
      border: 1px solid #334155;
      padding: 5px 6px;
      text-align: center;
    }
    .data-table th {
      background-color: #f1f5f9;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 8.5pt;
    }
    .data-table tr:nth-child(even) {
      background-color: #fafafa;
    }
    .status-passed { color: #166534; font-weight: bold; }
    .status-warning { color: #b45309; font-weight: bold; }
    .status-violation { color: #b91c1c; font-weight: bold; background-color: #fee2e2; }
    .signature-grid {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      page-break-inside: avoid;
    }
    .signature-grid td {
      width: 50%;
      text-align: center;
      vertical-align: top;
      border: none;
      padding: 0;
    }
    .sig-space { height: 60px; }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="width: 50%;">
        <div class="inst-title">BỆNH VIỆN Y HỌC CỔ TRUYỀN</div>
        <div class="dept-title">KHOA XÉT NGHIỆM & CHẨN ĐOÁN HÌNH ẢNH</div>
      </td>
      <td style="width: 50%;">
        <div class="motto">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div class="motto-sub">Độc lập - Tự do - Hạnh phúc</div>
      </td>
    </tr>
  </table>

  <div class="report-title">BÁO CÁO NHẬT KÝ KIỂM SOÁT CHẤT LƯỢNG NỘI KIỂM (IQC LOGBOOK)</div>
  <div class="report-standard">Tiêu chuẩn ban hành theo Quyết định số 2429/QĐ-BYT & Tiêu chuẩn ISO 15189</div>
  <div class="report-period">KHOẢNG THỜI GIAN: ${displayPeriodText.toUpperCase()}</div>

  <div class="summary-card">
    <div><strong>Tổng số lần đo kiểm:</strong> ${totalCount} lần</div>
    <div><strong>Hợp lệ (Passed):</strong> ${passedCount} (${passRate}%)</div>
    <div><strong>Cảnh báo (1-2s):</strong> ${warningCount}</div>
    <div><strong>Vi phạm (Cần CAPA):</strong> ${violationCount}</div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 30px;">STT</th>
        <th style="width: 100px;">Ngày giờ</th>
        <th>Xét nghiệm</th>
        <th>Mức QC</th>
        <th>Máy phân tích</th>
        <th>Số Lô (Lot)</th>
        <th>Giá trị đo</th>
        <th>Mean đích</th>
        <th>SD đích</th>
        <th>Z-Score</th>
        <th>Quy tắc Westgard</th>
        <th>Trạng thái</th>
        <th>KTV thực hiện</th>
      </tr>
    </thead>
    <tbody>
      ${evaluatedItems.map((item, idx) => `
        <tr class="${item.westgardStatus === 'violation' ? 'status-violation' : ''}">
          <td>${idx + 1}</td>
          <td>${item.dateStr}<br><span style="font-size: 8pt; color: #64748b;">${item.timeStr}</span></td>
          <td><strong>${item.testName}</strong></td>
          <td>${item.level === QCLevel.LOW ? 'Thấp (L)' : item.level === QCLevel.HIGH ? 'Cao (H)' : 'Chuẩn (N)'}</td>
          <td>${item.analyzerName}</td>
          <td>${item.lotNumber}</td>
          <td><strong>${item.value}</strong> <span style="font-size: 8pt;">${item.unit}</span></td>
          <td>${item.meanTarget}</td>
          <td>${item.sdTarget}</td>
          <td style="font-weight: bold; color: ${item.zScore > 2 || item.zScore < -2 ? '#b91c1c' : '#0f172a'};">
            ${item.zScore > 0 ? '+' : ''}${item.zScore} SD
          </td>
          <td>${item.westgardRule}</td>
          <td class="status-${item.westgardStatus}">
            ${item.westgardStatus === 'violation' ? 'Vi phạm' : item.westgardStatus === 'warning' ? 'Cảnh báo' : 'Hợp lệ'}
          </td>
          <td>${item.technician}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <table class="signature-grid">
    <tr>
      <td>
        <strong>NGƯỜI LẬP BÁO CÁO</strong><br>
        <span style="font-size: 9.5pt; font-style: italic;">(Ký và ghi rõ họ tên)</span>
        <div class="sig-space"></div>
        <strong>${technicianName}</strong>
      </td>
      <td>
        <span style="font-size: 9.5pt; font-style: italic;">Ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</span><br>
        <strong>${approverTitle.toUpperCase()}</strong><br>
        <span style="font-size: 9.5pt; font-style: italic;">(Ký duyệt và đóng dấu)</span>
        <div class="sig-space"></div>
        <strong>${approverName || ''}</strong>
      </td>
    </tr>
  </table>
</body>
</html>`;

    let printIframe = document.getElementById('iqc_report_print_frame') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'iqc_report_print_frame';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);
    }

    const doc = printIframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printableHtml);
      doc.close();
      setTimeout(() => {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
      }, 350);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl border border-slate-100 p-5 sm:p-7 max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg border border-emerald-100 shadow-2xs">
              <i className="fas fa-file-invoice"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Quyết định 2429/QĐ-BYT
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  ISO 15189
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#0F1F3D] mt-0.5">
                Xuất Báo Cáo Nhật Ký Nội Kiểm (IQC Logbook)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-5">
          {/* MỤC 1: CHỌN KHOẢNG NGÀY XUẤT BÁO CÁO (YÊU CẦU TRỌNG TÂM CỦA NGƯỜI DÙNG) */}
          <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <i className="fas fa-calendar-alt text-emerald-600"></i>
                <span>1. Chọn khoảng ngày xuất báo cáo</span>
              </label>
              <span className="text-[11px] font-medium text-emerald-700 italic">
                (Từ ngày ... tháng ... năm ... đến ngày ... tháng ... năm ...)
              </span>
            </div>

            {/* Hai ô chọn ngày Từ ngày ... Đến ngày ... */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Từ ngày */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 block">
                  Từ ngày (Bắt đầu):
                </span>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none transition-colors shadow-2xs"
                  />
                </div>
                {startDate ? (
                  <span className="text-[10px] text-emerald-700 font-semibold block">
                    ✓ {formatFullDateVN(startDate)}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic block">
                    Chưa chọn (tính từ ngày đầu tiên)
                  </span>
                )}
              </div>

              {/* Đến ngày */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 block">
                  Đến ngày (Kết thúc):
                </span>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none transition-colors shadow-2xs"
                  />
                </div>
                {endDate ? (
                  <span className="text-[10px] text-emerald-700 font-semibold block">
                    ✓ {formatFullDateVN(endDate)}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic block">
                    Chưa chọn (tính đến thời điểm hiện tại)
                  </span>
                )}
              </div>
            </div>

            {/* Cảnh báo nếu ngày bắt đầu > ngày kết thúc */}
            {isDateRangeInvalid && (
              <div className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <i className="fas fa-exclamation-triangle"></i>
                <span>Lỗi: Ngày bắt đầu không được lớn hơn ngày kết thúc!</span>
              </div>
            )}

            {/* Dải nút bấm chọn nhanh thời gian (Quick Date Presets) */}
            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Chọn nhanh khoảng thời gian:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickPreset('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-colors cursor-pointer ${
                    !startDate && !endDate
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Tất cả thời gian
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('phase1')}
                  className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                  title="Giai đoạn 1: 01/05/2026 đến 30/06/2026 (42 ngày)"
                >
                  Giai đoạn 1 (T5-T6/2026)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('phase2')}
                  className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                  title="Giai đoạn 2: 01/07/2026 đến 31/08/2026 (44 ngày)"
                >
                  Giai đoạn 2 (T7-T8/2026)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('30days')}
                  className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                >
                  30 ngày gần nhất
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('7days')}
                  className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                >
                  7 ngày gần nhất
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('thisMonth')}
                  className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                >
                  Tháng này
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('today')}
                  className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                >
                  Hôm nay
                </button>
              </div>
            </div>
          </div>

          {/* MỤC 2: PHẠM VI XÉT NGHIỆM & MỨC QC */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Lọc Xét nghiệm */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Xét nghiệm ({tests.length})
              </label>
              <div className="relative">
                <select
                  value={testFilter}
                  onChange={e => setTestFilter(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer pr-8"
                >
                  <option value="all">Tất cả xét nghiệm ({tests.length})</option>
                  {tests.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.unit})
                    </option>
                  ))}
                </select>
                <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
              </div>
            </div>

            {/* Lọc Mức QC */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Mức nồng độ QC
              </label>
              <div className="relative">
                <select
                  value={levelFilter}
                  onChange={e => setLevelFilter(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer pr-8"
                >
                  <option value="all">Tất cả các mức QC</option>
                  <option value={QCLevel.NORMAL}>Mức Chuẩn (Normal / Level 1)</option>
                  <option value={QCLevel.HIGH}>Mức Cao (High / Level 2)</option>
                  <option value={QCLevel.LOW}>Mức Thấp (Low / Level 3)</option>
                </select>
                <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
              </div>
            </div>

            {/* Lọc Trạng thái */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Trạng thái Westgard
              </label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer pr-8"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="passed">Chỉ lấy Đạt chuẩn (Passed)</option>
                  <option value="warning">Chỉ lấy Cảnh báo (1-2s)</option>
                  <option value="violation">Chỉ lấy Vi phạm (Cần CAPA)</option>
                </select>
                <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
              </div>
            </div>
          </div>

          {/* MỤC 3: THÔNG TIN KHOA PHÒNG & NGƯỜI DUYỆT */}
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Thông tin đơn vị & Người ký duyệt (Theo mẫu Bệnh viện Y học Cổ truyền)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-600 block mb-1">
                  Đơn vị báo cáo:
                </span>
                <input
                  type="text"
                  disabled
                  value="BỆNH VIỆN Y HỌC CỔ TRUYỀN"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-600 block mb-1">
                  Người lập sổ (KTV):
                </span>
                <input
                  type="text"
                  value={technicianName}
                  onChange={e => setTechnicianName(e.target.value)}
                  placeholder="KTV thực hiện..."
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
                />
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-600 block mb-1">
                  Người phê duyệt (Trưởng khoa):
                </span>
                <input
                  type="text"
                  value={approverName}
                  onChange={e => setApproverName(e.target.value)}
                  placeholder="Để trống để ký tay hoặc điền tên..."
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* MỤC 4: THẺ XEM TRƯỚC SỐ LIỆU TỔNG HỢP CỦA KHOẢNG NGÀY ĐÃ CHỌN */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#0F1F3D]">
                Kết quả thống kê trong khoảng thời gian đã chọn:
              </span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200 text-[11px]">
                {displayShortPeriodText}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Tổng số bản ghi
                </span>
                <span className="text-lg font-black text-slate-900">{totalCount}</span>
              </div>
              <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                  Đạt chuẩn (Passed)
                </span>
                <span className="text-lg font-black text-emerald-700">{passedCount}</span>
              </div>
              <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-100 text-center">
                <span className="text-[10px] uppercase font-bold text-amber-600 block">
                  Cảnh báo (1-2s)
                </span>
                <span className="text-lg font-black text-amber-700">{warningCount}</span>
              </div>
              <div className="bg-red-50/70 p-2.5 rounded-xl border border-red-100 text-center">
                <span className="text-[10px] uppercase font-bold text-red-600 block">
                  Vi phạm Westgard
                </span>
                <span className="text-lg font-black text-red-700">{violationCount}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 pt-1 italic text-center">
              * File Excel xuất ra sẽ bao gồm Sheet 1 (Sổ nhật ký chi tiết từng lần chạy) và Sheet 2 (Bảng tổng hợp Mean, SD, CV%).
            </div>
          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Nút In báo cáo / Xem trước A4 */}
            <button
              type="button"
              onClick={handlePrintReport}
              disabled={totalCount === 0 || isDateRangeInvalid}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Xem trước và in ấn ra giấy A4 khổ ngang"
            >
              <i className="fas fa-print"></i>
              <span>In sổ / Xem trước A4</span>
            </button>

            {/* Nút Xuất Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={totalCount === 0 || isDateRangeInvalid}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Tải tệp Excel .xlsx chuẩn QĐ 2429 Bộ Y tế"
            >
              <i className="fas fa-file-excel"></i>
              <span>Xuất File Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
