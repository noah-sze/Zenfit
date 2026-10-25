import { useState, useEffect, useMemo, useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LiquidElevationPicker } from '@/components/ui/LiquidElevationPicker';
import type { FoodItem, FoodCategory } from '@/types';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { scaleNutritionFromBasis } from '@/utils/nutritionMath';
import { Utensils, X, ChevronRight } from 'lucide-react';

type PickerField = 'serving' | 'basis' | 'calories' | 'protein' | 'carbs' | 'fat';

interface PickerConfig {
  field: PickerField;
  title: string;
  value: number;
  unit: string;
  allowedUnits: string[];
  disabledUnits?: string[];
  min: number;
  max: number;
  step: number;
  hint?: string;
}

export type FoodFormData = Omit<
  FoodItem,
  'id' | 'createdAt' | 'updatedAt' | 'isCustom' | 'isArchived'
>;

export interface FoodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: FoodItem | null;
  onSubmit: (data: FoodFormData) => Promise<void> | void;
}

let measurementContext: CanvasRenderingContext2D | null = null;
function measureInputTextWidth(text: string, font: string = '500 12px Inter, system-ui, sans-serif'): number {
  if (typeof window === 'undefined') return 30;
  if (!measurementContext) {
    const canvas = document.createElement('canvas');
    measurementContext = canvas.getContext('2d');
  }
  if (!measurementContext) return text.length * 8;
  measurementContext.font = font;
  return Math.ceil(measurementContext.measureText(text).width);
}

/**
 * 領域共用組件：新增與編輯單品食材表單彈窗
 * 嚴格遵循 Design Standards 規範：
 * - 1:1 復刻 CategoryDetails「基準營養素」Vercel Usage List (divide-y divide-border)
 * - 每行高度精確維持 h-10 px-4
 * - 拆分「食用份量」與「自定義營養標籤依據」，自動純函數換算
 * - 智能識別原始數據依份量或自定義基準回填
 */
