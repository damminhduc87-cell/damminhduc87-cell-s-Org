import React, { useState, useEffect } from 'react';
import { CAPARecord, QCResult, LabTest, QCLevel, RootCauseChecklist } from '../types';
import { askAdvisorApi } from '../services/advisorClient';

interface CapaReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: QCResult;
  test: LabTest;
  onSaveCapa: (capa: CAPARecord) => void;
  existingCapa?: CAPARecord | null;
}

export const CapaReportModal: React.FC<CapaReportModalProps> = ({
  isOpen,
  onClose,
  result,
  test,
  onSaveCapa,
  existingCapa
}) => {
  const config = test.configs[result.level];
  const zScore = config?.sd > 0 ? Number(((result.value - config.mean) / config.sd).toFixed(2)) : 0;
  
  // Default values
  const [code, setCode] = useState(() => {
    if (existingCapa?.code) return existingCapa.code;
    const dateStr = new Date(result.timestamp).toISOString().slice(0, 10).replace(/-/g, '');
    return `CAPA-${dateStr}-${test.id.toUpperCase().slice(0, 4)}-${Math.floor(100 + Math.random() * 900)}`;
  });

  const [analyzerName, setAnalyzerName] = useState(test.analyzerName || 'Máy sinh hóa / miễn dịch tự động');
  const [lotNumber, setLotNumber] = useState(result.lotNumber || config?.currentLot || 'LOT-2026-A1');
  const [technician, setTechnician] = useState(result.technician || 'KTV. Nguyễn Văn A');
  const [approver, setApprover] = useState(result.approver || 'BS. CKII Trưởng Khoa');
  
  const [incidentDescription, setIncidentDescription] = useState(
    existingCapa?.incidentDescription || 
    `Kết quả nội kiểm ngày ${new Date(result.timestamp).toLocaleString('vi-VN')} đạt ${result.value} ${test.unit} (Mean đích: ${config.mean}, SD: ${config.sd}), Z-score = ${zScore > 0 ? '+' : ''}${zScore} SD. Vi phạm quy tắc Westgard: ${result.westgardRule || '1-3s'}.`
  );

  const [rootCauses, setRootCauses] = useState<RootCauseChecklist>(
    existingCapa?.rootCauses || {
      man: 'Đã kiểm tra kỹ thuật pha mẫu và vị trí đặt cup mẫu.',
      machine: result.westgardRule === 'R-4s' ? 'Nghi ngờ bọt khí kim hút hoặc buồng phản ứng không đồng đều.' : 'Kiểm tra buồng ủ nhiệt độ 37°C và kim hút.',
      material: result.westgardRule === '2-2s' || result.westgardRule === '10-x' ? 'Thuốc thử hoặc dung dịch chuẩn (Calibrator) có dấu hiệu thoái hóa/trôi dạt.' : 'Lô thuốc thử và mẫu chứng còn hạn dùng.',
      method: 'Cần kiểm tra lại đường cong chuẩn (Calibration) gần nhất.',
      milieu: 'Nhiệt độ phòng xét nghiệm 24°C, độ ẩm 60% ổn định.'
    }
  );

  const [immediateCorrection, setImmediateCorrection] = useState(
    existingCapa?.immediateCorrection || 'Tạm dừng trả kết quả bệnh nhân cho chỉ số này. Xả bọt khí đường ống, hiệu chuẩn lại máy (Calib) và chạy lại mẫu chứng mới.'
  );

  const [preventiveAction, setPreventiveAction] = useState(
    existingCapa?.preventiveAction || 'Tăng cường giám sát tần suất chạy QC 2 lần/ngày. Thực hiện bảo dưỡng định kỳ hệ thống quang học vào cuối tuần.'
  );

  const [retestValue, setRetestValue] = useState<string>(
    existingCapa?.retestValue !== undefined ? String(existingCapa.retestValue) : String(config.mean)
  );

  const [patientSampleHoldStatus, setPatientSampleHoldStatus] = useState<'held' | 'released_after_capa' | 'no_impact'>(
    existingCapa?.patientSampleHoldStatus || 'released_after_capa'
  );

  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [aiSuggestionNotice, setAiSuggestionNotice] = useState('');

  if (!isOpen) return null;

  const retestValNum = parseFloat(retestValue);
  const retestZ = !isNaN(retestValNum) && config.sd > 0 ? Number(((retestValNum - config.mean) / config.sd).toFixed(2)) : 0;
  const retestPassed = !isNaN(retestValNum) && Math.abs(retestZ) < 2.0;

  // Gọi AI tư vấn phân tích nguyên nhân và giải pháp theo 5M
  const handleAskAiCapa = async () => {
    setIsAiSuggesting(true);
    setAiSuggestionNotice('');
    try {
      const prompt = `Phân tích nguyên nhân sự cố QC và gợi ý hành động khắc phục CAPA theo chuẩn 2429/QĐ-BYT cho xét nghiệm ${test.name} vi phạm quy tắc Westgard ${result.westgardRule || '1-3s'}, giá trị đo ${result.value} ${test.unit}, Z-score ${zScore} SD. Hãy đưa ra gợi ý ngắn gọn cho 5M và hành động khắc phục tức thời.`;
      
      const res = await askAdvisorApi(prompt, {
        testName: test.name,
        level: result.level,
        value: result.value,
        mean: config.mean,
        sd: config.sd,
        zScore: zScore,
        violatedRule: result.westgardRule,
        lotNumber: lotNumber,
        analyzerName: analyzerName
      });

      if (res.text) {
        setAiSuggestionNotice('AI đã phân tích sự cố và đưa ra khuyến nghị.');
        setImmediateCorrection(prev => `${prev}\n[Khuyến nghị AI]: ${res.text.slice(0, 300)}...`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const handleSave = () => {
    const capa: CAPARecord = {
      id: existingCapa?.id || `capa_${Date.now()}`,
      code,
      timestamp: result.timestamp,
      testId: test.id,
      testName: test.name,
      unit: test.unit,
      level: result.level,
      value: result.value,
      zScore,
      meanTarget: config.mean,
      sdTarget: config.sd,
      violatedRule: result.westgardRule || '1-3s',
      errorType: result.westgardRule === '1-3s' || result.westgardRule === 'R-4s' ? 'random' : 'systematic',
      lotNumber,
      analyzerName,
      incidentDescription,
      rootCauses,
      immediateCorrection,
      preventiveAction,
      retestValue: !isNaN(retestValNum) ? retestValNum : undefined,
      retestZScore: retestZ,
      retestStatus: retestPassed ? 'passed' : 'failed',
      patientSampleHoldStatus,
      technician,
      approver,
      approvedAt: Date.now(),
      status: 'approved'
    };

    onSaveCapa(capa);
    onClose();
  };

  // In trực tiếp biên bản khổ giấy A4 qua iframe (Chuẩn hóa hồ sơ 2429)
  const handlePrintCapa = () => {
    const printableHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Biên bản CAPA - ${code}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 20mm; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 13pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .header-table td {
      vertical-align: top;
      text-align: center;
    }
    .title-box {
      text-align: center;
      margin: 15px 0 25px 0;
    }
    .title-box h1 {
      font-size: 16pt;
      font-weight: bold;
      margin: 0 0 5px 0;
      text-transform: uppercase;
    }
    .title-box p {
      font-size: 11pt;
      font-style: italic;
      margin: 0;
    }
    .info-table, .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .data-table th, .data-table td {
      border: 1px solid #333;
      padding: 6px 10px;
      font-size: 11.5pt;
    }
    .data-table th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .section-title {
      font-weight: bold;
      font-size: 12pt;
      margin: 12px 0 6px 0;
      text-transform: uppercase;
      border-bottom: 1px solid #444;
      padding-bottom: 2px;
    }
    .cause-item {
      margin-bottom: 4px;
      font-size: 11.5pt;
    }
    .cause-item strong {
      display: inline-block;
      width: 120px;
    }
    .signature-grid {
      width: 100%;
      margin-top: 30px;
      border-collapse: collapse;
    }
    .signature-grid td {
      width: 50%;
      text-align: center;
      vertical-align: top;
      font-size: 12pt;
    }
    .sig-space {
      height: 70px;
    }
    .stamp-box {
      border: 1px dashed #999;
      padding: 4px 8px;
      display: inline-block;
      font-size: 9pt;
      color: #666;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="width: 45%;">
        <strong>BỆNH VIỆN ĐA KHOA</strong><br>
        <strong>KHOA XÉT NGHIỆM</strong><br>
        <span style="font-size: 10pt;">Bộ phận Quản lý Chất lượng</span>
      </td>
      <td style="width: 55%;">
        <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br>
        <strong>Độc lập - Tự do - Hạnh phúc</strong><br>
        <span style="font-size: 10pt;">--------o0o--------</span>
      </td>
    </tr>
  </table>

  <div class="title-box">
    <h1>PHIẾU XỬ LÝ SỰ CỐ NỘI KIỂM & HÀNH ĐỘNG KHẮC PHỤC (CAPA)</h1>
    <p>(Ban hành theo quy trình kiểm soát chất lượng - Quyết định 2429/QĐ-BYT & ISO 15189)</p>
    <div style="font-size: 10.5pt; margin-top: 4px; font-weight: bold;">Số biên bản: ${code}</div>
  </div>

  <div class="section-title">I. THÔNG TIN SỰ CỐ NỘI KIỂM (IQC)</div>
  <table class="data-table">
    <tr>
      <td style="width: 25%;"><strong>Xét nghiệm:</strong></td>
      <td style="width: 35%;">${test.name} (${test.unit})</td>
      <td style="width: 20%;"><strong>Thiết bị/Máy:</strong></td>
      <td style="width: 20%;">${analyzerName}</td>
    </tr>
    <tr>
      <td><strong>Mức QC:</strong></td>
      <td>${result.level} (Số Lô: ${lotNumber})</td>
      <td><strong>Ngày giờ phát hiện:</strong></td>
      <td>${new Date(result.timestamp).toLocaleString('vi-VN')}</td>
    </tr>
    <tr>
      <td><strong>Giá trị đo:</strong></td>
      <td style="color: red; font-weight: bold;">${result.value} ${test.unit}</td>
      <td><strong>Mean ± SD đích:</strong></td>
      <td>${config.mean} ± ${config.sd} ${test.unit}</td>
    </tr>
    <tr>
      <td><strong>Độ lệch Z-score:</strong></td>
      <td style="font-weight: bold;">${zScore > 0 ? '+' : ''}${zScore} SD</td>
      <td><strong>Quy tắc vi phạm:</strong></td>
      <td style="color: red; font-weight: bold;">Westgard ${result.westgardRule || '1-3s'} (${result.westgardRule === '1-3s' || result.westgardRule === 'R-4s' ? 'Lỗi ngẫu nhiên' : 'Lỗi hệ thống'})</td>
    </tr>
  </table>

  <div class="section-title">II. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (MÔ HÌNH 5M)</div>
  <div style="padding-left: 10px; margin-bottom: 10px;">
    <div class="cause-item"><strong>1. Con người (Man):</strong> ${rootCauses.man}</div>
    <div class="cause-item"><strong>2. Thiết bị (Machine):</strong> ${rootCauses.machine}</div>
    <div class="cause-item"><strong>3. Hóa chất (Material):</strong> ${rootCauses.material}</div>
    <div class="cause-item"><strong>4. Phương pháp (Method):</strong> ${rootCauses.method}</div>
    <div class="cause-item"><strong>5. Môi trường (Milieu):</strong> ${rootCauses.milieu}</div>
  </div>

  <div class="section-title">III. HÀNH ĐỘNG KHẮC PHỤC & PHÒNG NGỪA (CAPA)</div>
  <div style="padding-left: 10px; margin-bottom: 10px;">
    <p><strong>1. Biện pháp khắc phục tức thời (Correction):</strong><br>${immediateCorrection}</p>
    <p><strong>2. Biện pháp phòng ngừa tái diễn (Preventive Action):</strong><br>${preventiveAction}</p>
  </div>

  <div class="section-title">IV. ĐÁNH GIÁ KẾT QUẢ SAU XỬ LÝ (RE-TEST)</div>
  <table class="data-table">
    <tr>
      <td style="width: 30%;"><strong>Kết quả chạy lại:</strong></td>
      <td style="width: 30%; font-weight: bold; color: ${retestPassed ? 'green' : 'red'};">${retestValNum} ${test.unit} (Z = ${retestZ > 0 ? '+' : ''}${retestZ} SD)</td>
      <td style="width: 20%;"><strong>Đánh giá:</strong></td>
      <td style="width: 20%; font-weight: bold; color: ${retestPassed ? 'green' : 'red'};">${retestPassed ? '✓ ĐẠT YÊU CẦU' : '✗ KHÔNG ĐẠT'}</td>
    </tr>
    <tr>
      <td colspan="4">
        <strong>Xử lý mẫu bệnh nhân:</strong> ${patientSampleHoldStatus === 'released_after_capa' ? 'Đã chạy lại mẫu bệnh nhân cùng mẻ và cho phép trả kết quả.' : patientSampleHoldStatus === 'held' ? 'Đang tạm giữ mẫu bệnh nhân, chờ kiểm tra thêm.' : 'Không ảnh hưởng đến lô mẫu bệnh nhân.'}
      </td>
    </tr>
  </table>

  <table class="signature-grid">
    <tr>
      <td>
        <strong>NGƯỜI LẬP BIÊN BẢN</strong><br>
        <span style="font-size: 10pt; font-style: italic;">(Ký và ghi rõ họ tên)</span>
        <div class="sig-space"></div>
        <strong>${technician}</strong>
      </td>
      <td>
        <span style="font-size: 10pt; font-style: italic;">Ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</span><br>
        <strong>TRƯỞNG KHOA / PHỤ TRÁCH CHẤT LƯỢNG</strong><br>
        <span style="font-size: 10pt; font-style: italic;">(Ký duyệt và đóng dấu)</span>
        <div class="sig-space"></div>
        <strong>${approver}</strong>
      </td>
    </tr>
  </table>
</body>
</html>`;

    let printIframe = document.getElementById('capa_print_frame') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'capa_print_frame';
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-10 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl shadow-inner">
              <i className="fas fa-file-medical-alt"></i>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">BIÊN BẢN CAPA NỘI KIỂM</h3>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-red-50 text-red-600 border border-red-200">
                  {result.westgardRule || '1-3s'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold tracking-wide mt-1">
                Tiêu chuẩn 2429/QĐ-BYT (Chương VIII - Quản lý mẫu QC) & ISO 15189
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-6 py-6 text-slate-800 dark:text-slate-200">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs">
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Xét nghiệm</span>
              <strong className="text-sm text-slate-900 dark:text-white">{test.name}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Mức QC / Lô</span>
              <strong className="text-sm">{result.level} - {lotNumber}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Giá trị đo (Mean)</span>
              <strong className="text-sm text-red-600">{result.value} {test.unit} ({config.mean})</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Độ lệch Z-score</span>
              <strong className="text-sm text-red-600">{zScore > 0 ? '+' : ''}{zScore} SD</strong>
            </div>
          </div>

          {/* AI Helper Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <i className="fas fa-robot text-sm"></i>
              </div>
              <div>
                <h4 className="text-xs font-black text-blue-900 dark:text-blue-200 uppercase">Trợ lý Cố vấn AI 2429</h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Tự động chẩn đoán nguyên nhân 5M và đề xuất phương án khắc phục dựa trên quy tắc vi phạm.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isAiSuggesting}
              onClick={handleAskAiCapa}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isAiSuggesting ? <><i className="fas fa-spinner fa-spin"></i> Đang phân tích...</> : <><i className="fas fa-magic"></i> AI Gợi ý xử lý</>}
            </button>
          </div>

          {aiSuggestionNotice && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
              <i className="fas fa-check-circle mr-1"></i> {aiSuggestionNotice}
            </div>
          )}

          {/* Form Fields: Thông tin quản trị */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Mã biên bản CAPA</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Kỹ thuật viên lập phiếu</label>
              <input
                type="text"
                value={technician}
                onChange={e => setTechnician(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Người phê duyệt (Trưởng khoa)</label>
              <input
                type="text"
                value={approver}
                onChange={e => setApprover(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
              />
            </div>
          </div>

          {/* Form Fields: Phân tích 5M */}
          <div className="space-y-3">
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <i className="fas fa-search-plus text-blue-500"></i> Phân tích nguyên nhân gốc rễ (Mô hình 5M)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-500 block mb-1">1. Con người (Man):</span>
                <input
                  type="text"
                  value={rootCauses.man}
                  onChange={e => setRootCauses({ ...rootCauses, man: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <span className="font-bold text-slate-500 block mb-1">2. Thiết bị (Machine):</span>
                <input
                  type="text"
                  value={rootCauses.machine}
                  onChange={e => setRootCauses({ ...rootCauses, machine: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <span className="font-bold text-slate-500 block mb-1">3. Hóa chất & Vật tư (Material):</span>
                <input
                  type="text"
                  value={rootCauses.material}
                  onChange={e => setRootCauses({ ...rootCauses, material: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <span className="font-bold text-slate-500 block mb-1">4. Phương pháp (Method):</span>
                <input
                  type="text"
                  value={rootCauses.method}
                  onChange={e => setRootCauses({ ...rootCauses, method: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Form Fields: Khắc phục & Phòng ngừa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1 uppercase text-[10px]">
                Biện pháp khắc phục tức thời (Correction)
              </label>
              <textarea
                rows={3}
                value={immediateCorrection}
                onChange={e => setImmediateCorrection(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1 uppercase text-[10px]">
                Hành động phòng ngừa tái diễn (Preventive Action)
              </label>
              <textarea
                rows={3}
                value={preventiveAction}
                onChange={e => setPreventiveAction(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium"
              />
            </div>
          </div>

          {/* Kết quả Re-test */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold uppercase text-[10px] text-slate-500">Kết quả chạy lại sau xử lý (Re-test)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.01"
                  value={retestValue}
                  onChange={e => setRetestValue(e.target.value)}
                  className="w-32 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-300 dark:border-slate-600 font-bold text-sm"
                />
                <span>{test.unit}</span>
                <span className={`px-3 py-1 rounded-lg text-xs font-black ${retestPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {retestPassed ? `✓ ĐẠT (Z = ${retestZ > 0 ? '+' : ''}${retestZ} SD)` : `✗ KHÔNG ĐẠT (Z = ${retestZ} SD)`}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold uppercase text-[10px] text-slate-500">Xử lý mẫu bệnh nhân</label>
              <select
                value={patientSampleHoldStatus}
                onChange={e => setPatientSampleHoldStatus(e.target.value as any)}
                className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-300 dark:border-slate-600 font-bold text-xs"
              >
                <option value="released_after_capa">Đã chạy lại & Cho phép trả kết quả</option>
                <option value="held">Đang tạm giữ mẫu bệnh nhân</option>
                <option value="no_impact">Không ảnh hưởng đến lô mẫu</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handlePrintCapa}
            className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all"
          >
            <i className="fas fa-print"></i> IN BIÊN BẢN (A4)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-200 uppercase tracking-wider cursor-pointer transition-all"
            >
              Lưu Biên Bản CAPA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
