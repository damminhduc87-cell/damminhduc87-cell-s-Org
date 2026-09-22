import { LabTest, QCLevel, QCResult, CAPARecord } from './types';

export const DEFAULT_ANALYZERS: string[] = [
  'Máy Hóa sinh 1',
  'Máy Hóa sinh 2',
  'Máy Miễn dịch 1',
  'Máy Điện giải & Khí máu'
];

export const INITIAL_TESTS: LabTest[] = [
  {
    id: 'glucose',
    name: 'Glucose (Đường huyết)',
    unit: 'mmol/L',
    tea: 8,
    analyzerName: 'Máy Hóa sinh 1',
    configs: {
      [QCLevel.LOW]: { mean: 3.5, sd: 0.12, bias: 2.0, eqaTarget: 3.6, eqaResult: 3.67, currentLot: 'LOT-2026-GLU-L' },
      [QCLevel.NORMAL]: { mean: 5.6, sd: 0.14, bias: 1.5, eqaTarget: 5.5, eqaResult: 5.61, currentLot: 'LOT-2026-GLU-N' },
      [QCLevel.HIGH]: { mean: 15.2, sd: 0.45, bias: 2.2, eqaTarget: 15.0, eqaResult: 15.33, currentLot: 'LOT-2026-GLU-H' },
    }
  },
  {
    id: 'cholesterol',
    name: 'Cholesterol toàn phần',
    unit: 'mmol/L',
    tea: 10,
    analyzerName: 'Máy Hóa sinh 1',
    configs: {
      [QCLevel.LOW]: { mean: 3.1, sd: 0.08, bias: 1.5, currentLot: 'LOT-2026-LIP-L' },
      [QCLevel.NORMAL]: { mean: 5.2, sd: 0.15, bias: 1.2, currentLot: 'LOT-2026-LIP-N' },
      [QCLevel.HIGH]: { mean: 8.5, sd: 0.25, bias: 1.8, currentLot: 'LOT-2026-LIP-H' },
    }
  },
  {
    id: 'triglycerides',
    name: 'Triglycerides',
    unit: 'mmol/L',
    tea: 15,
    analyzerName: 'Máy Hóa sinh 1',
    configs: {
      [QCLevel.LOW]: { mean: 0.8, sd: 0.04, bias: 2.0, currentLot: 'LOT-2026-LIP-L' },
      [QCLevel.NORMAL]: { mean: 1.7, sd: 0.07, bias: 1.8, currentLot: 'LOT-2026-LIP-N' },
      [QCLevel.HIGH]: { mean: 4.5, sd: 0.18, bias: 2.5, currentLot: 'LOT-2026-LIP-H' },
    }
  },
  {
    id: 'hdl',
    name: 'HDL Cholesterol',
    unit: 'mmol/L',
    tea: 20,
    analyzerName: 'Máy Hóa sinh 1',
    configs: {
      [QCLevel.LOW]: { mean: 0.7, sd: 0.05, bias: 3.0, currentLot: 'LOT-2026-LIP-L' },
      [QCLevel.NORMAL]: { mean: 1.2, sd: 0.08, bias: 2.5, currentLot: 'LOT-2026-LIP-N' },
      [QCLevel.HIGH]: { mean: 2.5, sd: 0.15, bias: 3.5, currentLot: 'LOT-2026-LIP-H' },
    }
  },
  {
    id: 'ldl',
    name: 'LDL Cholesterol',
    unit: 'mmol/L',
    tea: 12,
    analyzerName: 'Máy Hóa sinh 1',
    configs: {
      [QCLevel.LOW]: { mean: 1.5, sd: 0.06, bias: 2.5, currentLot: 'LOT-2026-LIP-L' },
      [QCLevel.NORMAL]: { mean: 2.8, sd: 0.12, bias: 2.0, currentLot: 'LOT-2026-LIP-N' },
      [QCLevel.HIGH]: { mean: 5.5, sd: 0.22, bias: 3.0, currentLot: 'LOT-2026-LIP-H' },
    }
  },
  {
    id: 'ast',
    name: 'GOT (AST)',
    unit: 'U/L',
    tea: 15,
    analyzerName: 'Máy Hóa sinh 2',
    configs: {
      [QCLevel.LOW]: { mean: 25, sd: 1.2, bias: 2.5, currentLot: 'LOT-2026-ENZ-L' },
      [QCLevel.NORMAL]: { mean: 45, sd: 1.8, bias: 2.0, currentLot: 'LOT-2026-ENZ-N' },
      [QCLevel.HIGH]: { mean: 180, sd: 7.5, bias: 3.0, currentLot: 'LOT-2026-ENZ-H' },
    }
  },
  {
    id: 'alt',
    name: 'GPT (ALT)',
    unit: 'U/L',
    tea: 15,
    analyzerName: 'Máy Hóa sinh 2',
    configs: {
      [QCLevel.LOW]: { mean: 22, sd: 1.0, bias: 2.5, currentLot: 'LOT-2026-ENZ-L' },
      [QCLevel.NORMAL]: { mean: 40, sd: 1.6, bias: 2.0, currentLot: 'LOT-2026-ENZ-N' },
      [QCLevel.HIGH]: { mean: 165, sd: 6.5, bias: 3.0, currentLot: 'LOT-2026-ENZ-H' },
    }
  },
  {
    id: 'ggt',
    name: 'GGT (Men gan)',
    unit: 'U/L',
    tea: 15,
    analyzerName: 'Máy Hóa sinh 2',
    configs: {
      [QCLevel.LOW]: { mean: 20, sd: 0.9, bias: 2.0, currentLot: 'LOT-2026-ENZ-L' },
      [QCLevel.NORMAL]: { mean: 42, sd: 1.7, bias: 1.8, currentLot: 'LOT-2026-ENZ-N' },
      [QCLevel.HIGH]: { mean: 150, sd: 6.0, bias: 2.5, currentLot: 'LOT-2026-ENZ-H' },
    }
  },
  {
    id: 'creatinine',
    name: 'Creatinine (Thận)',
    unit: 'µmol/L',
    tea: 10,
    analyzerName: 'Máy Hóa sinh 1',
    configs: {
      [QCLevel.LOW]: { mean: 55, sd: 2.5, bias: 1.8, currentLot: 'LOT-2026-REN-L' },
      [QCLevel.NORMAL]: { mean: 95, sd: 3.8, bias: 1.5, currentLot: 'LOT-2026-REN-N' },
      [QCLevel.HIGH]: { mean: 380, sd: 12.0, bias: 2.0, currentLot: 'LOT-2026-REN-H' },
    }
  },
  {
    id: 'urea',
    name: 'Urea (Ure máu)',
    unit: 'mmol/L',
    tea: 12,
    analyzerName: 'Máy Hóa sinh 1',
    configs: {
      [QCLevel.LOW]: { mean: 3.0, sd: 0.15, bias: 1.5, currentLot: 'LOT-2026-REN-L' },
      [QCLevel.NORMAL]: { mean: 6.5, sd: 0.25, bias: 1.2, currentLot: 'LOT-2026-REN-N' },
      [QCLevel.HIGH]: { mean: 22.0, sd: 0.85, bias: 1.8, currentLot: 'LOT-2026-REN-H' },
    }
  },
  {
    id: 'uric-acid',
    name: 'Acid Uric',
    unit: 'µmol/L',
    tea: 12,
    analyzerName: 'Máy Hóa sinh 1',
    configs: {
      [QCLevel.LOW]: { mean: 180, sd: 6, bias: 1.8, currentLot: 'LOT-2026-URI-L' },
      [QCLevel.NORMAL]: { mean: 350, sd: 12, bias: 1.5, currentLot: 'LOT-2026-URI-N' },
      [QCLevel.HIGH]: { mean: 650, sd: 25, bias: 2.0, currentLot: 'LOT-2026-URI-H' },
    }
  },
  {
    id: 'albumin',
    name: 'Albumin',
    unit: 'g/L',
    tea: 8,
    analyzerName: 'Máy Hóa sinh 1',
    configs: {
      [QCLevel.LOW]: { mean: 25, sd: 0.6, bias: 1.5, currentLot: 'LOT-2026-PRO-L' },
      [QCLevel.NORMAL]: { mean: 42, sd: 1.1, bias: 1.2, currentLot: 'LOT-2026-PRO-N' },
      [QCLevel.HIGH]: { mean: 55, sd: 1.5, bias: 1.8, currentLot: 'LOT-2026-PRO-H' },
    }
  },
  {
    id: 'protein',
    name: 'Protein toàn phần',
    unit: 'g/L',
    tea: 8,
    analyzerName: 'Máy Hóa sinh 1',
    configs: {
      [QCLevel.LOW]: { mean: 45, sd: 1.2, bias: 1.5, currentLot: 'LOT-2026-PRO-L' },
      [QCLevel.NORMAL]: { mean: 70, sd: 1.8, bias: 1.2, currentLot: 'LOT-2026-PRO-N' },
      [QCLevel.HIGH]: { mean: 95, sd: 2.5, bias: 1.8, currentLot: 'LOT-2026-PRO-H' },
    }
  },
  {
    id: 'bilirubin-tp',
    name: 'Bilirubin toàn phần',
    unit: 'µmol/L',
    tea: 15,
    analyzerName: 'Máy Hóa sinh 1',
    configs: {
      [QCLevel.LOW]: { mean: 10.5, sd: 0.5, bias: 2.0, currentLot: 'LOT-2026-BIL-L' },
      [QCLevel.NORMAL]: { mean: 18.0, sd: 0.8, bias: 1.8, currentLot: 'LOT-2026-BIL-N' },
      [QCLevel.HIGH]: { mean: 85.0, sd: 3.5, bias: 2.5, currentLot: 'LOT-2026-BIL-H' },
    }
  },
  {
    id: 'bilirubin-tt',
    name: 'Bilirubin trực tiếp',
    unit: 'µmol/L',
    tea: 15,
    analyzerName: 'Máy Hóa sinh 1',
    configs: {
      [QCLevel.LOW]: { mean: 3.2, sd: 0.18, bias: 2.0, currentLot: 'LOT-2026-BIL-L' },
      [QCLevel.NORMAL]: { mean: 5.5, sd: 0.25, bias: 1.8, currentLot: 'LOT-2026-BIL-N' },
      [QCLevel.HIGH]: { mean: 35.0, sd: 1.5, bias: 2.5, currentLot: 'LOT-2026-BIL-H' },
    }
  },
  {
    id: 'calcium',
    name: 'Canxi toàn phần',
    unit: 'mmol/L',
    tea: 6,
    analyzerName: 'Máy Hóa sinh 1',
    configs: {
      [QCLevel.LOW]: { mean: 1.8, sd: 0.05, bias: 1.5, currentLot: 'LOT-2026-MIN-L' },
      [QCLevel.NORMAL]: { mean: 2.35, sd: 0.07, bias: 1.2, currentLot: 'LOT-2026-MIN-N' },
      [QCLevel.HIGH]: { mean: 3.2, sd: 0.10, bias: 1.5, currentLot: 'LOT-2026-MIN-H' },
    }
  },
  {
    id: 'electrolytes-na',
    name: 'Natri (Na+)',
    unit: 'mmol/L',
    tea: 4,
    analyzerName: 'Máy Điện giải & Khí máu',
    configs: {
      [QCLevel.LOW]: { mean: 120, sd: 1.5, bias: 1.0, currentLot: 'LOT-2026-ELE-L' },
      [QCLevel.NORMAL]: { mean: 140, sd: 1.8, bias: 0.8, currentLot: 'LOT-2026-ELE-N' },
      [QCLevel.HIGH]: { mean: 160, sd: 2.0, bias: 1.0, currentLot: 'LOT-2026-ELE-H' },
    }
  },
  {
    id: 'electrolytes-k',
    name: 'Kali (K+)',
    unit: 'mmol/L',
    tea: 5,
    analyzerName: 'Máy Điện giải & Khí máu',
    configs: {
      [QCLevel.LOW]: { mean: 2.8, sd: 0.06, bias: 1.2, currentLot: 'LOT-2026-ELE-L' },
      [QCLevel.NORMAL]: { mean: 4.2, sd: 0.09, bias: 1.0, currentLot: 'LOT-2026-ELE-N' },
      [QCLevel.HIGH]: { mean: 6.5, sd: 0.15, bias: 1.2, currentLot: 'LOT-2026-ELE-H' },
    }
  },
  {
    id: 'electrolytes-cl',
    name: 'Clo (Cl-)',
    unit: 'mmol/L',
    tea: 5,
    analyzerName: 'Máy Điện giải & Khí máu',
    configs: {
      [QCLevel.LOW]: { mean: 85, sd: 1.2, bias: 1.2, currentLot: 'LOT-2026-ELE-L' },
      [QCLevel.NORMAL]: { mean: 102, sd: 1.5, bias: 1.0, currentLot: 'LOT-2026-ELE-N' },
      [QCLevel.HIGH]: { mean: 125, sd: 1.8, bias: 1.2, currentLot: 'LOT-2026-ELE-H' },
    }
  },
  {
    id: 'crp',
    name: 'CRP (Định lượng)',
    unit: 'mg/L',
    tea: 15,
    analyzerName: 'Máy Miễn dịch 1',
    configs: {
      [QCLevel.LOW]: { mean: 2.5, sd: 0.15, bias: 2.0, currentLot: 'LOT-2026-IMM-L' },
      [QCLevel.NORMAL]: { mean: 8.0, sd: 0.45, bias: 1.8, currentLot: 'LOT-2026-IMM-N' },
      [QCLevel.HIGH]: { mean: 45.0, sd: 2.2, bias: 2.5, currentLot: 'LOT-2026-IMM-H' },
    }
  }
];

