import * as React from 'react';
import { cn } from '@/lib/utils';

export interface MetricValueProps {
  /** 數值本體（使用等寬數字 font-mono tabular-nums） */
  value: React.ReactNode;
  /** 計量單位（使用比例字體 font-sans 與 2px 微間距，對齊 Apple Health 排版） */
  unit?: React.ReactNode;
  className?: string;
  valueClassName?: string;
  unitClassName?: string;
}

/**
 * 領域基礎原子元件：數值與單位精密組合（Option A）
 * 數值保持 JetBrains Mono 等寬對齊，單位使用比例字體並以 2px (ml-0.5) 隔開，
 * 徹底消除等寬空白字元過寬與窄容器折行問題。
 */
export function MetricValue({
  value,
  unit,
  className,
  valueClassName,
  unitClassName,
}: MetricValueProps) {
  const hasUnit = unit !== undefined && unit !== null && unit !== '';

  return (
    <span className={cn('inline-flex items-baseline whitespace-nowrap', className)}>
      <span className={cn('font-mono tabular-nums', valueClassName)}>{value}</span>
      {hasUnit && (
        <span className={cn('font-sans font-normal text-muted-foreground ml-0.5', unitClassName)}>
          {unit}
        </span>
      )}
    </span>
  );
}
