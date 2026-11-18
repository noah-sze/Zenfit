import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SectionCardProps {
  /** 卡片內嵌表頭標題 */
  title: ReactNode;
  /** 表頭右側操作區（例如切換膠囊、新增按鈕） */
  action?: ReactNode;
  /** 卡片內容列（預設以 divide-y divide-border 分隔） */
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * 單一真理源：具內嵌灰底表頭之扁平卡片容器
 * 將區塊標題與右側操作融入卡片頂部表頭（與瀏覽器列表表頭 h-10 bg-muted/40 一致）。
 */
export function SectionCard({
  title,
  action,
  children,
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        'border border-border rounded-lg overflow-hidden bg-card text-card-foreground',
        className
      )}
    >
      <div className="h-10 px-4 bg-muted/40 border-b border-border flex items-center justify-between gap-2 text-xs font-mono text-muted-foreground shrink-0">
        <span className="text-xs uppercase tracking-wider font-medium text-foreground truncate">
          {title}
        </span>
        {action && <div className="flex items-center shrink-0">{action}</div>}
      </div>
      <div className={cn('divide-y divide-border', bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
