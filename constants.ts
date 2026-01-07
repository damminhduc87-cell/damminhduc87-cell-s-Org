
import { LabTest, QCLevel, QCResult } from './types';

export const INITIAL_TESTS: LabTest[] = [
  {
    id: 'glucose',
    name: 'Glucose (Máu)',
    unit: 'mmol/L',
    tea: 10,
    configs: {
      [QCLevel.LOW]: { mean: 3.5, sd: 0.12, bias: 1.5 },
      [QCLevel.NORMAL]: { mean: 5.6, sd: 0.18, bias: 1.2 },
      [QCLevel.HIGH]: { mean: 15.2, sd: 0.45, bias: 2.0 },
    }
  },
  {
    id: 'ast',
    name: 'AST (GOT)',
    unit: 'U/L',
    tea: 15,
    configs: {
      [QCLevel.LOW]: { mean: 25, sd: 1.2, bias: 2.5 },
      [QCLevel.NORMAL]: { mean: 45, sd: 2.1, bias: 2.0 },
      [QCLevel.HIGH]: { mean: 180, sd: 8.5, bias: 3.2 },
    }
  },
  {
    id: 'alt',
    name: 'ALT (GPT)',
    unit: 'U/L',
    tea: 15,
    configs: {
      [QCLevel.LOW]: { mean: 22, sd: 1.1, bias: 2.2 },
      [QCLevel.NORMAL]: { mean: 40, sd: 2.0, bias: 1.8 },
      [QCLevel.HIGH]: { mean: 165, sd: 7.8, bias: 2.9 },
    }
  },
  {
    id: 'creatinine',
    name: 'Creatinine',
    unit: 'µmol/L',
    tea: 12,
    configs: {
      [QCLevel.LOW]: { mean: 55, sd: 2.5, bias: 1.0 },
      [QCLevel.NORMAL]: { mean: 90, sd: 4.2, bias: 1.5 },
      [QCLevel.HIGH]: { mean: 450, sd: 18.0, bias: 2.5 },
    }
  },
  {
    id: 'urea',
    name: 'Urea',
    unit: 'mmol/L',
    tea: 9,
    configs: {
      [QCLevel.LOW]: { mean: 3.2, sd: 0.15, bias: 1.2 },
      [QCLevel.NORMAL]: { mean: 7.5, sd: 0.35, bias: 1.4 },
      [QCLevel.HIGH]: { mean: 25.0, sd: 1.10, bias: 2.1 },
    }
  },
  {
    id: 'cholesterol',
    name: 'Cholesterol TP',
    unit: 'mmol/L',
    tea: 10,
    configs: {
      [QCLevel.LOW]: { mean: 3.1, sd: 0.14, bias: 1.1 },
      [QCLevel.NORMAL]: { mean: 5.2, sd: 0.22, bias: 1.3 },
      [QCLevel.HIGH]: { mean: 8.5, sd: 0.38, bias: 1.9 },
    }
  },
  {
    id: 'sodium',
    name: 'Natri (Na+)',
    unit: 'mmol/L',
    tea: 4,
    configs: {
      [QCLevel.LOW]: { mean: 125, sd: 1.5, bias: 0.5 },
      [QCLevel.NORMAL]: { mean: 140, sd: 1.8, bias: 0.4 },
      [QCLevel.HIGH]: { mean: 160, sd: 2.1, bias: 0.6 },
    }
  },
  {
    id: 'potassium',
    name: 'Kali (K+)',
    unit: 'mmol/L',
    tea: 5.8,
    configs: {
      [QCLevel.LOW]: { mean: 2.8, sd: 0.08, bias: 0.9 },
      [QCLevel.NORMAL]: { mean: 4.5, sd: 0.12, bias: 0.8 },
      [QCLevel.HIGH]: { mean: 7.2, sd: 0.22, bias: 1.1 },
    }
  }
];

export const MOCK_RESULTS: QCResult[] = [
  { id: '1', testId: 'glucose', level: QCLevel.NORMAL, value: 5.5, timestamp: Date.now() - 86400000 * 4 },
  { id: '2', testId: 'glucose', level: QCLevel.NORMAL, value: 5.8, timestamp: Date.now() - 86400000 * 3 },
  { id: '3', testId: 'glucose', level: QCLevel.NORMAL, value: 5.4, timestamp: Date.now() - 86400000 * 2 },
  { id: '4', testId: 'glucose', level: QCLevel.NORMAL, value: 5.65, timestamp: Date.now() - 86400000 * 1 },
  { id: '5', testId: 'glucose', level: QCLevel.NORMAL, value: 5.6, timestamp: Date.now() },
];