export function FoodFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
}: FoodFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!initialData;

  // 基本資訊狀態
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('natural');
  const [brand, setBrand] = useState('');

  // 品牌與名稱輸入框自適應寬度 (精確等於輸入文字長度，風格 A：純粹名詞「品牌」)
  const brandPlaceholder = t('diet.brand');
  const namePlaceholder = t('diet.foodNamePlaceholder');

  const brandWidth = useMemo(() => {
    const text = brand || brandPlaceholder;
    const w = measureInputTextWidth(text, '400 12px Inter, -apple-system, sans-serif') + 20;
    return Math.min(130, Math.max(46, w));
  }, [brand, brandPlaceholder]);

  const nameWidth = useMemo(() => {
    const text = name || namePlaceholder;
    const w = measureInputTextWidth(text, '500 12px Inter, -apple-system, sans-serif') + 20;
    return Math.min(180, Math.max(46, w));
  }, [name, namePlaceholder]);

  // 物理份量與單位
  const [servingSize, setServingSize] = useState('100');
  const [servingUnit, setServingUnit] = useState('g');

  // 標籤基準模式 ('serving' = 依份量, 'custom' = 自定義標籤依據如每 100g 或每 30g)
  const [basisMode, setBasisMode] = useState<'serving' | 'custom'>('serving');
  const [basisSize, setBasisSize] = useState('100');

  // 輸入之營養素數值 (對應當前 basisMode 下的輸入值)
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickerConfig, setPickerConfig] = useState<PickerConfig | null>(null);

  // 當彈窗開啟或 initialData 改變時，智能識別並回填表單
  useEffect(() => {
    if (!open) return;

    if (initialData) {
      setName(initialData.name || '');
      setCategory(initialData.category || 'natural');
      setBrand(initialData.brand || '');
      setServingSize(String(initialData.servingSize || 100));
      setServingUnit(initialData.servingUnit || 'g');

      // 智能判斷原始信息：
      // 若有記錄 labelBasisSize 且與份量不同，則判定為自定義標籤依據
      const hasCustomBasis =
        typeof initialData.labelBasisSize === 'number' &&
        initialData.labelBasisSize > 0 &&
        initialData.labelBasisSize !== initialData.servingSize;

      if (hasCustomBasis) {
        setBasisMode('custom');
        setBasisSize(String(initialData.labelBasisSize));

        // 優先帶入當初記錄的原始標籤數值；若無則依比例逆向還原
        if (initialData.rawNutrition) {
          setCalories(String(initialData.rawNutrition.calories));
          setProtein(String(initialData.rawNutrition.protein));
          setCarbs(String(initialData.rawNutrition.carbs));
          setFat(String(initialData.rawNutrition.fat));
        } else {
          const ratio = (initialData.labelBasisSize || 100) / (initialData.servingSize || 100);
          setCalories(String(Math.round(initialData.calories * ratio)));
          setProtein(String(Math.round(initialData.protein * ratio * 10) / 10));
          setCarbs(String(Math.round(initialData.carbs * ratio * 10) / 10));
          setFat(String(Math.round(initialData.fat * ratio * 10) / 10));
        }
      } else {
        setBasisMode('serving');
        setBasisSize(String(initialData.servingSize || 100));
        setCalories(String(initialData.calories));
        setProtein(String(initialData.protein));
        setCarbs(String(initialData.carbs));
        setFat(String(initialData.fat));
      }
    } else {
      // 新增模式：乾淨預設值
      setName('');
      setCategory('natural');
      setBrand('');
      setServingSize('100');
      setServingUnit('g');
      setBasisMode('serving');
      setBasisSize('100');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
    }
  }, [open, initialData]);

  // 當分類切換時，自動同步預設單位
  const handleCategoryChange = (newCat: FoodCategory) => {
    setCategory(newCat);
    if (newCat === 'beverage' && servingUnit === 'g') {
      setServingUnit('ml');
      if (servingSize === '100') setServingSize('250');
    } else if (newCat !== 'beverage' && servingUnit === 'ml') {
      setServingUnit('g');
      if (servingSize === '250') setServingSize('100');
    }
  };

  // 即時純數學折算單份數據
  const parsedServing = Math.max(0, parseFloat(servingSize) || 100);
  const parsedBasis = Math.max(0, parseFloat(basisSize) || 100);
  const parsedCal = Math.max(0, parseFloat(calories) || 0);
  const parsedP = Math.max(0, parseFloat(protein) || 0);
  const parsedC = Math.max(0, parseFloat(carbs) || 0);
  const parsedF = Math.max(0, parseFloat(fat) || 0);

  // 打開獨立數字升降選擇器
  const openPicker = (field: PickerField) => {
    triggerHaptic('selection');
    switch (field) {
      case 'serving': {
        const isNatural = category === 'natural';
        const isBeverage = category === 'beverage';
        setPickerConfig({
          field: 'serving',
          title: t('diet.serving'),
          value: parsedServing,
          unit: servingUnit,
          allowedUnits: isBeverage ? ['ml', 'g'] : ['g', 'ml'],
          disabledUnits: isNatural ? ['ml'] : [],
          hint: isNatural ? t('diet.solidFoodGramOnly') : undefined,
          min: 1,
          max: 1000,
          step: 1,
        });
        break;
      }
      case 'basis': {
        setPickerConfig({
          field: 'basis',
          title: t('diet.nutritionBenchmark'),
          value: parsedBasis,
          unit: servingUnit,
          allowedUnits: [servingUnit],
          min: 1,
          max: 1000,
          step: 1,
        });
        break;
      }
      case 'calories': {
        setPickerConfig({
          field: 'calories',
          title: t('diet.calories'),
          value: parsedCal,
          unit: 'kcal',
          allowedUnits: ['kcal'],
          min: 0,
          max: 1500,
          step: 1,
        });
        break;
      }
      case 'protein': {
        setPickerConfig({
          field: 'protein',
          title: t('diet.protein'),
          value: parsedP,
          unit: 'g',
          allowedUnits: ['g'],
          min: 0,
          max: 150,
          step: 0.1,
        });
        break;
      }
      case 'carbs': {
        setPickerConfig({
          field: 'carbs',
          title: t('diet.carbs'),
          value: parsedC,
          unit: 'g',
          allowedUnits: ['g'],
          min: 0,
          max: 200,
          step: 0.1,
        });
        break;
      }
      case 'fat': {
        setPickerConfig({
          field: 'fat',
          title: t('diet.fat'),
          value: parsedF,
          unit: 'g',
          allowedUnits: ['g'],
          min: 0,
          max: 150,
          step: 0.1,
        });
        break;
      }
    }
  };

  const handlePickerConfirm = (val: number, nextUnit: string) => {
    if (!pickerConfig) return;
    triggerHaptic('success');
    switch (pickerConfig.field) {
      case 'serving':
        setServingSize(String(val));
        setServingUnit(nextUnit);
        break;
      case 'basis':
        setBasisSize(String(val));
        break;
      case 'calories':
        setCalories(String(Math.round(val)));
        break;
      case 'protein':
        setProtein(String(Math.round(val * 10) / 10));
        break;
      case 'carbs':
        setCarbs(String(Math.round(val * 10) / 10));
        break;
      case 'fat':
        setFat(String(Math.round(val * 10) / 10));
        break;
    }
    setPickerConfig(null);
  };

  const scaledSingleServing = useMemo(() => {
    if (basisMode === 'serving') {
      return {
        calories: Math.round(parsedCal),
        protein: Math.round(parsedP * 10) / 10,
        carbs: Math.round(parsedC * 10) / 10,
        fat: Math.round(parsedF * 10) / 10,
        servingSize: parsedServing,
        servingUnit,
      };
    }

    return scaleNutritionFromBasis({
      calories: parsedCal,
      protein: parsedP,
      carbs: parsedC,
      fat: parsedF,
      servingSize: parsedServing,
      basisSize: parsedBasis,
      servingUnit,
    });
  }, [basisMode, parsedCal, parsedP, parsedC, parsedF, parsedServing, parsedBasis, servingUnit]);

  // 表單送出處理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (basisMode === 'serving') {
        await onSubmit({
          name: name.trim(),
          category,
          brand: brand.trim() || undefined,
          servingSize: parsedServing,
          servingUnit: servingUnit.trim() || 'g',
          calories: Math.round(parsedCal),
          protein: Math.round(parsedP * 10) / 10,
          carbs: Math.round(parsedC * 10) / 10,
          fat: Math.round(parsedF * 10) / 10,
          labelBasisSize: parsedServing,
          rawNutrition: {
            calories: Math.round(parsedCal),
            protein: Math.round(parsedP * 10) / 10,
            carbs: Math.round(parsedC * 10) / 10,
            fat: Math.round(parsedF * 10) / 10,
          },
        });
      } else {
        // 自定義基準模式：依比例折算為單份數值儲存，並記憶原始標籤數值
        await onSubmit({
          name: name.trim(),
          category,
          brand: brand.trim() || undefined,
          servingSize: scaledSingleServing.servingSize,
          servingUnit: scaledSingleServing.servingUnit,
          calories: scaledSingleServing.calories,
          protein: scaledSingleServing.protein,
          carbs: scaledSingleServing.carbs,
          fat: scaledSingleServing.fat,
          labelBasisSize: parsedBasis,
          rawNutrition: {
            calories: parsedCal,
            protein: parsedP,
            carbs: parsedC,
            fat: parsedF,
          },
        });
      }

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formId = useId();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="z-[70]"
          className="z-[70] w-[340px] max-w-[calc(100vw-24px)] sm:w-[360px] sm:max-w-[360px] bg-card border border-border text-card-foreground p-5 sm:p-5 font-mono text-xs select-none shadow-none"
        >
          <DialogHeader className="p-0 pb-0 shrink-0">
            <div className="flex items-center justify-between w-full h-7">
              <DialogTitle className="text-foreground text-base sm:text-lg font-bold tracking-tight font-sans flex items-center gap-2">
                <Utensils className="size-4.5 text-foreground shrink-0" />
                <span>{isEdit ? t('settings.editCustomFood') : t('diet.addFood', '新增單品食材')}</span>
              </DialogTitle>
              <DialogClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                  />
                }
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <form id={formId} onSubmit={handleSubmit} className="space-y-3.5 pt-3.5 pb-0">
          {/* 表格段落 1: 基本資訊 (Vercel Usage List) */}
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground px-0 font-semibold">
              {t('diet.basicInfo')}
            </div>
            <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm font-sans">
              {/* 品牌 · 名稱 整合行 */}
              <div className="h-10 px-4 flex items-center justify-between gap-2 bg-card">
                <span className="text-muted-foreground text-xs shrink-0">{t('diet.foodName')}</span>
                <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end font-sans">
                  {/* 品牌 (選填) - 長度自適應之膠囊輸入框 */}
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder={brandPlaceholder}
                    style={{ width: `${brandWidth}px` }}
                    className="h-7 px-2.5 rounded-full border border-border/80 bg-background text-center text-xs font-sans text-muted-foreground focus:text-foreground focus:outline-none placeholder:text-muted-foreground/40 focus:border-foreground transition-all duration-100"
                  />

                  {/* 中間間隔點：固定常駐顯示 */}
                  <span className="text-muted-foreground/60 text-xs font-mono shrink-0 select-none">·</span>

                  {/* 食材名稱 (必填) - 長度自適應之膠囊輸入框 */}
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={namePlaceholder}
                    style={{ width: `${nameWidth}px` }}
                    className="h-7 px-2.5 rounded-full border border-border/80 bg-background text-center text-xs font-sans text-foreground font-medium focus:outline-none placeholder:text-muted-foreground/40 focus:border-foreground transition-all duration-100"
                  />
                </div>
              </div>

              {/* 分類 */}
              <div className="h-10 px-4 flex items-center justify-between">
                <span className="text-muted-foreground text-xs">{t('diet.foodCategory.title')}</span>
                <Select
                  value={category}
                  onValueChange={(val) => {
                    if (val) {
                      triggerHaptic('selection');
                      handleCategoryChange(val as FoodCategory);
                    }
                  }}
                >
                  <SelectTrigger
                    size="custom"
                    iconClassName="size-3 text-muted-foreground/60"
                    className="h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-muted font-sans text-xs flex items-center gap-1.5 transition-colors cursor-pointer text-foreground active:scale-95"
                  >
                    <SelectValue className="font-bold text-foreground">
                      {t(`diet.foodCategory.${category}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="end" className="min-w-36">
                    <SelectItem value="natural">{t('diet.foodCategory.natural')}</SelectItem>
                    <SelectItem value="processed">{t('diet.foodCategory.processed')}</SelectItem>
                    <SelectItem value="beverage">{t('diet.foodCategory.beverage')}</SelectItem>
                    <SelectItem value="oil">{t('diet.foodCategory.oil')}</SelectItem>
                    <SelectItem value="condiment">{t('diet.foodCategory.condiment')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 表格段落 2: 食用份量 (獨立卡片區塊) */}
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground px-0 font-semibold">
              {t('diet.serving')}
            </div>
            <div className="border border-border rounded-lg overflow-hidden bg-card text-sm">
              <div className="h-10 px-4 flex items-center justify-between">
                <span className="text-muted-foreground text-xs">{t('diet.serving')}</span>
                <button
                  type="button"
                  onClick={() => openPicker('serving')}
                  className="h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer text-foreground active:scale-95"
                >
                  <span className="font-bold">{servingSize}</span>
                  <span className="text-muted-foreground">{servingUnit}</span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                </button>
              </div>
            </div>
          </div>

          {/* 表格段落 3: 基準營養素 (純營養素輸入) */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between px-0">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                {t('diet.servingNutrients')}
              </div>

              {/* 28px 微型切換膠囊 (份量 vs 自定義) */}
              <div className="h-7 p-0.5 rounded-full border border-border bg-background inline-flex items-center text-xs font-mono select-none">
                <button
                  type="button"
                  onClick={() => {
                    if (basisMode !== 'serving') {
                      triggerHaptic('selection');
                      setBasisMode('serving');
                    }
                  }}
                  className={cn(
                    "h-full px-2.5 rounded-full transition-all cursor-pointer text-[11px] flex items-center justify-center whitespace-nowrap",
                    basisMode === 'serving'
                      ? "bg-foreground text-background font-medium shadow-none"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t('diet.byServing')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (basisMode !== 'custom') {
                      triggerHaptic('selection');
                      setBasisMode('custom');
                    }
                  }}
                  className={cn(
                    "h-full px-2.5 rounded-full transition-all cursor-pointer text-[11px] flex items-center justify-center whitespace-nowrap",
                    basisMode === 'custom'
                      ? "bg-foreground text-background font-medium shadow-none"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t('diet.customBasis')}
                </button>
              </div>
            </div>

            {/* Usage List 營養數據輸入卡 (純營養素) */}
            <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border text-sm">

              {/* 基準數值行 (固定顯示：選「份量」時不可編輯，選「自定義」時可自訂) */}
              <div className="h-10 px-4 flex items-center justify-between bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  {t('diet.perLabelBasis')}
                </span>
                {basisMode === 'serving' ? (
                  <div className="h-7 px-3 rounded-full border border-border/50 bg-muted/40 font-mono text-xs flex items-center gap-1.5 text-muted-foreground select-none">
                    <span className="font-bold text-foreground/75">{servingSize}</span>
                    <span className="text-xs text-muted-foreground">{servingUnit}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openPicker('basis')}
                    className="h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer text-foreground active:scale-95"
                  >
                    <span className="font-bold">{basisSize}</span>
                    <span className="text-muted-foreground">{servingUnit}</span>
                    <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                  </button>
                )}
              </div>

              {/* 熱量 */}
              <div className="h-10 px-4 flex items-center justify-between">
                <span className="text-calories text-xs font-medium">{t('diet.calories')}</span>
                <button
                  type="button"
                  onClick={() => openPicker('calories')}
                  className="h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer text-calories active:scale-95"
                >
                  <span className="font-bold">{calories || '0'}</span>
                  <span className="text-xs text-muted-foreground">kcal</span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                </button>
              </div>

              {/* 蛋白質 */}
              <div className="h-10 px-4 flex items-center justify-between">
                <span className="text-protein text-xs font-medium">{t('diet.protein')}</span>
                <button
                  type="button"
                  onClick={() => openPicker('protein')}
                  className="h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer text-protein active:scale-95"
                >
                  <span className="font-bold">{protein || '0'}</span>
                  <span className="text-xs text-muted-foreground">g</span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                </button>
              </div>

              {/* 碳水化合物 */}
              <div className="h-10 px-4 flex items-center justify-between">
                <span className="text-carbs text-xs font-medium">{t('diet.carbs')}</span>
                <button
                  type="button"
                  onClick={() => openPicker('carbs')}
                  className="h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer text-carbs active:scale-95"
                >
                  <span className="font-bold">{carbs || '0'}</span>
                  <span className="text-xs text-muted-foreground">g</span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                </button>
              </div>

              {/* 脂肪 */}
              <div className="h-10 px-4 flex items-center justify-between">
                <span className="text-fat text-xs font-medium">{t('diet.fat')}</span>
                <button
                  type="button"
                  onClick={() => openPicker('fat')}
                  className="h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer text-fat active:scale-95"
                >
                  <span className="font-bold">{fat || '0'}</span>
                  <span className="text-xs text-muted-foreground">g</span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                </button>
              </div>
            </div>
          </div>

          {/* DialogFooter (Rule: Cancel on left, Add/Save on right) */}
          <DialogFooter className="flex flex-row items-center justify-between gap-3 pt-1 pb-0 mt-0 [&_button]:h-8 [&_button]:text-xs">
            <DialogClose render={<Button type="button" variant="outline" className="border-border cursor-pointer h-8 text-xs min-w-[72px] px-4 font-normal" />}>
              {t('common.cancel')}
            </DialogClose>
            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="cursor-pointer h-8 text-xs min-w-[72px] px-4 font-medium"
            >
              {isEdit ? t('common.save') : t('common.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* 次級獨立數字升降選擇器：層級 z-[80]，平級兄弟節點聲明 (No Nested Dialogs) */}
    {pickerConfig && (
      <LiquidElevationPicker
        open={!!pickerConfig}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPickerConfig(null);
        }}
        title={pickerConfig.title}
        value={pickerConfig.value}
        unit={pickerConfig.unit}
        allowedUnits={pickerConfig.allowedUnits}
        disabledUnits={pickerConfig.disabledUnits}
        hint={pickerConfig.hint}
        min={pickerConfig.min}
        max={pickerConfig.max}
        step={pickerConfig.step}
        overlayClassName="z-[80]"
        className="z-[80]"
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerConfig(null)}
      />
    )}
    </>
  );
}
