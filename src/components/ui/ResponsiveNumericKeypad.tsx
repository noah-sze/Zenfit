import * as React from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { X, Delete, Check, Equal, ChevronDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { cn, evaluateAmountExpression, formatDisplayAmount } from "@/lib/utils"
import { triggerHaptic } from "@/lib/haptics"

export interface ResponsiveNumericKeypadProps {
  /** 是否開啟鍵盤 */
  open: boolean
  /** 開啟/關閉狀態改變回調 */
  onOpenChange: (open: boolean) => void

  /** 錨定的 DOM 元素 (按鈕或輸入框)，用於打開時自動平滑滾動 */
  anchorEl?: HTMLElement | null

  /** 數值與膠囊專屬樣式 (例如 'text-calories', 'text-protein') */
  valueClassName?: string
  /** 項目標題專屬樣式 (例如 'text-calories', 'text-protein'，若未指定則預設採用 valueClassName) */
  titleClassName?: string

  /** 欄位標題 (例如「食用份量」、「熱量」) */
  title: string
  /** 當前數值 */
  value?: number | string
  /** 單位 (例如 'g', 'ml', 'kcal') */
  unit?: string
  /** 可選的單位列表 (若提供多個，頂部顯示單位切換膠囊) */
  allowedUnits?: string[]
  /** 單位切換回調 */
  onUnitChange?: (unit: string) => void

  /** 是否允許輸入小數點 (預設: true) */
  allowDecimals?: boolean
  /** 最大小數位數 (預設: 2) */
  maxDecimals?: number
  /** 是否允許負數 (預設: false) */
  allowNegative?: boolean

  /** 確認回調 */
  onConfirm: (value: number, unit: string) => void
  /** 取消/關閉回調 */
  onCancel?: () => void

  /** 即時數值變更回調 (用於原位雙向鏡像預覽) */
  onLiveChange?: (value: number, unit: string) => void
  /** 自定義鍵盤正上方上下文預覽行渲染插槽 (若未提供則預設渲染標準高亮 Usage List 行) */
  renderContextRow?: (value: string, unit: string) => React.ReactNode

  className?: string
}

function getLastOperand(val: string) {
  const prefix = val.startsWith('+') || val.startsWith('-') ? val[0] : ''
  const rest = val.slice(prefix.length)
  const lastOpIndex = Math.max(rest.lastIndexOf('+'), rest.lastIndexOf('-'))
  if (lastOpIndex === -1) {
    return {
      leadingText: prefix,
      operand: rest,
    }
  }
  return {
    leadingText: prefix + rest.slice(0, lastOpIndex + 1),
    operand: rest.slice(lastOpIndex + 1),
  }
}

/**
 * 響應式精密數字鍵盤輸入器 (Responsive Numeric Keypad)
 * - 全端 (桌面端與手機端) 統一沿用一致的高質感輸入邏輯：
 *   1. 底部居中吸附 (Bottom Docked Keypad, max-w-lg)
 *   2. 正上方原位上下文高亮條 (Spotlight Context Bar，1:1 對齊列表行膠囊)
 *   3. 雙向即時鏡像聯動 (Live Sync) 與自動滾動避讓 (Auto-Scroll)
 *   4. 放棄回滾初始值，確認正式提交
 */
export function ResponsiveNumericKeypad({
  open,
  onOpenChange,
  anchorEl,
  valueClassName,
  titleClassName,
  title,
  value = 0,
  unit = '',
  allowedUnits,
  onUnitChange,
  allowDecimals = true,
  maxDecimals = 2,
  allowNegative = false,
  onConfirm,
  onCancel,
  onLiveChange,
  renderContextRow,
  className,
}: ResponsiveNumericKeypadProps) {
  const { t } = useTranslation()

  // 內部輸入狀態 (字串形式，便於處理小數點與算式)
  const [internalValue, setInternalValue] = React.useState<string>('')
  const [currentUnit, setCurrentUnit] = React.useState<string>(unit)
  const keypadRef = React.useRef<HTMLDivElement>(null)

  // 當彈窗打開或數值/單位改變時，同步初始狀態
  React.useEffect(() => {
    if (open) {
      const initNum = typeof value === 'number' ? value : parseFloat(String(value)) || 0
      setInternalValue(initNum > 0 ? String(initNum) : '')
      setCurrentUnit(unit)
    }
  }, [open, value, unit])

  // 打開時自動將錨定元素 (列表行) 平滑滾動至視窗最佳可視區域
  React.useEffect(() => {
    if (open && anchorEl) {
      const timer = setTimeout(() => {
        try {
          const rowEl = anchorEl.closest('[data-keypad-row], .h-10, [role="button"]') || anchorEl
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } catch {
          // Ignore
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open, anchorEl])

  // 即時數值雙向鏡像同步：敲擊數字時即時更新原位列表行
  React.useEffect(() => {
    if (!open) return
    let finalStr = internalValue
    if (/[+-]/.test(internalValue.replace(/^[+-]/, ''))) {
      finalStr = evaluateAmountExpression(internalValue, allowNegative)
    }
    const num = parseFloat(finalStr) || 0
    onLiveChange?.(num, currentUnit)
  }, [internalValue, currentUnit, open, onLiveChange, allowNegative])

  const isExpression = React.useMemo(() => {
    return /[+-]/.test(internalValue.replace(/^[+-]/, ''))
  }, [internalValue])

  const handleUnitSelect = (nextU: string) => {
    triggerHaptic('selection')
    setCurrentUnit(nextU)
    onUnitChange?.(nextU)
  }

  const handleKey = (key: string) => {
    if (key === 'C') {
      triggerHaptic('light')
      setInternalValue('')
      return
    }

    if (key === 'DEL') {
      triggerHaptic('light')
      if (!internalValue) return
      setInternalValue(internalValue.slice(0, -1))
      return
    }

    if (key === '+' || key === '-') {
      if (internalValue === '') {
        if (key === '-' && allowNegative) {
          triggerHaptic('light')
          setInternalValue('-')
        } else {
          triggerHaptic('warning')
        }
        return
      }

      // 替換末尾運算符或小數點
      if (internalValue.endsWith('+') || internalValue.endsWith('-') || internalValue.endsWith('.')) {
        triggerHaptic('light')
        setInternalValue(internalValue.slice(0, -1) + key)
        return
      }

      // 若已是表達式，先計算再追加運算符
      if (isExpression) {
        triggerHaptic('light')
        const evaluated = evaluateAmountExpression(internalValue, allowNegative)
        setInternalValue(evaluated + key)
        return
      }

      triggerHaptic('light')
      setInternalValue(internalValue + key)
      return
    }

    if (key === '.') {
      if (!allowDecimals) {
        triggerHaptic('warning')
        return
      }
      const { leadingText, operand } = getLastOperand(internalValue)
      if (!operand) {
        triggerHaptic('light')
        setInternalValue(leadingText + '0.')
        return
      }
      if (operand.includes('.')) {
        triggerHaptic('warning')
        return
      }
      triggerHaptic('light')
      setInternalValue(internalValue + '.')
      return
    }

    if (key === '0') {
      const { operand } = getLastOperand(internalValue)
      if (operand === '0') {
        triggerHaptic('warning')
        return
      }
      if (operand.includes('.')) {
        const dec = operand.split('.')[1] || ''
        if (dec.length >= maxDecimals) {
          triggerHaptic('warning')
          return
        }
      }
      triggerHaptic('light')
      setInternalValue(internalValue + '0')
      return
    }

    if (key === '00') {
      const { leadingText, operand } = getLastOperand(internalValue)
      if (!operand || operand === '0') {
        triggerHaptic('light')
        setInternalValue(leadingText + '0')
        return
      }
      if (operand.includes('.')) {
        const dec = operand.split('.')[1] || ''
        if (dec.length >= maxDecimals) {
          triggerHaptic('warning')
          return
        }
        triggerHaptic('light')
        if (dec.length === 1 && maxDecimals >= 2) {
          setInternalValue(internalValue + '0')
        } else if (dec.length === 0) {
          setInternalValue(internalValue + '00')
        } else {
          triggerHaptic('warning')
        }
        return
      }
      triggerHaptic('light')
      setInternalValue(internalValue + '00')
      return
    }

    // 數字 1 ~ 9
    if (key >= '1' && key <= '9') {
      const { leadingText, operand } = getLastOperand(internalValue)
      if (operand === '0') {
        triggerHaptic('light')
        setInternalValue(leadingText + key)
        return
      }
      if (operand.includes('.')) {
        const dec = operand.split('.')[1] || ''
        if (dec.length >= maxDecimals) {
          triggerHaptic('warning')
          return
        }
      }
      triggerHaptic('light')
      setInternalValue(internalValue + key)
      return
    }

    // 完成或計算 (=)
    if (key === '=') {
      if (isExpression) {
        triggerHaptic('light')
        const evaluated = evaluateAmountExpression(internalValue, allowNegative)
        setInternalValue(evaluated)
      } else {
        handleConfirmAction()
      }
    }
  }

  const handleConfirmAction = () => {
    let finalStr = internalValue
    if (isExpression) {
      finalStr = evaluateAmountExpression(internalValue, allowNegative)
    }
    const num = parseFloat(finalStr) || 0
    triggerHaptic('success')
    onConfirm(num, currentUnit)
    onOpenChange(false)
  }

  const handleCloseAction = () => {
    triggerHaptic('light')
    onCancel?.()
    onOpenChange(false)
  }

  // 鍵盤物理快捷鍵監聽 (Enter / Escape)
  React.useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleConfirmAction()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCloseAction()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, internalValue, isExpression, currentUnit])

  if (!open || typeof document === 'undefined') return null

  const displayVal = formatDisplayAmount(internalValue, { preserveEmpty: true })

  const btnBaseClass =
    "h-10 text-base font-mono font-medium rounded-lg bg-muted/60 text-foreground hover:bg-muted border border-border/40 active:bg-foreground active:text-background active:border-foreground transition-transform duration-75 active:scale-[0.95] select-none cursor-pointer flex items-center justify-center shadow-none outline-none"

  // 方案 1: 全端統一渲染一體化精密卡片 (Unified Precision Modal, 寬度 350px 對齊 Dialog)
  return createPortal(
    <div className="fixed inset-0 z-[80] pointer-events-auto flex flex-col justify-end">
      {/* 半透明毛玻璃遮罩層：點擊安全回滾放棄並收起 */}
      <div
        className="fixed inset-0 bg-overlay backdrop-blur-[2px] cursor-pointer"
        onClick={handleCloseAction}
      />

      {/* 懸浮容器 (全屏水平居中，最大寬度 350px，底部懸浮留白) */}
      <div className="relative z-[81] pointer-events-auto w-full max-w-[350px] mx-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] mb-3 sm:mb-6">
        <div
          ref={keypadRef}
          className={cn(
            "w-full bg-card text-card-foreground border border-border rounded-[18px] p-3.5 flex flex-col gap-2.5 select-none shadow-none",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header 列: 左側圓形 ✕ 膠囊，中間欄位標題 (絕對幾何居中)，右側單位切換 */}
          <div className="relative flex items-center justify-between min-h-7">
            {/* 左側圓形 ✕ 膠囊：1:1 對齊 Dialog 方案 D */}
            <button
              type="button"
              onClick={handleCloseAction}
              className="size-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground hover:bg-border transition-all cursor-pointer shrink-0 active:scale-92 z-10"
              title={t('keypad.collapse')}
            >
              <X className="size-3.5 stroke-[2.2]" />
            </button>

            {/* 中間欄位標題：絕對水平居中，永遠鎖定在卡片中心線，不受兩側寬度增減影響 */}
            <div className="absolute inset-x-16 flex items-center justify-center pointer-events-none">
              <span
                className={cn(
                  "text-xs font-semibold tracking-tight whitespace-nowrap text-center truncate pointer-events-auto",
                  titleClassName || valueClassName || "text-foreground"
                )}
              >
                {title}
              </span>
            </div>

            {/* 右側單位切換膠囊 (若無單位則渲染透明佔位保持佈局) */}
            <div className="shrink-0 flex items-center justify-end min-w-7 z-10 ml-auto">
              {allowedUnits && allowedUnits.length > 1 ? (
                <Select
                  value={currentUnit}
                  onValueChange={(val) => {
                    if (val) handleUnitSelect(val)
                  }}
                >
                  <SelectTrigger
                    size="custom"
                    hideIcon={true}
                    className="h-6 px-2.5 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1 text-foreground transition-colors cursor-pointer select-none shadow-none active:scale-95"
                  >
                    <span>{currentUnit}</span>
                    <ChevronDown className="size-2.5 text-muted-foreground/60 shrink-0" />
                  </SelectTrigger>
                  <SelectContent
                    align="end"
                    positionerClassName="z-[95]"
                    backdropClassName="z-[90]"
                    className="min-w-20 z-[95] p-1 font-mono text-xs"
                  >
                    {allowedUnits.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : currentUnit ? (
                <div className="h-6 px-2.5 rounded-full border border-border/80 bg-background font-mono text-xs flex items-center text-muted-foreground select-none shadow-none">
                  {currentUnit}
                </div>
              ) : (
                <div className="size-7" />
              )}
            </div>
          </div>

          {/* 嵌入式精密展示屏 */}
          {renderContextRow ? (
            renderContextRow(displayVal || '0', currentUnit)
          ) : (
            <div className="h-10 px-3 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-between">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider select-none">
                {t('keypad.input')}
              </span>
              <div className="flex items-baseline gap-1 font-mono">
                <span
                  className={cn(
                    "text-xl font-bold tracking-tight text-foreground",
                    valueClassName
                  )}
                >
                  {displayVal || '0'}
                </span>
                {currentUnit && (
                  <span className="text-xs text-muted-foreground font-medium">
                    {currentUnit}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 精密緊湊 4x4 鍵盤 (按鍵 40px, 間距 6px) */}
          <div className="grid grid-cols-4 gap-1.5">
            {/* Row 1 */}
            <button
              type="button"
              onClick={() => handleKey('1')}
              className={btnBaseClass}
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handleKey('2')}
              className={btnBaseClass}
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handleKey('3')}
              className={btnBaseClass}
            >
              3
            </button>
            <button
              type="button"
              onClick={() => handleKey('DEL')}
              className="h-10 rounded-lg bg-muted/60 text-destructive hover:bg-destructive/10 hover:text-destructive border border-border/40 active:bg-foreground active:text-background active:border-foreground transition-transform duration-75 active:scale-[0.95] select-none cursor-pointer flex items-center justify-center shadow-none"
              title={t('keypad.backspace')}
            >
              <Delete className="size-4" />
            </button>

            {/* Row 2 */}
            <button
              type="button"
              onClick={() => handleKey('4')}
              className={btnBaseClass}
            >
              4
            </button>
            <button
              type="button"
              onClick={() => handleKey('5')}
              className={btnBaseClass}
            >
              5
            </button>
            <button
              type="button"
              onClick={() => handleKey('6')}
              className={btnBaseClass}
            >
              6
            </button>
            <button
              type="button"
              onClick={() => handleKey('-')}
              className={cn(btnBaseClass, "font-semibold")}
            >
              -
            </button>

            {/* Row 3 */}
            <button
              type="button"
              onClick={() => handleKey('7')}
              className={btnBaseClass}
            >
              7
            </button>
            <button
              type="button"
              onClick={() => handleKey('8')}
              className={btnBaseClass}
            >
              8
            </button>
            <button
              type="button"
              onClick={() => handleKey('9')}
              className={btnBaseClass}
            >
              9
            </button>
            <button
              type="button"
              onClick={() => handleKey('+')}
              className={cn(btnBaseClass, "font-semibold")}
            >
              +
            </button>

            {/* Row 4 */}
            <button
              type="button"
              onClick={() => handleKey('.')}
              disabled={!allowDecimals}
              className={cn(
                btnBaseClass,
                !allowDecimals && "opacity-30 cursor-not-allowed active:scale-100"
              )}
            >
              .
            </button>
            <button
              type="button"
              onClick={() => handleKey('0')}
              className={btnBaseClass}
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKey('C')}
              className={cn(
                btnBaseClass,
                "text-sm font-mono font-semibold text-muted-foreground hover:text-foreground"
              )}
              title={t('keypad.clear')}
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleKey('=')}
              className={cn(
                "h-10 rounded-lg flex items-center justify-center transition-transform duration-75 active:scale-[0.95] border cursor-pointer shadow-none select-none",
                isExpression
                  ? "bg-muted/60 text-foreground hover:bg-muted border-border/40 font-bold active:bg-foreground active:text-background active:border-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 border-primary font-bold active:bg-primary/80"
              )}
              title={isExpression ? t('keypad.calculate') : t('keypad.done')}
            >
              {isExpression ? (
                <Equal className="size-4" />
              ) : (
                <Check
                  className="size-4 stroke-[2.5]"
                  style={{
                    color: 'var(--primary-foreground)',
                    stroke: 'var(--primary-foreground)',
                  }}
                />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
