
export enum QCLevel {
  LOW = 'Low',
  NORMAL = 'Normal',
  HIGH = 'High'
}

export interface QCConfig {
  mean: number;
  sd: number;
  bias: number; // Sai số hệ thống (%)
  eqaTarget?: number; // Giá trị mục tiêu EQA
  eqaResult?: number; // Kết quả Lab đo được EQA
}

export interface LabTest {
  id: string;
  name: string;
  unit: string;
  tea: number; // TEa theo CLIA 2024 (%)
  configs: Record<QCLevel, QCConfig>;
}

export interface QCResult {
  id: string;
  testId: string;
  level: QCLevel;
  value: number;
  timestamp: number;
  comment?: string;
  correctiveAction?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
