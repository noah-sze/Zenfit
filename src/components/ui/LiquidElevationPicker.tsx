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
  alignToStep,
  calculateFillPercentage,
  calculateValueFromBottomDist,
  isUnitDisabled,
  resolveActiveUnit,
  settleElevationWindow,
  shiftWindowToFitValue,
  calculateElevationTicks,
  getStepPrecision,
  getMacroMaxFloor,
  calculateInitialElevationWindow,
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

  // 基礎下限與初始上限 (由調用方針對具體字段自由設置，不寫死)
  const baseMin = min !== undefined ? min : 0
  const initialMax = max !== undefined && max > baseMin ? max : 100

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

  // 動態視窗狀態：windowMin (當前視窗下限)、windowMax (當前視窗上限)、macroMax (宏觀總上限)
  const [windowMin, setWindowMin] = React.useState<number>(baseMin)
  const [windowMax, setWindowMax] = React.useState<number>(initialMax)
  const [macroMax, setMacroMax] = React.useState<number>(initialMax)

  React.useEffect(() => {
    if (open && !prevOpenRef.current) {
      const initVal = controlledValue !== undefined ? controlledValue : defaultValue
      const initUnit = resolveActiveUnit(allowedUnits, controlledUnit || defaultUnit, disabledUnits)
      setInternalUnit(initUnit)

      // 計算重置視窗：若用戶之前已選擇數值 (如 10)，上限重置為 20 (10 x 2)，升降條位置居中 (50%)
      const initWin = calculateInitialElevationWindow(initVal, baseMin, initialMax, step)
      const safeVal = initVal !== undefined && !isNaN(initVal) && initVal > baseMin
        ? alignToStep(initVal, step)
        : clampAndStep(initVal ?? baseMin, baseMin, initWin.macroMax, step)

      setInternalValue(safeVal)
      setWindowMin(initWin.windowMin)
      setWindowMax(initWin.windowMax)
      setMacroMax(initWin.macroMax)
    } else if (open && controlledValue !== undefined && controlledValue !== prevControlledValRef.current) {
      setInternalValue(controlledValue)
      const nextWin = settleElevationWindow(controlledValue, windowMin, windowMax, macroMax, baseMin, initialMax, step)
      setWindowMin(nextWin.windowMin)
      setWindowMax(nextWin.windowMax)
      setMacroMax(nextWin.macroMax)
    }
    prevOpenRef.current = !!open
    prevControlledValRef.current = controlledValue
  }, [open, controlledValue, defaultValue, controlledUnit, defaultUnit, allowedUnits, disabledUnits, initialMax, baseMin, step])

  // 彈窗內部顯示與渲染一律以 internalValue / internalUnit 為準
  const currentValue = internalValue
  const currentUnit = internalUnit

  // 數值更新 (受限於當前動態視窗 [windowMin, windowMax])
  const handleValueChange = React.useCallback(
    (nextVal: number) => {
      const finalVal = clampAndStep(nextVal, windowMin, windowMax, step)
      setInternalValue(finalVal)
    },
    [windowMin, windowMax, step]
  )

  // 單位切換
  const handleSelectUnit = (u: LiquidPickerUnit) => {
    if (isUnitDisabled(u, disabledUnits)) return
    setInternalUnit(u)
    onUnitChange?.(u)
  }

  // 微調按鈕點擊更新 (當前視窗內平滑微調；若超出視窗自動平移邊界)
  const handleStepClick = (delta: number) => {
    const nextVal = clampAndStep(currentValue + delta, baseMin, macroMax, step)
    setInternalValue(nextVal)

    const nextWin = shiftWindowToFitValue(nextVal, windowMin, windowMax, macroMax, baseMin, step)
    if (nextWin.windowMin !== windowMin || nextWin.windowMax !== windowMax) {
      setWindowMin(nextWin.windowMin)
      setWindowMax(nextWin.windowMax)
    }
  }

  // 計算液柱高度百分比 (底為 windowMin, 頂為 windowMax)
  const fillPercentage = calculateFillPercentage(currentValue, windowMin, windowMax)

  // 柱體容器引用
  const cylinderRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  // 滑鼠滾輪事件：向前推/向上滾動 (deltaY < 0) = 增加；向下滾動 (deltaY > 0) = 減少
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const isUp = e.deltaY < 0
    const delta = isUp ? step : -step
    const nextVal = clampAndStep(currentValue + delta, baseMin, macroMax, step)
    setInternalValue(nextVal)

    const nextWin = shiftWindowToFitValue(nextVal, windowMin, windowMax, macroMax, baseMin, step)
    if (nextWin.windowMin !== windowMin || nextWin.windowMax !== windowMax) {
      setWindowMin(nextWin.windowMin)
      setWindowMax(nextWin.windowMax)
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
    const nextVal = calculateValueFromBottomDist(bottomDist, rect.height, windowMin, windowMax, step)
    handleValueChange(nextVal)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const el = cylinderRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const bottomDist = rect.bottom - e.clientY
    const nextVal = calculateValueFromBottomDist(bottomDist, rect.height, windowMin, windowMax, step)
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

      // 選項 A: 抬手結算動態視窗 (Release-to-Settle: 90% 增加上限 / 10% 降低上限 / 居中多次聚焦收斂)
      const settled = settleElevationWindow(internalValue, windowMin, windowMax, macroMax, baseMin, initialMax, step)
      setWindowMin(settled.windowMin)
      setWindowMax(settled.windowMax)
      setMacroMax(settled.macroMax)
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

  // 粗調步進值 (0.1 步進時粗調為 1；整數步進時粗調為 10)
  const largeStep = step < 1 ? 1 : 10

  // 判定當前是否處於聚焦狀態
  const isFocused = windowMin !== baseMin || windowMax !== macroMax

  // 5 道等距刻度數值 (透過 calculateElevationTicks 精確對齊 step，消除一切怪異殘留小數)
  const ticks = calculateElevationTicks(windowMin, windowMax, step)
  const precision = getStepPrecision(step)
  const formatTick = (n: number) => precision > 0 ? n.toFixed(precision) : String(n)

  // 聚焦狀態邊界檢測與密齒游標刻度 (維持純粹客觀數值，無任何 UNLOCK 字樣)
  const minMacroFloor = getMacroMaxFloor(step)
  const isBottomTrigger = isFocused
    ? fillPercentage <= 10
    : fillPercentage <= 10 && macroMax > minMacroFloor

  const vernierItems = [
    { isMajor: true, val: formatTick(ticks.top) },
    { isMajor: false, val: '' },
    { isMajor: true, val: formatTick(ticks.q3) },
    { isMajor: false, val: '' },
    { isMajor: true, val: formatTick(ticks.mid) },
    { isMajor: false, val: '' },
    { isMajor: true, val: formatTick(ticks.q1) },
    { isMajor: false, val: '' },
    { isMajor: true, val: formatTick(ticks.bottom) },
  ]

  const content = (
    <div className="space-y-4">
      {/* 頂部標題與單位切換列 */}
      <div className="flex items-center justify-between pb-1 border-b border-border/60">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {title || t("diet.amount", "份量")}
          </span>
          {isFocused && (
            <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold tracking-widest text-foreground bg-muted border border-border px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              FOCUS
            </span>
          )}
        </div>

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

      {/* 核心升降卡槽 (方案 A：矮屏保底 192px，隨可視高度流體延展至上限 320px) */}
      <div
        className="relative rounded-lg border border-border bg-muted/40 overflow-hidden flex items-center justify-between p-3.5 select-none"
        style={{ height: 'clamp(192px, 32dvh, 320px)' }}
      >
        {/* 左側數值與微調按鈕：垂直均勻置中 */}
        <div className="font-mono flex flex-col justify-center h-full space-y-3.5 py-1">
          {/* 大數字數值顯示 */}
          <div className="flex items-baseline gap-1 select-none">
            <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground font-mono">
              {formatTick(currentValue)}
            </span>
            <span className="text-lg font-bold text-muted-foreground font-mono">
              {currentUnit}
            </span>
          </div>

          {/* 步進微調按鈕群組：2x2 對齊矩陣 ([-step] [-largeStep] / [+step] [+largeStep]) */}
          <div className="grid grid-cols-2 gap-1.5 w-32 font-mono">
            <button
              type="button"
              onClick={() => handleStepClick(-step)}
              className="h-6.5 rounded border border-border/80 bg-background/60 hover:bg-muted text-[11px] font-mono hover:text-foreground active:scale-95 transition-all text-foreground cursor-pointer font-medium flex items-center justify-center"
              title={`-${step}`}
            >
              -{step}
            </button>
            <button
              type="button"
              onClick={() => handleStepClick(-largeStep)}
              className="h-6.5 rounded border border-border/80 bg-background/60 hover:bg-muted text-[10px] font-mono hover:text-foreground active:scale-95 transition-all text-muted-foreground cursor-pointer flex items-center justify-center"
              title={`-${largeStep}`}
            >
              -{largeStep}
            </button>
            <button
              type="button"
              onClick={() => handleStepClick(step)}
              className="h-6.5 rounded border border-border/80 bg-background/60 hover:bg-muted text-[11px] font-mono hover:text-foreground active:scale-95 transition-all text-foreground cursor-pointer font-medium flex items-center justify-center"
              title={`+${step}`}
            >
              +{step}
            </button>
            <button
              type="button"
              onClick={() => handleStepClick(largeStep)}
              className="h-6.5 rounded border border-border/80 bg-background/60 hover:bg-muted text-[10px] font-mono hover:text-foreground active:scale-95 transition-all text-muted-foreground cursor-pointer flex items-center justify-center"
              title={`+${largeStep}`}
            >
              +{largeStep}
            </button>
          </div>
        </div>

        {/* 右側液柱升降規容器 */}
        <div className="relative h-full flex items-center justify-center">
          {/* 已聚焦狀態外圍卡尺導軌 [ ] */}
          {isFocused && (
            <div className="absolute -inset-x-1.5 -inset-y-0.5 pointer-events-none flex justify-between z-15">
              <div className="relative w-1.5 h-full">
                <div className="absolute inset-y-0 left-0 w-0.5 bg-foreground" />
                <div className="absolute top-0 left-0 w-1.5 h-0.5 bg-foreground" />
                <div className="absolute bottom-0 left-0 w-1.5 h-0.5 bg-foreground" />
              </div>
              <div className="relative w-1.5 h-full">
                <div className="absolute inset-y-0 right-0 w-0.5 bg-foreground" />
                <div className="absolute top-0 right-0 w-1.5 h-0.5 bg-foreground" />
                <div className="absolute bottom-0 right-0 w-1.5 h-0.5 bg-foreground" />
              </div>
            </div>
          )}

          {/* 升降柱體本體 */}
          <div
            ref={cylinderRef}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={cn(
              "w-12 h-full border rounded-md bg-background relative cursor-ns-resize overflow-hidden flex flex-col justify-end p-0.5 touch-none select-none",
              isFocused ? "border-foreground" : "border-border"
            )}
            title={t("diet.dragElevationTip", "上推增加 · 下拉降低")}
          >
            {/* 方案 1: 工業精密斜紋區 (聚焦後與聚焦前皆呈現一致的斑馬紋理) */}
            {/* 頂部 10% 緩衝區 (放手擴展上限 / 解鎖宏觀) */}
            <div
              className={cn(
                "absolute top-0 inset-x-0 h-[10%] pointer-events-none z-5 border-b border-dashed border-border/40 transition-all",
                fillPercentage >= 90
                  ? "bg-[repeating-linear-gradient(-45deg,rgba(161,161,170,0.2),rgba(161,161,170,0.2)_3px,currentColor_3px,currentColor_4.5px)] opacity-90 border-foreground"
                  : "bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgba(161,161,170,0.22)_3px,rgba(161,161,170,0.22)_4.5px)]"
              )}
            />
            {/* 底部 10% 緩衝區 (放手收斂上限 / 解鎖宏觀) */}
            <div
              className={cn(
                "absolute bottom-0 inset-x-0 h-[10%] pointer-events-none z-5 border-t border-dashed border-border/40 transition-all",
                isBottomTrigger
                  ? "bg-[repeating-linear-gradient(-45deg,rgba(161,161,170,0.2),rgba(161,161,170,0.2)_3px,currentColor_3px,currentColor_4.5px)] opacity-90 border-foreground"
                  : "bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgba(161,161,170,0.22)_3px,rgba(161,161,170,0.22)_4.5px)]"
              )}
            />

            {/* 底層未覆蓋刻度 */}
            <div className="absolute inset-0 z-0 flex flex-col justify-between p-1.5 pointer-events-none font-mono text-[8px] text-muted-foreground/70 text-right select-none">
              {isFocused ? (
                vernierItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-end gap-1 h-[1px]">
                    {item.isMajor ? (
                      <>
                        <span className="text-[7px] text-muted-foreground/70">
                          {item.val}
                        </span>
                        <span className="w-3.5 h-[1px] bg-muted-foreground/60" />
                      </>
                    ) : (
                      <span className="w-1.5 h-[1px] bg-muted-foreground/30" />
                    )}
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-border/40 pb-0.5">
                    <span>{formatTick(ticks.top)}</span>
                    <span>—</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/25 pb-0.5">
                    <span>{formatTick(ticks.q3)}</span>
                    <span>—</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/40 pb-0.5">
                    <span>{formatTick(ticks.mid)}</span>
                    <span>—</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/25 pb-0.5">
                    <span>{formatTick(ticks.q1)}</span>
                    <span>—</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{formatTick(ticks.bottom)}</span>
                    <span>—</span>
                  </div>
                </>
              )}
            </div>

            {/* 向上充滿的液柱 (自底向上撐起) */}
            <div
              className="w-full bg-foreground rounded-xs transition-[height] duration-75 ease-out flex items-center justify-center font-mono text-[9px] font-bold pointer-events-none z-10"
              style={{ height: `${fillPercentage}%` }}
            />

            {/* 頂層覆蓋刻度 (液柱覆蓋處純白/純黑極致高對比，嚴格維持與底層相同 text-[8px] 字級) */}
            <div
              className="absolute inset-0 z-20 flex flex-col justify-between p-1.5 pointer-events-none font-mono text-[8px] text-background text-right select-none"
              style={{ clipPath: `inset(calc(100% - ${fillPercentage}%) 0 0 0)` }}
            >
              {isFocused ? (
                vernierItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-end gap-1 h-[1px]">
                    {item.isMajor ? (
                      <>
                        <span className="text-[7px] text-background">
                          {item.val}
                        </span>
                        <span className="w-3.5 h-[1px] bg-background" />
                      </>
                    ) : (
                      <span className="w-1.5 h-[1px] bg-background/50" />
                    )}
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-background/60 pb-0.5">
                    <span>{formatTick(ticks.top)}</span>
                    <span>—</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-background/40 pb-0.5">
                    <span>{formatTick(ticks.q3)}</span>
                    <span>—</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-background/60 pb-0.5">
                    <span>{formatTick(ticks.mid)}</span>
                    <span>—</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-background/40 pb-0.5">
                    <span>{formatTick(ticks.q1)}</span>
                    <span>—</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{formatTick(ticks.bottom)}</span>
                    <span>—</span>
                  </div>
                </>
              )}
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
