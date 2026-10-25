import * as React from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

import {
  clampAndStep,
  calculateFillPercentage,
  calculateValueFromBottomDist,
  isUnitDisabled,
  resolveActiveUnit,
  calculateElasticMax,
} from "@/utils/elevationMath"

export type LiquidPickerUnit = 'g' | 'ml' | 'kg' | 'oz' | 'lb' | string

export interface LiquidElevationPickerProps {
  /** 是否開啟對話框 (受控) */
  open?: boolean
  /** 對話框開啟/關閉狀態改變回調 */
  onOpenChange?: (open: boolean) => void

  /** 當前數值 (受控) */
  value?: number
  /** 預設數值 (非受控) */
  defaultValue?: number
  /** 最小值 (預設: 0) */
  min?: number
  /** 最大值 (預設: 200) */
  max?: number
  /** 步進值 (預設: 1) */
  step?: number

  /** 支援的單位選項清單，例如: ['g', 'ml']、['g', 'kg'] 或 ['g'] */
  allowedUnits?: LiquidPickerUnit[]
  /** 禁用/反灰的單位清單 (例如原型固體食材鎖定克重時傳入 ['ml']) */
  disabledUnits?: LiquidPickerUnit[]
  /** 當前選中的單位 (受控) */
  unit?: LiquidPickerUnit
  /** 預設選中的單位 (非受控，預設為 allowedUnits[0] 或 'g') */
  defaultUnit?: LiquidPickerUnit
  /** 單位切換回調 */
  onUnitChange?: (unit: LiquidPickerUnit) => void

  /** 對話框標題 (預設為「份量」或 i18n key) */
  title?: string
  /** 次級提示文案 (例如:「原型固體食材已鎖定克重」) */
  hint?: string

  /** 點擊確認回調 */
  onConfirm?: (value: number, unit: LiquidPickerUnit) => void
  /** 點擊取消回調 */
  onCancel?: () => void

  /** 自定義觸發節點 (若提供則作為 DialogTrigger) */
  trigger?: React.ReactNode
  /** 自定義 DialogContent 類名 */
  className?: string
  /** 自定義遮罩層類名 (例如多層彈窗疊加時傳入 z-[80]) */
  overlayClassName?: string
}

/**
 * 方案 2A: 液柱升降規 (Liquid Elevation Picker)
 * 核心心智模型：底座為 0 (或 min)，向上滑動/滾動為注入充满 (+)，向下滑動/滾動為排空降低 (-)
 */
