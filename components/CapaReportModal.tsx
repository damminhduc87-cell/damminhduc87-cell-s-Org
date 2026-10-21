import React, { useState, useEffect } from 'react';
import { CAPARecord, QCResult, LabTest, QCLevel, RootCauseChecklist } from '../types';
import { askAdvisorApi } from '../services/advisorClient';

export interface WestgardRuleGuide {
  ruleCode: string;
  ruleTitle: string;
  errorCategory: 'random' | 'systematic' | 'warning';
  errorTypeTitle: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  mechanism: string;
  clinicalSignificance: string;
  legal2429: string;
  suggested5M: RootCauseChecklist;
  suggestedImmediate: string;
  suggestedPreventive: string;
}

export const WESTGARD_RULE_GUIDES: Record<string, WestgardRuleGuide> = {
  'r-4s': {
    ruleCode: 'R-4s',
    ruleTitle: 'Quy tắc R-4s (Độ giãn cách xuyên mức nồng độ > 4SD)',
    errorCategory: 'random',
    errorTypeTitle: 'Sai số ngẫu nhiên lớn (Random Error)',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40',
    badgeBorder: 'border-purple-200 dark:border-purple-800',
    badgeText: 'text-purple-700 dark:text-purple-300',
    mechanism: 'Chênh lệch giữa 2 mức nồng độ (Normal & High) trong cùng 1 lần chạy vượt quá 4SD (Ví dụ: mức Normal lệch +0.50SD nhưng mức High lại tụt sâu xuống -3.56SD, khoảng cách chênh lệch là 4.06SD). Lỗi này phản ánh thể tích hút, bọt khí hoặc buồng đo quang bị phân tán bất thường giữa các mức.',
    clinicalSignificance: 'Toàn bộ mẻ xét nghiệm trong lượt chạy này không đáng tin cậy. Dù mức Normal có nằm trong dải, nhưng mức High bị văng xa chứng tỏ hệ thống đo đang gặp bất ổn định ngẫu nhiên nghiêm trọng.',
    legal2429: 'Áp dụng theo Tiêu chí 8.12 (Bắt buộc từ chối lô, dừng trả kết quả bệnh nhân) & Chương X (Lập biên bản hành động khắc phục CAPA) - QĐ 2429/QĐ-BYT.',
    suggested5M: {
      man: 'Đã kiểm tra kỹ thuật pha mẫu và đảo trộn mẫu chứng (lắc nhẹ tránh tạo bọt khí, để mẫu cân bằng nhiệt độ phòng trước khi chạy).',
      machine: 'Nghi ngờ bọt khí trong đường ống kim hút (sample probe), kim hút bị bám dính cặn protein hoặc buồng đo quang (cuvette) không đồng đều.',
      material: 'Lọ mẫu chứng mức Cao có thể bị bay hơi làm cô đặc hoặc mẫu mức Thấp bị rã đông không đều.',
      method: 'Kiểm tra thứ tự nạp mẫu và thể tích hút tối thiểu của cup chứa mẫu QC.',
      milieu: 'Nhiệt độ phòng máy ổn định 22-25°C, không có nguồn rung lắc hoặc xung nhiễu điện áp tức thời.'
    },
    suggestedImmediate: 'Tạm dừng trả kết quả bệnh nhân. Thực hiện Prime/Purge xả bọt khí đường ống máy, rửa đầu kim hút (Probe Clean). Rót lại mẫu chứng từ lọ mới và chạy lại đồng thời cả 2 mức Normal và High.',
    suggestedPreventive: 'Đào tạo lại nhân viên quy trình hoàn nguyên mẫu chứng chuẩn. Thêm bước xả bọt khí tự động vào đầu ca làm việc mỗi sáng.'
  },
  '1-3s': {
    ruleCode: '1-3s',
    ruleTitle: 'Quy tắc 1-3s (Một điểm đơn lẻ vượt quá ±3SD)',
    errorCategory: 'random',
    errorTypeTitle: 'Sai số ngẫu nhiên cực lớn (Severe Random Error) hoặc Lỗi hệ thống nghiêm trọng',
    badgeBg: 'bg-red-50 dark:bg-red-950/40',
    badgeBorder: 'border-red-200 dark:border-red-800',
    badgeText: 'text-red-700 dark:text-red-300',
    mechanism: '1 điểm kết quả đo vượt ra ngoài dải ±3SD (xác suất xảy ra ngẫu nhiên sinh học chỉ 0.27%). Thường do nghẹt kim hút một phần, bọt khí lớn trong buồng đo, hoặc nhầm lẫn vị trí đặt hóa chất/cup mẫu.',
    clinicalSignificance: 'Sai lệch rất lớn, vượt xa giới hạn sai số cho phép lâm sàng (TEa). Tuyệt đối không được sử dụng kết quả xét nghiệm để trả cho bệnh nhân.',
    legal2429: 'Áp dụng theo Tiêu chí 8.12 (Bắt buộc từ chối lô, dừng trả kết quả bệnh nhân) & Chương X (Lập biên bản hành động khắc phục CAPA) - QĐ 2429/QĐ-BYT.',
    suggested5M: {
      man: 'Kiểm tra việc đặt nhầm vị trí cup mẫu trên khay QC hoặc nhầm lẫn mã barcode lọ mẫu chứng.',
      machine: 'Kim hút bị nghẹt sợi fibrin/cặn hóa chất, bơm hút mẫu (syringe pump) bị hở gioăng hoặc bóng đèn đo quang suy giảm đột ngột.',
      material: 'Thuốc thử (Reagent) đã hết đáy lọ hoặc bị kết tủa, hóa chất bị nhiễm chéo từ xét nghiệm liền trước.',
      method: 'Thông số cài đặt bước sóng lọc hoặc thời gian ủ phản ứng có bị thay đổi không mong muốn.',
      milieu: 'Nhiệt độ buồng ủ phản ứng có đạt chuẩn 37°C ± 0.1°C hay không.'
    },
    suggestedImmediate: 'Tạm giữ toàn bộ kết quả bệnh nhân trong mẻ chạy này. Rửa kim hút bằng dung dịch tẩy rửa đậm đặc (Acid/Base Wash), kiểm tra thể tích thuốc thử trong khay. Chạy lại mẫu chứng.',
    suggestedPreventive: 'Kiểm tra mức thuốc thử trước mỗi ca làm việc; bảo dưỡng định kỳ hệ thống piston bơm hút mẫu.'
  },
  '2-2s': {
    ruleCode: '2-2s',
    ruleTitle: 'Quy tắc 2-2s (Hai điểm liên tiếp cùng vượt ±2SD)',
    errorCategory: 'systematic',
    errorTypeTitle: 'Sai số hệ thống (Systematic Error) - Lệch nền (Shift)',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeBorder: 'border-amber-200 dark:border-amber-800',
    badgeText: 'text-amber-700 dark:text-amber-300',
    mechanism: '2 điểm liên tiếp cùng vượt quá +2SD (hoặc cùng vượt quá -2SD) trên cùng 1 mức nồng độ, hoặc cả 2 mức Normal & High trong cùng một lần chạy cùng vượt quá 2SD về một phía. Đây là bằng chứng của việc toàn bộ hệ thống bị lệch nền đồng loạt.',
    clinicalSignificance: 'Toàn bộ kết quả bệnh nhân sẽ bị cộng thêm hoặc trừ bớt một lượng sai số cố định (Bias), dẫn đến nguy cơ chẩn đoán sai lệch trên lâm sàng.',
    legal2429: 'Áp dụng theo Tiêu chí 8.12 (Bắt buộc từ chối lô, dừng trả kết quả bệnh nhân) & Chương X (Lập biên bản hành động khắc phục CAPA) - QĐ 2429/QĐ-BYT.',
    suggested5M: {
      man: 'Kỹ thuật viên chưa chuẩn lại máy sau khi thay chai hóa chất mới hoặc pha chất chuẩn Calibrator sai nồng độ.',
      machine: 'Kính lọc bước sóng quang học bị bám bẩn hoặc buồng ủ nhiệt độ bị lệch chuẩn (quá nóng hoặc quá lạnh).',
      material: 'Thuốc thử mới mở nắp khác số Lô (Lot) với đường chuẩn đang lưu; chất chuẩn (Calibrator) đã quá hạn mở nắp.',
      method: 'Đường cong hiệu chuẩn (Calibration Curve) đã hết hạn hiệu lực hoặc bị lệch hệ số K.',
      milieu: 'Nhiệt độ phòng xét nghiệm dao động quá 5°C ảnh hưởng đến tốc độ phản ứng enzyme.'
    },
    suggestedImmediate: 'Tạm dừng trả kết quả. Mở lọ hóa chất và chất chuẩn mới; thực hiện hiệu chuẩn lại toàn bộ (Full Calibration) cho xét nghiệm này. Chạy lại QC cả 2 mức nồng độ.',
    suggestedPreventive: 'Ban hành quy định bắt buộc phải Calib lại máy mỗi khi thay đổi Lô hóa chất mới; ghi nhật ký mở nắp Calibrator.'
  },
  '4-1s': {
    ruleCode: '4-1s',
    ruleTitle: 'Quy tắc 4-1s (Bốn điểm liên tiếp cùng lệch vượt 1SD về một phía)',
    errorCategory: 'systematic',
    errorTypeTitle: 'Sai số hệ thống (Systematic Error) - Xu hướng trôi dạt (Drift)',
    badgeBg: 'bg-orange-50 dark:bg-orange-950/40',
    badgeBorder: 'border-orange-200 dark:border-orange-800',
    badgeText: 'text-orange-700 dark:text-orange-300',
    mechanism: '4 lần đo liên tiếp đều cùng vượt quá +1SD (hoặc cùng vượt quá -1SD). Mặc dù các điểm này vẫn nằm trong dải ±2SD (mắt thường tưởng là đạt), nhưng phân bố đã hoàn toàn mất tính ngẫu nhiên tự nhiên và trôi dần về một hướng.',
    clinicalSignificance: 'Cảnh báo sớm hóa chất đang thoái hóa dần trên máy hoặc bóng đèn quang học đang suy giảm công suất phát quang. Nếu không can thiệp, các ngày tới kết quả sẽ văng ra ngoài 2SD và 3SD.',
    legal2429: 'Áp dụng theo Tiêu chí 8.13 (Xem xét định kỳ phát hiện xu hướng bất thường) & Chương X (CAPA phòng ngừa) - QĐ 2429/QĐ-BYT.',
    suggested5M: {
      man: 'Kỹ thuật viên để hóa chất trên máy mở nắp quá lâu qua đêm gây bay hơi dung môi.',
      machine: 'Bóng đèn Halogen nguồn sáng đo quang bị già hóa, suy giảm quang thông theo thời gian.',
      material: 'Thuốc thử trên khoang làm lạnh của máy (Reagent Carousel) bị biến tính nhẹ hoặc giảm hoạt lực enzyme.',
      method: 'Hệ số chuẩn (Calibration Factor) bị trôi nhẹ sau nhiều ngày vận hành liên tục.',
      milieu: 'Độ ẩm phòng máy tăng cao ảnh hưởng đến độ ổn định quang học.'
    },
    suggestedImmediate: 'Kiểm tra hạn mở nắp hóa chất trên máy. Hiệu chuẩn lại xét nghiệm (Re-calibration). Theo dõi sát kết quả QC ở lần chạy kế tiếp.',
    suggestedPreventive: 'Đậy kín nắp hóa chất khi kết thúc ca làm việc; lập kế hoạch thay bóng đèn quang học theo số giờ hoạt động của nhà sản xuất.'
  },
  '10-x': {
    ruleCode: '10-x',
    ruleTitle: 'Quy tắc 10-x (Mười điểm liên tiếp nằm cùng một phía đường Mean)',
    errorCategory: 'systematic',
    errorTypeTitle: 'Sai số hệ thống (Systematic Error) - Lệch mốc cơ sở (Shift)',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeBorder: 'border-amber-200 dark:border-amber-800',
    badgeText: 'text-amber-700 dark:text-amber-300',
    mechanism: '10 lần đo liên tiếp đều nằm ở cùng một phía so với đường Trung bình Mean (toàn bộ nằm trên hoặc toàn bộ nằm dưới), dù độ lệch rất nhỏ (chỉ 0.2SD - 0.7SD). Điều này chứng minh giá trị trung bình thực tế đã bị dịch chuyển khỏi giá trị đích ban đầu.',
    clinicalSignificance: 'Dù các điểm đều có màu xanh trong dải ±2SD, nhưng thực tế hệ thống đã bị lệch nền cố định (Bias). Xét nghiệm có độ chụm tốt nhưng độ đúng (Accuracy) đã bị suy giảm.',
    legal2429: 'Áp dụng theo Tiêu chí 8.13 (Đánh giá xu hướng định kỳ) & Tiêu chí 8.1 (Tính toán lại Mean/SD thực tế khi đổi lô) - QĐ 2429/QĐ-BYT.',
    suggested5M: {
      man: 'Thay đổi nhân sự pha mẫu chứng hoặc kỹ thuật hút mẫu có sự sai khác cố định giữa các ca.',
      machine: 'Vạch chuẩn mốc Zero (Blank) của máy bị xê dịch sau đợt bảo dưỡng hoặc thay bóng đèn.',
      material: 'Lô thuốc thử mới có sự sai lệch độ nhạy so với lô cũ; giá trị đích Mean của nhà sản xuất khác với đặc thù máy tại Labo.',
      method: 'Phương pháp đo chưa được thiết lập giá trị Mean riêng thực tế (Cumulative Mean) sau 20 ngày chạy ổn định.',
      milieu: 'Hệ thống làm lạnh hóa chất duy trì ở nhiệt độ hơi khác chuẩn (ví dụ 8°C thay vì 4°C).'
    },
    suggestedImmediate: 'Tính toán lại Mean lũy tích (Cumulative Mean) với N >= 20 mẫu. Kiểm tra lại độ chệch Bias% so với ngoại kiểm EQA. Hiệu chuẩn lại máy nếu cần.',
    suggestedPreventive: 'Thiết lập giá trị Mean thực tế cho từng máy theo đúng hướng dẫn CLSI C24 khi bắt đầu sử dụng một Lô hóa chất/mẫu chứng mới.'
  },
  '1-2s': {
    ruleCode: '1-2s',
    ruleTitle: 'Quy tắc 1-2s (Cảnh báo vượt ±2SD)',
    errorCategory: 'warning',
    errorTypeTitle: 'Quy tắc cảnh báo (Warning Rule) - Chưa từ chối lô',
    badgeBg: 'bg-yellow-50 dark:bg-yellow-950/40',
    badgeBorder: 'border-yellow-200 dark:border-yellow-800',
    badgeText: 'text-yellow-700 dark:text-yellow-300',
    mechanism: 'Một giá trị QC đơn lẻ nằm trong khoảng từ 2SD đến 3SD. Theo phân bố chuẩn Gauss tự nhiên, có khoảng 4.5% kết quả bình thường có thể rơi vào vùng này.',
    clinicalSignificance: 'Đây là cờ cảnh báo (Warning flag), chưa phải là lỗi từ chối lô (Rejection rule). Kỹ thuật viên cần kiểm tra xem có đi kèm các quy tắc khác (như 2-2s, R-4s) hay không.',
    legal2429: 'Áp dụng theo Tiêu chí 8.11 & 8.13 - QĐ 2429/QĐ-BYT: Ghi nhận nhật ký và theo dõi sát lần chạy tiếp theo.',
    suggested5M: {
      man: 'Dao động ngẫu nhiên bình thường khi thao tác kỹ thuật viên.',
      machine: 'Biến thiên điện áp hoặc rung nhẹ khi máy đang quay ly tâm.',
      material: 'Bảo quản mẫu chứng ổn định, không có bất thường.',
      method: 'Phương pháp đo bình thường, đường chuẩn còn hiệu lực.',
      milieu: 'Môi trường phòng xét nghiệm bình thường.'
    },
    suggestedImmediate: 'Ghi nhận cảnh báo vào nhật ký nội kiểm. Tiến hành chạy lại mẫu chứng ở ca tiếp theo để khẳng định máy vẫn trong kiểm soát.',
    suggestedPreventive: 'Quan sát biểu đồ Levey-Jennings để xem có hình thành chuỗi 2-2s hay 4-1s trong các ngày tới hay không.'
  }
};

