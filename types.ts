export enum QCLevel {
  LOW = 'Low',
  NORMAL = 'Normal',
  HIGH = 'High'
}

export type WestgardRuleType = '1-2s' | '1-3s' | '2-2s' | 'R-4s' | '4-1s' | '10-x' | 'none';
export type WestgardStatusType = 'passed' | 'warning' | 'violation';
export type WestgardErrorType = 'random' | 'systematic' | 'warning' | 'none';

export interface WestgardEvaluation {
  status: WestgardStatusType;
  rule: WestgardRuleType;
  errorType: WestgardErrorType;
  description: string;
  recommendedAction: string;
  zScore: number;
  isRunRejected: boolean;
}

export interface QCLot {
  id: string;
  testId: string;
  level: QCLevel;
  lotNumber: string;        // Số lô (Bắt buộc theo QĐ 2429)
  expirationDate: string;   // Hạn dùng
  openDate?: string;        // Ngày mở nắp
  manufacturer?: string;    // Hãng sản xuất
  mean: number;             // Mean của lô
  sd: number;               // SD của lô
  unit: string;
  isActive: boolean;
}

export interface QCConfig {
  mean: number;
  sd: number;
  bias: number; // Sai số hệ thống (%)
  eqaTarget?: number; // Giá trị mục tiêu EQA
  eqaResult?: number; // Kết quả Lab đo được EQA
  currentLot?: string;
}

export interface LabTest {
  id: string;
  name: string;
  unit: string;
  tea: number; // TEa theo CLIA 2024 (%)
  analyzerName?: string; // Tên máy xét nghiệm
  configs: Record<QCLevel, QCConfig>;
  lots?: QCLot[];
}

export interface QCResult {
  id: string;
  testId: string;
  level: QCLevel;
  value: number;
  timestamp: number;
  lotNumber?: string;
  technician?: string;       // Kỹ thuật viên chạy máy
  approver?: string;         // Người kiểm tra / phê duyệt
  zScore?: number;           // SD Index
  westgardRule?: WestgardRuleType;
  westgardStatus?: WestgardStatusType;
  comment?: string;
  correctiveAction?: string; // Tóm tắt hành động
  capaId?: string;           // Mã liên kết biên bản CAPA nếu có vi phạm
}

export interface RootCauseChecklist {
  man: string;      // Con người: pha mẫu, kỹ thuật pipet, nhầm lẫn vị trí
  machine: string;  // Thiết bị: kim hút, bóng đèn, nhiệt độ buồng ủ, rửa cuvet
  material: string; // Hóa chất: lô thuốc thử, dung dịch chuẩn, hạn dùng, bảo quản
  method: string;   // Phương pháp: quy trình calib, thông số kỹ thuật máy
  milieu: string;   // Môi trường: nguồn điện, nhiệt độ phòng lab, độ ẩm
}

export interface CAPARecord {
  id: string;
  code: string;              // Số biên bản: CAPA-YYYYMMDD-XXX
  timestamp: number;
  testId: string;
  testName: string;
  unit: string;
  level: QCLevel;
  value: number;
  zScore: number;
  meanTarget: number;
  sdTarget: number;
  violatedRule: WestgardRuleType;
  errorType: WestgardErrorType;
  lotNumber: string;
  analyzerName: string;
  incidentDescription: string;
  rootCauses: RootCauseChecklist;
  immediateCorrection: string;   // Khắc phục tức thời
  preventiveAction: string;      // Phòng ngừa tái diễn
  retestValue?: number;          // Kết quả đo lại
  retestZScore?: number;
  retestStatus?: 'passed' | 'failed' | 'pending';
  patientSampleHoldStatus: 'held' | 'released_after_capa' | 'no_impact';
  technician: string;            // Người lập biên bản (KTV)
  approver?: string;             // Người phê duyệt (Trưởng khoa / QLCL)
  approvedAt?: number;
  status: 'draft' | 'submitted' | 'approved';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  sources?: string[];
}
