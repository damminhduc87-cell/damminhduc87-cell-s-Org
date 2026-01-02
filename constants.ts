
import { LabTest, QCLevel, QCResult } from './types';

export const INITIAL_TESTS: LabTest[] = [
  {
    id: 'glucose',
    name: 'Glucose (Máu)',
    unit: 'mmol/L',
    configs: {
      [QCLevel.LOW]: { mean: 3.5, sd: 0.1, unit: 'mmol/L' },
      [QCLevel.NORMAL]: { mean: 5.5, sd: 0.15, unit: 'mmol/L' },
      [QCLevel.HIGH]: { mean: 15.0, sd: 0.4, unit: 'mmol/L' },
    }
  },
  {
    id: 'creatinine',
    name: 'Creatinine',
    unit: 'µmol/L',
    configs: {
      [QCLevel.LOW]: { mean: 45, sd: 2, unit: 'µmol/L' },
      [QCLevel.NORMAL]: { mean: 80, sd: 4, unit: 'µmol/L' },
      [QCLevel.HIGH]: { mean: 350, sd: 15, unit: 'µmol/L' },
    }
  }
];

export const MOCK_RESULTS: QCResult[] = [
  { id: '1', testId: 'glucose', level: QCLevel.NORMAL, value: 5.4, timestamp: Date.now() - 86400000 * 5 },
  { id: '2', testId: 'glucose', level: QCLevel.NORMAL, value: 5.6, timestamp: Date.now() - 86400000 * 4 },
  { id: '3', testId: 'glucose', level: QCLevel.NORMAL, value: 5.5, timestamp: Date.now() - 86400000 * 3 },
  { id: '4', testId: 'glucose', level: QCLevel.NORMAL, value: 5.9, timestamp: Date.now() - 86400000 * 2 },
  { id: '5', testId: 'glucose', level: QCLevel.NORMAL, value: 5.3, timestamp: Date.now() - 86400000 * 1 },
];
