
import { LabTest, QCLevel, QCResult } from './types';

export const INITIAL_TESTS: LabTest[] = [
  {
    id: 'glucose',
    name: 'Glucose',
    unit: 'mmol/L',
    tea: 8,
    configs: {
      [QCLevel.LOW]: { mean: 3.5, sd: 0.12, bias: 2.0, eqaTarget: 3.6, eqaResult: 3.67 },
      [QCLevel.NORMAL]: { mean: 5.6, sd: 0.14, bias: 1.5, eqaTarget: 5.5, eqaResult: 5.61 },
      [QCLevel.HIGH]: { mean: 15.2, sd: 0.45, bias: 2.2, eqaTarget: 15.0, eqaResult: 15.33 },
    }
  },
  {
    id: 'cholesterol',
    name: 'Cholesterol toàn phần',
    unit: 'mmol/L',
    tea: 10,
    configs: {
      [QCLevel.LOW]: { mean: 3.1, sd: 0.08, bias: 1.5 },
      [QCLevel.NORMAL]: { mean: 5.2, sd: 0.15, bias: 1.2 },
      [QCLevel.HIGH]: { mean: 8.5, sd: 0.25, bias: 1.8 },
    }
  },
  {
    id: 'triglycerides',
    name: 'Triglycerides',
    unit: 'mmol/L',
    tea: 15,
    configs: {
      [QCLevel.LOW]: { mean: 0.8, sd: 0.04, bias: 2.0 },
      [QCLevel.NORMAL]: { mean: 1.7, sd: 0.07, bias: 1.8 },
      [QCLevel.HIGH]: { mean: 4.5, sd: 0.18, bias: 2.5 },
    }
  },
  {
    id: 'hdl',
    name: 'HDL Cholesterol',
    unit: 'mmol/L',
    tea: 20,
    configs: {
      [QCLevel.LOW]: { mean: 0.7, sd: 0.05, bias: 3.0 },
      [QCLevel.NORMAL]: { mean: 1.2, sd: 0.08, bias: 2.5 },
      [QCLevel.HIGH]: { mean: 2.5, sd: 0.15, bias: 3.5 },
    }
  },
  {
    id: 'ldl',
    name: 'LDL Cholesterol',
    unit: 'mmol/L',
    tea: 12,
    configs: {
      [QCLevel.LOW]: { mean: 1.5, sd: 0.06, bias: 2.5 },
      [QCLevel.NORMAL]: { mean: 2.8, sd: 0.12, bias: 2.0 },
      [QCLevel.HIGH]: { mean: 5.5, sd: 0.22, bias: 3.0 },
    }
  },
  {
    id: 'uric-acid',
    name: 'Acid Uric',
    unit: 'µmol/L',
    tea: 12,
    configs: {
      [QCLevel.LOW]: { mean: 180, sd: 6, bias: 1.8 },
      [QCLevel.NORMAL]: { mean: 350, sd: 12, bias: 1.5 },
      [QCLevel.HIGH]: { mean: 650, sd: 25, bias: 2.0 },
    }
  },
  {
    id: 'ast',
    name: 'GOT (AST)',
    unit: 'U/L',
    tea: 15,
    configs: {
      [QCLevel.LOW]: { mean: 25, sd: 1.2, bias: 2.5 },
      [QCLevel.NORMAL]: { mean: 45, sd: 1.8, bias: 2.0 },
      [QCLevel.HIGH]: { mean: 180, sd: 7.5, bias: 3.0 },
    }
  },
  {
    id: 'alt',
    name: 'GPT (ALT)',
    unit: 'U/L',
    tea: 15,
    configs: {
      [QCLevel.LOW]: { mean: 22, sd: 1.0, bias: 2.5 },
      [QCLevel.NORMAL]: { mean: 40, sd: 1.6, bias: 2.0 },
      [QCLevel.HIGH]: { mean: 165, sd: 6.5, bias: 3.0 },
    }
  },
  {
    id: 'albumin',
    name: 'Albumin',
    unit: 'g/L',
    tea: 8,
    configs: {
      [QCLevel.LOW]: { mean: 25, sd: 0.6, bias: 1.5 },
      [QCLevel.NORMAL]: { mean: 42, sd: 1.1, bias: 1.2 },
      [QCLevel.HIGH]: { mean: 55, sd: 1.5, bias: 1.8 },
    }
  },
  {
    id: 'protein',
    name: 'Protein toàn phần',
    unit: 'g/L',
    tea: 8,
    configs: {
      [QCLevel.LOW]: { mean: 45, sd: 1.2, bias: 1.5 },
      [QCLevel.NORMAL]: { mean: 70, sd: 1.8, bias: 1.2 },
      [QCLevel.HIGH]: { mean: 95, sd: 2.5, bias: 1.8 },
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