export function getWestgardRuleGuide(rawRule?: string): WestgardRuleGuide {
  const norm = (rawRule || '').toLowerCase().replace(/[_]/g, '-').trim();
  if (norm.includes('r-4s') || norm.includes('r4s')) return WESTGARD_RULE_GUIDES['r-4s'];
  if (norm.includes('1-3s') || norm.includes('13s')) return WESTGARD_RULE_GUIDES['1-3s'];
  if (norm.includes('2-2s') || norm.includes('22s')) return WESTGARD_RULE_GUIDES['2-2s'];
  if (norm.includes('4-1s') || norm.includes('41s')) return WESTGARD_RULE_GUIDES['4-1s'];
  if (norm.includes('10-x') || norm.includes('10x')) return WESTGARD_RULE_GUIDES['10-x'];
  if (norm.includes('1-2s') || norm.includes('12s')) return WESTGARD_RULE_GUIDES['1-2s'];
  return WESTGARD_RULE_GUIDES['1-3s'];
}

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
  const config = test?.configs?.[result.level] || { mean: 0, sd: 1, bias: 0, currentLot: 'LOT-DEFAULT' };
  const zScore = config?.sd > 0 ? Number(((result.value - config.mean) / config.sd).toFixed(2)) : 0;
  const guide = getWestgardRuleGuide(result.westgardRule);
  
  // Default values
  const [code, setCode] = useState(() => {
    if (existingCapa?.code) return existingCapa.code;
    const dateStr = new Date(result.timestamp).toISOString().slice(0, 10).replace(/-/g, '');
    return `CAPA-${dateStr}-${test.id.toUpperCase().slice(0, 4)}-${Math.floor(100 + Math.random() * 900)}`;
  });

  const [analyzerName, setAnalyzerName] = useState(test.analyzerName || 'Máy sinh hóa / miễn dịch tự động');
  const [lotNumber, setLotNumber] = useState(result.lotNumber || config?.currentLot || 'LOT-2026-A1');
  const [technician, setTechnician] = useState(() => {
    let t = (result.technician || '').trim();
    if (!t || t.toLowerCase().includes('google') || t.toLowerCase().includes('sheet')) {
      t = (typeof window !== 'undefined' ? localStorage.getItem('mdlab_technician') : '') || 'Đàm Minh Đức';
    }
    return t.replace(/^KTV\.?\s*/i, '');
  });
  const [approver, setApprover] = useState(result.approver || 'BS. CKII Trưởng Khoa');
  
  const [incidentDescription, setIncidentDescription] = useState(
    existingCapa?.incidentDescription || 
    `Kết quả nội kiểm ngày ${new Date(result.timestamp).toLocaleString('vi-VN')} đạt ${result.value} ${test.unit} (Mean đích: ${config.mean}, SD: ${config.sd}), Z-score = ${zScore > 0 ? '+' : ''}${zScore} SD. Vi phạm quy tắc Westgard: ${result.westgardRule || '1-3s'}.`
  );

  const [rootCauses, setRootCauses] = useState<RootCauseChecklist>(
    existingCapa?.rootCauses || guide.suggested5M
  );

  const [immediateCorrection, setImmediateCorrection] = useState(
    existingCapa?.immediateCorrection || guide.suggestedImmediate
  );

  const [preventiveAction, setPreventiveAction] = useState(
    existingCapa?.preventiveAction || guide.suggestedPreventive
  );

  const [retestValue, setRetestValue] = useState<string>(
    existingCapa?.retestValue !== undefined ? String(existingCapa.retestValue) : String(config.mean)
  );

  const [patientSampleHoldStatus, setPatientSampleHoldStatus] = useState<'held' | 'released_after_capa' | 'no_impact'>(
    existingCapa?.patientSampleHoldStatus || 'released_after_capa'
  );

  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [aiSuggestionNotice, setAiSuggestionNotice] = useState('');

  // Tự động điền nhanh gợi ý 5M chuẩn QĐ 2429 theo quy tắc vi phạm
  const handleAutoFill5M = () => {
    setRootCauses({ ...guide.suggested5M });
    setImmediateCorrection(guide.suggestedImmediate);
    setPreventiveAction(guide.suggestedPreventive);
    setAiSuggestionNotice(`Đã tự động áp dụng gợi ý nguyên nhân 5M & giải pháp chuẩn QĐ 2429 cho lỗi ${guide.ruleCode}!`);
  };

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
      <td style="color: red; font-weight: bold;">Westgard ${guide.ruleCode}</td>
    </tr>
    <tr>
      <td><strong>Bản chất sai số:</strong></td>
      <td style="color: #b91c1c; font-weight: bold;">${guide.errorTypeTitle}</td>
      <td><strong>Căn cứ QĐ 2429:</strong></td>
      <td style="font-weight: bold; font-size: 10pt;">${guide.legal2429}</td>
    </tr>
  </table>

  <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #ef4444; padding: 8px 12px; margin-bottom: 12px; font-size: 11pt; line-height: 1.45;">
    <strong>Cơ chế phát sinh sai số:</strong> ${guide.mechanism}<br>
    <strong>Ý nghĩa an toàn lâm sàng:</strong> ${guide.clinicalSignificance}
  </div>

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

          {/* Cẩm nang Chẩn đoán Vi phạm Westgard & Căn cứ QĐ 2429/QĐ-BYT */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-rose-50/40 dark:from-slate-800/80 dark:to-rose-950/20 border-2 border-rose-200 dark:border-rose-900/50 rounded-2xl space-y-3.5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-rose-100 dark:border-rose-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <i className="fas fa-stethoscope text-sm"></i>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Cẩm nang Chẩn đoán Vi phạm Westgard & Căn cứ QĐ 2429
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Hệ thống chuyên gia tự động đối chiếu bản chất sai số lâm sàng & căn cứ pháp lý Bộ Y tế
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-red-100 text-red-700 border border-red-300">
                  {guide.ruleCode}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${guide.badgeBg} ${guide.badgeBorder} ${guide.badgeText}`}>
                  {guide.errorTypeTitle}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
              <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <strong className="text-rose-600 dark:text-rose-400 block mb-1 font-bold flex items-center gap-1.5">
                  <i className="fas fa-microscope text-[10px]"></i> Cơ chế phát sinh sai số:
                </strong>
                <p className="text-slate-700 dark:text-slate-300">{guide.mechanism}</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <strong className="text-blue-600 dark:text-blue-400 block mb-1 font-bold flex items-center gap-1.5">
                  <i className="fas fa-notes-medical text-[10px]"></i> Ý nghĩa an toàn lâm sàng:
                </strong>
                <p className="text-slate-700 dark:text-slate-300">{guide.clinicalSignificance}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                <i className="fas fa-balance-scale text-amber-500 text-sm"></i>
                <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 text-[11px]">
                  {guide.legal2429}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAutoFill5M}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Tự động điền các nguyên nhân kinh điển và giải pháp chuẩn QĐ 2429 cho mã lỗi này"
              >
                <i className="fas fa-bolt text-yellow-300"></i>
                <span>Tự động điền gợi ý 5M chuẩn QĐ 2429</span>
              </button>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <i className="fas fa-search-plus text-blue-500"></i> Phân tích nguyên nhân gốc rễ (Mô hình 5M)
              </h4>
              <button
                type="button"
                onClick={handleAutoFill5M}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800"
              >
                <i className="fas fa-magic text-xs"></i> Điền nhanh 5M theo lỗi {guide.ruleCode}
              </button>
            </div>
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