export function LiquidElevationPicker({
  open,
  onOpenChange,
  value: controlledValue,
  defaultValue = 50,
  min = 0,
  max = 200,
  step = 1,
  allowedUnits = ['g'],
  disabledUnits = [],
  unit: controlledUnit,
  defaultUnit,
  onUnitChange,
  title,
  hint,
  onConfirm,
  onCancel,
  trigger,
  className,
  overlayClassName,
}: LiquidElevationPickerProps) {
  const { t } = useTranslation()

  // 初始預設量程上限 (縮容時的最低極限保護)
  const initialMax = max || 200

  // 內部暫存數值狀態 (彈窗內的操作始終反映在此狀態上)
  const [internalValue, setInternalValue] = React.useState<number>(
    controlledValue !== undefined ? controlledValue : defaultValue
  )

  // 內部暫存單位狀態
  const initialUnit = resolveActiveUnit(allowedUnits, controlledUnit || defaultUnit, disabledUnits)
  const [internalUnit, setInternalUnit] = React.useState<LiquidPickerUnit>(initialUnit)

  // 追蹤彈窗開關與外部值前序狀態，確保僅在「開啟瞬間」或「外部顯式變更」時重設暫存狀態
  const prevOpenRef = React.useRef(false)
  const prevControlledValRef = React.useRef(controlledValue)

  // 動態彈性上限狀態 (支援擴容與縮容，下限保底為 initialMax)
  const [currentMax, setCurrentMax] = React.useState<number>(() => {
    const initVal = controlledValue !== undefined ? controlledValue : defaultValue
    return calculateElasticMax(initVal, initialMax, initialMax)
  })

  React.useEffect(() => {
    if (open && !prevOpenRef.current) {
      const initVal = controlledValue !== undefined ? controlledValue : defaultValue
      setInternalValue(initVal)
      const initUnit = resolveActiveUnit(allowedUnits, controlledUnit || defaultUnit, disabledUnits)
      setInternalUnit(initUnit)
      const initMax = calculateElasticMax(initVal, initialMax, initialMax)
      setCurrentMax(initMax)
    } else if (open && controlledValue !== undefined && controlledValue !== prevControlledValRef.current) {
      setInternalValue(controlledValue)
      const nextMax = calculateElasticMax(controlledValue, currentMax, initialMax)
      setCurrentMax(nextMax)
    }
    prevOpenRef.current = !!open
    prevControlledValRef.current = controlledValue
  }, [open, controlledValue, defaultValue, controlledUnit, defaultUnit, allowedUnits, disabledUnits, initialMax, currentMax])

  // 彈窗內部顯示與渲染一律以 internalValue / internalUnit 為準
  const currentValue = internalValue
  const currentUnit = internalUnit

  // 數值更新 (受限於當前動態上限 currentMax)
  const handleValueChange = React.useCallback(
    (nextVal: number) => {
      const finalVal = clampAndStep(nextVal, min, currentMax, step)
      setInternalValue(finalVal)
    },
    [min, currentMax, step]
  )

  // 單位切換
  const handleSelectUnit = (u: LiquidPickerUnit) => {
    if (isUnitDisabled(u, disabledUnits)) return
    setInternalUnit(u)
    onUnitChange?.(u)
  }

  // 微調按鈕點擊更新
  const handleStepClick = (delta: number) => {
    const nextVal = clampAndStep(currentValue + delta, min, currentMax, step)
    setInternalValue(nextVal)

    // 結算動態量程 (上升擴容 / 下降縮容，下限保底 initialMax)
    const nextMax = calculateElasticMax(nextVal, currentMax, initialMax)
    if (nextMax !== currentMax) {
      setCurrentMax(nextMax)
    }
  }

  // 計算液柱高度百分比 (底為 min, 頂為 currentMax)
  const fillPercentage = calculateFillPercentage(currentValue, min, currentMax)

  // 柱體容器引用
  const cylinderRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  // 滑鼠滾輪事件：向前推/向上滾動 (deltaY < 0) = 增加；向下滾動 (deltaY > 0) = 減少
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const isUp = e.deltaY < 0
    const delta = isUp ? step : -step
    const nextVal = clampAndStep(currentValue + delta, min, currentMax, step)
    setInternalValue(nextVal)

    // 滾輪更新後結算動態量程 (上升擴容 / 下降縮容，下限保底 initialMax)
    const nextMax = calculateElasticMax(nextVal, currentMax, initialMax)
    if (nextMax !== currentMax) {
      setCurrentMax(nextMax)
    }
  }

  // 指針 (鼠標 / Touch) 拖曳處理：原生 PointerCapture 跨端平滑響應
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const el = cylinderRef.current
    if (!el) return

    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // 容錯防護 (舊版 WebKit 等)
    }
    setIsDragging(true)

    const rect = el.getBoundingClientRect()
    const bottomDist = rect.bottom - e.clientY
    const nextVal = calculateValueFromBottomDist(bottomDist, rect.height, min, currentMax, step)
    handleValueChange(nextVal)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const el = cylinderRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const bottomDist = rect.bottom - e.clientY
    const nextVal = calculateValueFromBottomDist(bottomDist, rect.height, min, currentMax, step)
    handleValueChange(nextVal)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false)
      const el = cylinderRef.current
      if (el && el.hasPointerCapture(e.pointerId)) {
        try {
          el.releasePointerCapture(e.pointerId)
        } catch {
          // 容錯防護
        }
      }

      // 方案 B: 抬手結算動態量程 (Release-to-Settle: 擴容 / 縮容)
      // 擴容：若當前值達到或超過上限的 75%，提升上限使當前值處於新量程的 1/3 (例如 175 -> 525)
      // 縮容：若當前值降至上限的 20% 且處於擴容態，縮小上限使當前值處於 50%，下限保底為 initialMax (例如 200)
      const nextMax = calculateElasticMax(internalValue, currentMax, initialMax)
      if (nextMax !== currentMax) {
        setCurrentMax(nextMax)
      }
    }
  }

  // 確定按鈕回調
  const handleConfirm = () => {
    onConfirm?.(currentValue, currentUnit)
    onOpenChange?.(false)
  }

  // 取消按鈕回調
  const handleCancel = () => {
    onCancel?.()
    onOpenChange?.(false)
  }

  // 中間標記刻度數值 (依據動態上限 currentMax 計算)
  const midValue = Math.round((min + currentMax) / 2)

  const content = (
    <div className="space-y-4">
      {/* 頂部標題與單位切換列 */}
      <div className="flex items-center justify-between pb-1 border-b border-border/60">
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          {title || t("diet.amount", "份量")}
        </span>

        {/* 單位切換：若 allowedUnits > 1 則顯示膠囊切換；否則僅顯示當前靜態單位 */}
        {allowedUnits.length > 1 ? (
          <div className="flex items-center p-0.5 rounded-full border border-border bg-background text-[11px] font-mono">
            {allowedUnits.map((u) => {
              const isSelected = u === currentUnit
              const isDisabled = disabledUnits.includes(u)

              return (
                <button
                  key={u}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectUnit(u)}
                  className={cn(
                    "px-2.5 py-0.5 rounded-full transition-colors",
                    isSelected
                      ? "bg-foreground text-background font-medium"
                      : "text-muted-foreground hover:text-foreground",
                    isDisabled && "opacity-30 cursor-not-allowed line-through pointer-events-none"
                  )}
                >
                  {u}
                </button>
              )
            })}
          </div>
        ) : (
          <span className="text-xs font-mono font-bold text-muted-foreground">
            {currentUnit}
          </span>
        )}
      </div>

      {/* 核心升降卡槽 (高度恆定 h-48，無佈局抖動) */}
      <div className="relative h-48 rounded-lg border border-border bg-muted/40 overflow-hidden flex items-center justify-between p-3.5 select-none">
        {/* 左側數值與微調按鈕 */}
        <div className="font-mono space-y-2.5">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold tracking-tight text-foreground font-mono">
              {currentValue}
            </span>
            <span className="text-lg font-bold text-muted-foreground font-mono">
              {currentUnit}
            </span>
          </div>

          {/* 步進微調按鈕群組 (簡化為 2 個：減 / 加) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleStepClick(-step)}
              className="h-6 px-3 rounded border border-border text-[11px] font-mono hover:bg-muted active:scale-95 transition-all text-muted-foreground cursor-pointer"
            >
              -{step}
            </button>
            <button
              type="button"
              onClick={() => handleStepClick(step)}
              className="h-6 px-3 rounded border border-border text-[11px] font-mono hover:bg-muted active:scale-95 transition-all text-muted-foreground cursor-pointer"
            >
              +{step}
            </button>
          </div>
        </div>

        {/* 右側液柱升降規 (方案 2A 本體，寬度優化為 w-12 更加修長精緻) */}
        <div
          ref={cylinderRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-12 h-full border border-border rounded-md bg-background relative cursor-ns-resize overflow-hidden flex flex-col justify-end p-0.5 touch-none"
          title={t("diet.dragElevationTip", "上推增加 · 下拉降低")}
        >
          {/* 底層未覆蓋刻度 (未覆蓋時為優雅低干擾灰色，符合視覺階層) */}
          <div className="absolute inset-0 z-0 flex flex-col justify-between p-1.5 pointer-events-none text-[8px] font-mono text-muted-foreground/60 text-right select-none">
            <div className="flex items-center justify-between border-b border-border/40 pb-0.5">
              <span>{currentMax}</span>
              <span>—</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/40 pb-0.5">
              <span>{midValue}</span>
              <span>—</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{min}</span>
              <span>—</span>
            </div>
          </div>

          {/* 向上充滿的液柱 (自底向上撐起) */}
          <div
            className="w-full bg-foreground rounded-xs transition-[height] duration-75 ease-out flex items-center justify-center font-mono text-[9px] font-bold pointer-events-none z-10"
            style={{ height: `${fillPercentage}%` }}
          />

          {/* 頂層覆蓋刻度 (隨液位高度精確幾何裁切，液柱覆蓋處呈現純白/純黑極致高對比) */}
          <div
            className="absolute inset-0 z-20 flex flex-col justify-between p-1.5 pointer-events-none text-[8px] font-mono text-background text-right select-none"
            style={{ clipPath: `inset(calc(100% - ${fillPercentage}%) 0 0 0)` }}
          >
            <div className="flex items-center justify-between border-b border-background/60 pb-0.5">
              <span>{currentMax}</span>
              <span>—</span>
            </div>
            <div className="flex items-center justify-between border-b border-background/60 pb-0.5">
              <span>{midValue}</span>
              <span>—</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{min}</span>
              <span>—</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部客觀備註或反灰提示 */}
      {hint && (
        <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
          <span>ℹ️</span>
          <span>{hint}</span>
        </div>
      )}

      {/* DialogFooter (Rule: Cancel on left, Add/Save on right) */}
      <DialogFooter className="flex flex-row items-center justify-between gap-3 pt-2">
        <DialogClose render={<Button type="button" variant="outline" onClick={handleCancel} className="border-border cursor-pointer h-8 text-xs px-4" />}>
          {t('common.cancel')}
        </DialogClose>
        <Button
          type="button"
          onClick={handleConfirm}
          className="cursor-pointer h-8 text-xs px-5 font-medium"
        >
          {t('common.confirm')}
        </Button>
      </DialogFooter>
    </div>
  )

  // 如果作為獨立對話框呼出
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger>{trigger}</DialogTrigger>}
      <DialogContent
        showCloseButton={false}
        overlayClassName={overlayClassName}
        className={cn(
          "w-[280px] sm:w-[290px] p-4.5 rounded-xl border border-border bg-card text-card-foreground shadow-none",
          className
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title || t("diet.amount", "份量")}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
