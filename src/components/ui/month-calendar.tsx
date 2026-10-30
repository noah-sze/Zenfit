import * as React from "react"
import { X, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { triggerHaptic } from "@/lib/haptics"
import { calculateAgeFromBirth } from "@/utils/weightMath"

export type MonthCalendarProps = {
  selected?: string // "YYYY-MM"
  onSelect?: (yearMonth: string) => void
  onClose?: () => void
  className?: string
}

export function MonthCalendar({ selected, onSelect, onClose, className }: MonthCalendarProps) {
  const { t } = useTranslation()

  // 解析初始選中年份與月份
  const parseInitial = () => {
    if (selected && selected.includes("-")) {
      const [y, m] = selected.split("-")
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

  // 同步外部 selected 變更
  React.useEffect(() => {
    if (selected && selected.includes("-")) {
      const [y, m] = selected.split("-")
      const parsedY = parseInt(y, 10)
      const parsedM = parseInt(m, 10)
      if (!isNaN(parsedY) && !isNaN(parsedM)) {
        setTempYear(parsedY)
        setTempMonth(parsedM)
      }
    }
  }, [selected])

  // 當前真實年份與年份清單（1920 ~ 當前年份，降序排列）
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
    return t("monthPicker.yearFormat", "{{year}} 年")
      .replace("{{year}}", String(y))
      .replace("yyyy", String(y))
  }

  // 自動將選中項滾動至各自列表的可見區域中心
  const selectedYearRef = React.useRef<HTMLButtonElement>(null)
  const selectedMonthRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    // 瞬時彈出後將選中項滾動居中，避免慢速過渡動畫
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

  const handleConfirm = () => {
    const formatted = `${tempYear}-${String(tempMonth).padStart(2, "0")}`
    onSelect?.(formatted)
    onClose?.()
  }

  // 即時計算客觀生理年齡
  const tempYearMonth = `${tempYear}-${String(tempMonth).padStart(2, "0")}`
  const calculatedAge = calculateAgeFromBirth(tempYearMonth)

  return (
    <div
      className={cn(
        "w-full max-w-[340px] sm:max-w-[360px] select-none rounded-lg bg-card text-card-foreground border border-border overflow-hidden shadow-none",
        className
      )}
    >
      {/* 1. Header: 標題與關閉按鈕 */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/10">
        <span className="text-sm font-semibold tracking-tight text-foreground font-mono">
          {t("monthPicker.title", "選擇出生年月")}
        </span>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            onClick={onClose}
            title={t("monthPicker.close", "關閉")}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* 2. 動態生理年齡客觀事實看板 (替換原冗餘偽下拉框) */}
      <div className="py-4 px-4 flex flex-col items-center justify-center border-b border-border/60 bg-muted/5">
        <div className="flex items-baseline gap-1.5 font-mono">
          <span className="text-4xl font-bold tracking-tight text-foreground">
            {calculatedAge}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            {t("profileSettings.yearsOld", "歲")}
          </span>
        </div>
        <span className="text-xs font-mono text-muted-foreground mt-1">
          {tempYearMonth}
        </span>
      </div>

      {/* 3. 雙列獨立滾動選擇面板 (左側年份，右側月份，高度恆定防抖) */}
      <div className="p-3">
        {/* 雙列吸頂小標籤 */}
        <div className="grid grid-cols-2 gap-2 mb-1.5 px-2">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            {t("monthPicker.year", "年份")}
          </span>
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-l border-border/60 pl-2">
            {t("monthPicker.month", "月份")}
          </span>
        </div>

        {/* 雙列列表容器 */}
        <div className="grid grid-cols-2 gap-2 h-48 rounded-lg border border-border bg-muted/15 p-1 overflow-hidden">
          {/* 左側：年份滾動清單 */}
          <div className="h-full overflow-y-auto overscroll-contain pr-1 flex flex-col gap-0.5 no-scrollbar sm:scrollbar-thin">
            {yearsList.map((y) => {
              const isSelected = tempYear === y
              const isCurrent = y === currentActualYear
              return (
                <button
                  key={y}
                  ref={isSelected ? selectedYearRef : undefined}
                  type="button"
                  onClick={() => handleSelectYear(y)}
                  className={cn(
                    "h-9 w-full px-2.5 rounded-lg text-xs font-mono flex items-center justify-between cursor-pointer transition-colors shrink-0",
                    isSelected
                      ? "bg-foreground text-background font-semibold hover:bg-foreground/90"
                      : "text-foreground hover:bg-muted/70",
                    isCurrent && !isSelected && "font-medium"
                  )}
                >
                  <span>{formatYear(y)}</span>
                  {isSelected && <Check className="size-3.5 text-background shrink-0" />}
                </button>
              )
            })}
          </div>

          {/* 右側：月份滾動清單 */}
          <div className="h-full overflow-y-auto overscroll-contain pr-1 flex flex-col gap-0.5 border-l border-border/60 pl-1 no-scrollbar sm:scrollbar-thin">
            {monthsList.map((m) => {
              const isSelected = tempMonth === m
              return (
                <button
                  key={m}
                  ref={isSelected ? selectedMonthRef : undefined}
                  type="button"
                  onClick={() => handleSelectMonth(m)}
                  className={cn(
                    "h-9 w-full px-2.5 rounded-lg text-xs font-mono flex items-center justify-between cursor-pointer transition-colors shrink-0",
                    isSelected
                      ? "bg-foreground text-background font-semibold hover:bg-foreground/90"
                      : "text-foreground hover:bg-muted/70"
                  )}
                >
                  <span>{monthNames[m - 1]}</span>
                  {isSelected && <Check className="size-3.5 text-background shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. 底部操作按鈕 (取消 / 確認) */}
      <div className="p-3 border-t border-border bg-card grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-lg text-xs font-medium border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-center"
        >
          {t("common.cancel", "取消")}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-2.5 rounded-lg text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer text-center font-mono"
        >
          {t("common.confirm", "確認")}
        </button>
      </div>
    </div>
  )
}
