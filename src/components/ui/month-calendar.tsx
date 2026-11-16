import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { triggerHaptic } from "@/lib/haptics"
import { calculateAgeFromBirth } from "@/utils/weightMath"

export interface MonthCalendarProps {
  value?: string // "YYYY-MM"
  onChange?: (yearMonth: string) => void
  className?: string
}

/**
 * Zenfit 精密月份與年份雙列選擇器 (Precision Month & Year Calendar Selector)
 * 遵循標準精密彈窗規範：300px 緊湊網格、微型 HUD 狀態條、雙列獨立滾動
 */
export function MonthCalendar({ value, onChange, className }: MonthCalendarProps) {
  const { t } = useTranslation()

  // 解析初始選中年份與月份
  const parseInitial = () => {
    if (value && value.includes("-")) {
      const [y, m] = value.split("-")
      const parsedY = parseInt(y, 10)
      const parsedM = parseInt(m, 10)
      if (!isNaN(parsedY) && !isNaN(parsedM) && parsedM >= 1 && parsedM <= 12) {
        return { year: parsedY, month: parsedM }
      }
    }
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }

  const initial = parseInitial()
  const [tempYear, setTempYear] = React.useState<number>(initial.year)
  const [tempMonth, setTempMonth] = React.useState<number>(initial.month)

  const currentYM = `${tempYear}-${String(tempMonth).padStart(2, "0")}`

  // 當內部選取變動時即時同步至外部
  React.useEffect(() => {
    onChange?.(currentYM)
  }, [currentYM, onChange])

  // 同步外部傳入的 value
  React.useEffect(() => {
    if (value && value.includes("-")) {
      const [y, m] = value.split("-")
      const parsedY = parseInt(y, 10)
      const parsedM = parseInt(m, 10)
      if (!isNaN(parsedY) && !isNaN(parsedM)) {
        setTempYear(parsedY)
        setTempMonth(parsedM)
      }
    }
  }, [value])

  const currentActualYear = new Date().getFullYear()
  const yearsList = React.useMemo(() => {
    const list: number[] = []
    for (let y = currentActualYear; y >= 1920; y--) {
      list.push(y)
    }
    return list
  }, [currentActualYear])

  const monthsList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  const monthNames = [
    t("monthPicker.months.0", "1 月"),
    t("monthPicker.months.1", "2 月"),
    t("monthPicker.months.2", "3 月"),
    t("monthPicker.months.3", "4 月"),
    t("monthPicker.months.4", "5 月"),
    t("monthPicker.months.5", "6 月"),
    t("monthPicker.months.6", "7 月"),
    t("monthPicker.months.7", "8 月"),
    t("monthPicker.months.8", "9 月"),
    t("monthPicker.months.9", "10 月"),
    t("monthPicker.months.10", "11 月"),
    t("monthPicker.months.11", "12 月"),
  ]

  const formatYear = (y: number) => {
    return `${y} ${t("common.year", "年")}`
  }

  // 瞬時將選中項目滾動至視圖中央
  const selectedYearRef = React.useRef<HTMLButtonElement>(null)
  const selectedMonthRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      selectedYearRef.current?.scrollIntoView({
        block: "center",
        behavior: "instant",
      })
      selectedMonthRef.current?.scrollIntoView({
        block: "center",
        behavior: "instant",
      })
    }, 10)
    return () => clearTimeout(timer)
  }, [])

  const handleSelectYear = (y: number) => {
    setTempYear(y)
    triggerHaptic("selection")
  }

  const handleSelectMonth = (m: number) => {
    setTempMonth(m)
    triggerHaptic("selection")
  }

  const calculatedAge = calculateAgeFromBirth(currentYM)

  return (
    <div className={cn("w-full space-y-3 pt-3.5 select-none font-mono", className)}>
      {/* 1. 微型 HUD 狀態卡片 (Micro Status HUD) */}
      <div className="h-9 px-3 rounded-md border border-border bg-muted/20 flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground tracking-tight font-mono">
          {currentYM}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground font-mono">
          {calculatedAge > 0
            ? `${calculatedAge} ${t("profileSettings.yearsOld", "歲")}`
            : `0 ${t("profileSettings.yearsOld", "歲")}`}
        </span>
      </div>

      {/* 2. 雙列標籤與滾動選擇區 */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-2 px-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            {t("monthPicker.year", "年份")}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono border-l border-border pl-2">
            {t("monthPicker.month", "月份")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 h-48 rounded-md border border-border bg-muted/10 p-1 overflow-hidden">
          {/* 左側年份列表 */}
          <div className="h-full overflow-y-auto overscroll-contain pr-1 flex flex-col gap-0.5 no-scrollbar">
            {yearsList.map((y) => {
              const isSelected = tempYear === y
              return (
                <button
                  key={y}
                  ref={isSelected ? selectedYearRef : undefined}
                  type="button"
                  onClick={() => handleSelectYear(y)}
                  className={cn(
                    "h-8 w-full px-2 rounded text-xs font-mono flex items-center justify-between cursor-pointer transition-colors shrink-0",
                    isSelected
                      ? "bg-foreground text-background font-semibold"
                      : "text-foreground hover:bg-hover active:bg-hover/80"
                  )}
                >
                  <span>{formatYear(y)}</span>
                  {isSelected && <Check className="size-3 text-background shrink-0" />}
                </button>
              )
            })}
          </div>

          {/* 右側月份列表 */}
          <div className="h-full overflow-y-auto overscroll-contain pr-1 flex flex-col gap-0.5 border-l border-border pl-1 no-scrollbar">
            {monthsList.map((m) => {
              const isSelected = tempMonth === m
              return (
                <button
                  key={m}
                  ref={isSelected ? selectedMonthRef : undefined}
                  type="button"
                  onClick={() => handleSelectMonth(m)}
                  className={cn(
                    "h-8 w-full px-2 rounded text-xs font-mono flex items-center justify-between cursor-pointer transition-colors shrink-0",
                    isSelected
                      ? "bg-foreground text-background font-semibold"
                      : "text-foreground hover:bg-hover active:bg-hover/80"
                  )}
                >
                  <span>{monthNames[m - 1]}</span>
                  {isSelected && <Check className="size-3 text-background shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
