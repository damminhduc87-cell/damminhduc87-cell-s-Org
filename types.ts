
export enum QCLevel {
  LOW = 'Low',
  NORMAL = 'Normal',
  HIGH = 'High'
}

export interface QCConfig {
  mean: number;
  sd: number;
  unit: string;
}

export interface LabTest {
  id: string;
  name: string;
  unit: string;
  configs: Record<QCLevel, QCConfig>;
}

export interface QCResult {
  id: string;
  testId: string;
  level: QCLevel;
  value: number;
  timestamp: number;
  comment?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
