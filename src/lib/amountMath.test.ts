import { describe, it, expect } from 'vitest';
import {
  evaluateAmountExpression,
  formatDisplayAmount,
  sanitizeAmountInput,
} from './utils';

describe('evaluateAmountExpression', () => {
  it('evaluates basic addition and subtraction', () => {
    expect(evaluateAmountExpression('100+50')).toBe('150');
    expect(evaluateAmountExpression('100-30')).toBe('70');
    expect(evaluateAmountExpression('10+20-5')).toBe('25');
  });

  it('handles floating point math correctly', () => {
    expect(evaluateAmountExpression('12.5+3.5')).toBe('16');
    expect(evaluateAmountExpression('0.1+0.2')).toBe('0.3');
    expect(evaluateAmountExpression('10.55+2.333')).toBe('12.88');
  });

  it('strips trailing operators and dots before evaluation', () => {
    expect(evaluateAmountExpression('100+')).toBe('100');
    expect(evaluateAmountExpression('50-')).toBe('50');
    expect(evaluateAmountExpression('25.')).toBe('25');
  });

  it('handles negative result based on allowNegative flag', () => {
    expect(evaluateAmountExpression('10-50', false)).toBe('0');
    expect(evaluateAmountExpression('10-50', true)).toBe('-40');
  });

  it('returns original or safe fallback on invalid expressions', () => {
    expect(evaluateAmountExpression('')).toBe('');
    expect(evaluateAmountExpression('   ')).toBe('');
    expect(evaluateAmountExpression('abc')).toBe('abc');
    expect(evaluateAmountExpression('10++20')).toBe('10++20');
  });
});

describe('formatDisplayAmount', () => {
  it('formats numbers with thousand separators', () => {
    expect(formatDisplayAmount('1000')).toBe('1,000');
    expect(formatDisplayAmount('1000000')).toBe('1,000,000');
    expect(formatDisplayAmount('1234.56')).toBe('1,234.56');
  });

  it('formats expression numbers individually', () => {
    expect(formatDisplayAmount('1000+2500')).toBe('1,000+2,500');
    expect(formatDisplayAmount('10000-500')).toBe('10,000-500');
  });

  it('respects preserveEmpty option', () => {
    expect(formatDisplayAmount('', { preserveEmpty: true })).toBe('');
    expect(formatDisplayAmount('', { preserveEmpty: false })).toBe('0');
    expect(formatDisplayAmount('')).toBe('0');
  });

  it('handles negative numbers', () => {
    expect(formatDisplayAmount('-1000')).toBe('-1,000');
    expect(formatDisplayAmount('-')).toBe('-');
  });
});

describe('sanitizeAmountInput', () => {
  it('removes non-numeric characters except dots', () => {
    expect(sanitizeAmountInput('12a3b4')).toBe('1234');
    expect(sanitizeAmountInput('$100.50')).toBe('100.50');
  });

  it('limits decimals to 2 places', () => {
    expect(sanitizeAmountInput('10.12345')).toBe('10.12');
  });

  it('auto prepends 0 for leading dot', () => {
    expect(sanitizeAmountInput('.5')).toBe('0.5');
  });

  it('strips redundant leading zeros', () => {
    expect(sanitizeAmountInput('0050')).toBe('50');
    expect(sanitizeAmountInput('00')).toBe('0');
  });

  it('handles negative flag', () => {
    expect(sanitizeAmountInput('-100', { allowNegative: true })).toBe('-100');
    expect(sanitizeAmountInput('-100', { allowNegative: false })).toBe('100');
  });
});