const now = Date.now();
const dayMs = 86400000;

export const MOCK_RESULTS: QCResult[] = [
  // Glucose - Normal Level chain
  { id: 'g-n-1', testId: 'glucose', level: QCLevel.NORMAL, value: 5.62, timestamp: now - dayMs * 12, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-n-2', testId: 'glucose', level: QCLevel.NORMAL, value: 5.58, timestamp: now - dayMs * 11, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-n-3', testId: 'glucose', level: QCLevel.NORMAL, value: 5.65, timestamp: now - dayMs * 10, technician: 'KTV. Trần Thị B', lotNumber: 'LOT-2026-GLU-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-n-4', testId: 'glucose', level: QCLevel.NORMAL, value: 5.54, timestamp: now - dayMs * 9, technician: 'KTV. Trần Thị B', lotNumber: 'LOT-2026-GLU-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-n-5', testId: 'glucose', level: QCLevel.NORMAL, value: 5.72, timestamp: now - dayMs * 8, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-n-6', testId: 'glucose', level: QCLevel.NORMAL, value: 5.61, timestamp: now - dayMs * 7, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-n-7', testId: 'glucose', level: QCLevel.NORMAL, value: 5.92, timestamp: now - dayMs * 6, technician: 'KTV. Trần Thị B', lotNumber: 'LOT-2026-GLU-N', westgardRule: '1-2s', westgardStatus: 'warning', comment: 'Cảnh báo 1-2s: Z = +2.28SD' },
  { id: 'g-n-8', testId: 'glucose', level: QCLevel.NORMAL, value: 5.64, timestamp: now - dayMs * 5, technician: 'KTV. Trần Thị B', lotNumber: 'LOT-2026-GLU-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-n-9', testId: 'glucose', level: QCLevel.NORMAL, value: 5.57, timestamp: now - dayMs * 4, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-n-10', testId: 'glucose', level: QCLevel.NORMAL, value: 5.63, timestamp: now - dayMs * 3, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-n-11', testId: 'glucose', level: QCLevel.NORMAL, value: 6.08, timestamp: now - dayMs * 2, technician: 'KTV. Lê Văn C', lotNumber: 'LOT-2026-GLU-N', westgardRule: '1-3s', westgardStatus: 'violation', comment: 'Vi phạm 1-3s: Z = +3.43SD. Đã lập CAPA.', correctiveAction: 'Thay lọ thuốc thử mới, hiệu chuẩn lại máy.' },
  { id: 'g-n-12', testId: 'glucose', level: QCLevel.NORMAL, value: 5.61, timestamp: now - dayMs * 1, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-N', westgardRule: 'none', westgardStatus: 'passed', comment: 'Chạy lại sau CAPA: Đạt chuẩn' },
  { id: 'g-n-13', testId: 'glucose', level: QCLevel.NORMAL, value: 5.62, timestamp: now, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-N', westgardRule: 'none', westgardStatus: 'passed' },

  // Glucose - Low Level
  { id: 'g-l-1', testId: 'glucose', level: QCLevel.LOW, value: 3.52, timestamp: now - dayMs * 12, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-L', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-l-2', testId: 'glucose', level: QCLevel.LOW, value: 3.48, timestamp: now - dayMs * 11, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-L', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-l-3', testId: 'glucose', level: QCLevel.LOW, value: 3.51, timestamp: now - dayMs * 10, technician: 'KTV. Trần Thị B', lotNumber: 'LOT-2026-GLU-L', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-l-4', testId: 'glucose', level: QCLevel.LOW, value: 3.55, timestamp: now - dayMs * 9, technician: 'KTV. Trần Thị B', lotNumber: 'LOT-2026-GLU-L', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-l-5', testId: 'glucose', level: QCLevel.LOW, value: 3.49, timestamp: now - dayMs * 8, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-L', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-l-6', testId: 'glucose', level: QCLevel.LOW, value: 3.53, timestamp: now - dayMs * 7, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-L', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-l-7', testId: 'glucose', level: QCLevel.LOW, value: 3.52, timestamp: now - dayMs * 6, technician: 'KTV. Trần Thị B', lotNumber: 'LOT-2026-GLU-L', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-l-8', testId: 'glucose', level: QCLevel.LOW, value: 3.47, timestamp: now - dayMs * 5, technician: 'KTV. Trần Thị B', lotNumber: 'LOT-2026-GLU-L', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-l-9', testId: 'glucose', level: QCLevel.LOW, value: 3.50, timestamp: now - dayMs * 4, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-L', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-l-10', testId: 'glucose', level: QCLevel.LOW, value: 3.54, timestamp: now - dayMs * 3, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-L', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-l-11', testId: 'glucose', level: QCLevel.LOW, value: 3.51, timestamp: now - dayMs * 2, technician: 'KTV. Lê Văn C', lotNumber: 'LOT-2026-GLU-L', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-l-12', testId: 'glucose', level: QCLevel.LOW, value: 3.52, timestamp: now - dayMs * 1, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-L', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'g-l-13', testId: 'glucose', level: QCLevel.LOW, value: 3.50, timestamp: now, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-GLU-L', westgardRule: 'none', westgardStatus: 'passed' },

  // Cholesterol
  { id: 'chol-1', testId: 'cholesterol', level: QCLevel.NORMAL, value: 5.18, timestamp: now - dayMs * 2, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-LIP-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'chol-2', testId: 'cholesterol', level: QCLevel.NORMAL, value: 5.22, timestamp: now - dayMs * 1, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-LIP-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'chol-3', testId: 'cholesterol', level: QCLevel.NORMAL, value: 5.20, timestamp: now, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-LIP-N', westgardRule: 'none', westgardStatus: 'passed' },

  // AST sample points
  { id: 'ast-1', testId: 'ast', level: QCLevel.NORMAL, value: 44.5, timestamp: now - dayMs * 3, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-ENZ-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'ast-2', testId: 'ast', level: QCLevel.NORMAL, value: 45.2, timestamp: now - dayMs * 2, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-ENZ-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'ast-3', testId: 'ast', level: QCLevel.NORMAL, value: 45.8, timestamp: now - dayMs * 1, technician: 'KTV. Trần Thị B', lotNumber: 'LOT-2026-ENZ-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'ast-4', testId: 'ast', level: QCLevel.NORMAL, value: 44.9, timestamp: now, technician: 'KTV. Trần Thị B', lotNumber: 'LOT-2026-ENZ-N', westgardRule: 'none', westgardStatus: 'passed' },

  // Creatinine sample points
  { id: 'cre-1', testId: 'creatinine', level: QCLevel.NORMAL, value: 94.2, timestamp: now - dayMs * 3, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-REN-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'cre-2', testId: 'creatinine', level: QCLevel.NORMAL, value: 95.8, timestamp: now - dayMs * 2, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-REN-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'cre-3', testId: 'creatinine', level: QCLevel.NORMAL, value: 94.7, timestamp: now - dayMs * 1, technician: 'KTV. Trần Thị B', lotNumber: 'LOT-2026-REN-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'cre-4', testId: 'creatinine', level: QCLevel.NORMAL, value: 95.3, timestamp: now, technician: 'KTV. Trần Thị B', lotNumber: 'LOT-2026-REN-N', westgardRule: 'none', westgardStatus: 'passed' },

  // Albumin sample points
  { id: 'alb-1', testId: 'albumin', level: QCLevel.NORMAL, value: 41.8, timestamp: now - dayMs * 2, technician: 'KTV. Nguyễn Văn A', lotNumber: 'LOT-2026-PRO-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'alb-2', testId: 'albumin', level: QCLevel.NORMAL, value: 42.1, timestamp: now - dayMs * 1, technician: 'KTV. Trần Thị B', lotNumber: 'LOT-2026-PRO-N', westgardRule: 'none', westgardStatus: 'passed' },
  { id: 'alb-3', testId: 'albumin', level: QCLevel.NORMAL, value: 42.0, timestamp: now, technician: 'KTV. Trần Thị B', lotNumber: 'LOT-2026-PRO-N', westgardRule: 'none', westgardStatus: 'passed' }
];

export const INITIAL_CAPA_RECORDS: CAPARecord[] = [
  {
    id: 'capa-sample-1',
    code: 'CAPA-20260920-GLUC-842',
    timestamp: now - dayMs * 2,
    testId: 'glucose',
    testName: 'Glucose (Đường huyết)',
    unit: 'mmol/L',
    level: QCLevel.NORMAL,
    value: 6.08,
    zScore: 3.43,
    meanTarget: 5.6,
    sdTarget: 0.14,
    violatedRule: '1-3s',
    errorType: 'random',
    lotNumber: 'LOT-2026-GLU-N',
    analyzerName: 'Máy Hóa sinh 1',
    incidentDescription: 'Giá trị nội kiểm buổi sáng đạt 6.08 mmol/L, Z-score = +3.43SD. Vượt quá ngưỡng loại trừ 3SD (Vi phạm quy tắc Westgard 1_3s).',
    rootCauses: {
      man: 'Kỹ thuật viên hoàn nguyên mẫu QC đúng thể tích, không có lỗi bọt khí.',
      machine: 'Đầu kim hút mẫu và buồng ủ 37°C hoạt động bình thường, không tắc kim.',
      material: 'Phát hiện hộp thuốc thử R1 Glucose mở nắp đã 28 ngày, cạn đáy có hiện tượng kết tinh nhẹ.',
      method: 'Đường cong chuẩn Calib đã thực hiện cách đây 14 ngày.',
      milieu: 'Nhiệt độ phòng máy 23.5°C, độ ẩm 58% đạt tiêu chuẩn.'
    },
    immediateCorrection: 'Tạm dừng chạy mẫu bệnh nhân. Thay lọ thuốc thử Glucose mới, hiệu chuẩn lại máy (Calibration) và chạy lại mẫu chứng QC.',
    preventiveAction: 'Quy định ghi nhãn ngày mở nắp trên tất cả các hộp thuốc thử. Không sử dụng thuốc thử mở nắp quá 21 ngày.',
    retestValue: 5.61,
    retestZScore: 0.07,
    retestStatus: 'passed',
    patientSampleHoldStatus: 'released_after_capa',
    technician: 'KTV. Lê Văn C',
    approver: 'BS. CKII Trưởng Khoa',
    approvedAt: now - dayMs * 2 + 3600000,
    status: 'approved'
  }
];
