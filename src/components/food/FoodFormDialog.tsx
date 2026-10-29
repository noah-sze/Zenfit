import { useState, useEffect, useMemo, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  PrecisionDialogContent,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NumericKeypadDialog } from '@/components/ui/NumericKeypadDialog';
import type { FoodItem, FoodCategory } from '@/types';
import { triggerHaptic } from '@/lib/haptics';
import { cn, formatDisplayAmount } from '@/lib/utils';
import { useUnitPreferences } from '@/hooks/useUnitPreferences';
import { scaleNutritionFromBasis } from '@/utils/nutritionMath';
import { convertFoodWeight, convertFoodVolume } from '@/utils/unitMath';
import { ChevronRight } from 'lucide-react';

type KeypadField = 'serving' | 'basis' | 'calories' | 'protein' | 'carbs' | 'fat';

interface KeypadConfig {
  field: KeypadField;
  title: string;
  value: number;
  unit: string;
  allowedUnits?: string[];
  allowDecimals?: boolean;
  maxDecimals?: number;
  anchorEl?: HTMLElement | null;
  valueClassName?: string;
  titleClassName?: string;
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
  const { foodWeightUnit, foodVolumeUnit, energyUnit } = useUnitPreferences();
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
  const [servingSize, setServingSize] = useState('');
  const [servingUnit, setServingUnit] = useState<string>(foodWeightUnit);

  // 標籤基準模式 ('serving' = 依份量, 'custom' = 自定義標籤依據如每 100g 或每 30g)
  const [basisMode, setBasisMode] = useState<'serving' | 'custom'>('serving');
  const [basisSize, setBasisSize] = useState('');
  const [basisUnit, setBasisUnit] = useState<string>(foodWeightUnit);

  // 熱量單位 ('kcal' | 'kJ')
  const [calorieUnit, setCalorieUnit] = useState<'kcal' | 'kJ'>(energyUnit);

  // 輸入之營養素數值 (對應當前 basisMode 下的輸入值)
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keypadConfig, setKeypadConfig] = useState<KeypadConfig | null>(null);

  // 當彈窗開啟或 initialData 改變時，智能識別並回填表單
  useEffect(() => {
    if (!open) return;

    if (initialData) {
      setName(initialData.name || '');
      setCategory(initialData.category || 'natural');
      setBrand(initialData.brand || '');
      setCalorieUnit(energyUnit);

      // 1. 份量一律對齊當前使用者偏好單位，若與原記錄單位不同則進行數值物理換算
      const isBeverage = initialData.category === 'beverage';
      const prefServingUnit = isBeverage ? foodVolumeUnit : foodWeightUnit;
      const rawServingUnit = initialData.servingUnit || prefServingUnit;
      const rawServingSize = typeof initialData.servingSize === 'number' ? initialData.servingSize : 0;

      let convertedServingSize = rawServingSize;
      if (rawServingUnit !== prefServingUnit && rawServingSize > 0) {
        if (isBeverage) {
          convertedServingSize = convertFoodVolume(
            rawServingSize,
            rawServingUnit as 'ml' | 'fl oz',
            prefServingUnit as 'ml' | 'fl oz',
            2
          );
        } else {
          convertedServingSize = convertFoodWeight(
            rawServingSize,
            rawServingUnit as 'g' | 'oz',
            prefServingUnit as 'g' | 'oz',
            2
          );
        }
      }

      setServingSize(convertedServingSize > 0 ? String(convertedServingSize) : '');
      setServingUnit(prefServingUnit);

      // 2. 下方的「每（標籤基準）」保持原樣：是英制就英制、公制就公制
      const rawBasisUnit = initialData.labelBasisUnit || rawServingUnit;
      const rawBasisSize =
        typeof initialData.labelBasisSize === 'number' && initialData.labelBasisSize > 0
          ? initialData.labelBasisSize
          : rawServingSize;

      setBasisUnit(rawBasisUnit);
      setBasisSize(rawBasisSize > 0 ? String(rawBasisSize) : '');

      // 3. 智能判斷原始信息：
      // 若標籤基準單位與當前份量單位不同，或標籤基準數值與份量數值不同，則判定為自定義標籤依據
      const hasCustomBasis =
        rawBasisUnit !== prefServingUnit ||
        (rawBasisSize > 0 && convertedServingSize > 0 && Math.abs(rawBasisSize - convertedServingSize) > 0.001) ||
        (typeof initialData.labelBasisSize === 'number' && initialData.labelBasisSize > 0 && Math.abs(initialData.labelBasisSize - rawServingSize) > 0.001);

      if (hasCustomBasis) {
        setBasisMode('custom');

        // 優先帶入當初記錄的原始標籤數值；若無則依比例逆向還原
        if (initialData.rawNutrition) {
          const rawCal = energyUnit === 'kJ'
            ? Math.round(initialData.rawNutrition.calories * 4.184 * 100) / 100
            : initialData.rawNutrition.calories;
          setCalories(rawCal > 0 ? String(rawCal) : '');
          setProtein(initialData.rawNutrition.protein ? String(initialData.rawNutrition.protein) : '');
          setCarbs(initialData.rawNutrition.carbs ? String(initialData.rawNutrition.carbs) : '');
          setFat(initialData.rawNutrition.fat ? String(initialData.rawNutrition.fat) : '');
        } else {
          const ratio = (rawBasisSize || 100) / (rawServingSize || 100);
          const baseCalKcal = initialData.calories * ratio;
          const finalCal = energyUnit === 'kJ' ? baseCalKcal * 4.184 : baseCalKcal;
          setCalories(finalCal > 0 ? String(Math.round(finalCal * 100) / 100) : '');
          setProtein(String(Math.round(initialData.protein * ratio * 100) / 100));
          setCarbs(String(Math.round(initialData.carbs * ratio * 100) / 100));
          setFat(String(Math.round(initialData.fat * ratio * 100) / 100));
        }
      } else {
        setBasisMode('serving');
        const displayCal = energyUnit === 'kJ'
          ? Math.round(initialData.calories * 4.184 * 100) / 100
          : initialData.calories;
        setCalories(displayCal > 0 ? String(displayCal) : '');
        setProtein(initialData.protein ? String(initialData.protein) : '');
        setCarbs(initialData.carbs ? String(initialData.carbs) : '');
        setFat(initialData.fat ? String(initialData.fat) : '');
      }
    } else {
      // 新增模式：完全純淨無初始數值
      setName('');
      setCategory('natural');
      setBrand('');
      setServingSize('');
      setServingUnit(foodWeightUnit);
      setBasisMode('serving');
      setBasisSize('');
      setBasisUnit(foodWeightUnit);
      setCalorieUnit(energyUnit);
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
    }
  }, [open, initialData, foodWeightUnit, foodVolumeUnit, energyUnit]);

  // 當分類切換時，自動同步用戶偏好單位
  const handleCategoryChange = (newCat: FoodCategory) => {
    setCategory(newCat);
    const targetUnit = newCat === 'beverage' ? foodVolumeUnit : foodWeightUnit;
    setServingUnit(targetUnit);
    if (basisMode === 'serving') {
      setBasisUnit(targetUnit);
    }
  };

  // 即時純數學折算單份數據
  const parsedServing = Math.max(0, parseFloat(servingSize) || 0);
  const parsedBasis = Math.max(0, parseFloat(basisSize) || 0);
  const parsedCal = Math.max(0, parseFloat(calories) || 0);
  const parsedP = Math.max(0, parseFloat(protein) || 0);
  const parsedC = Math.max(0, parseFloat(carbs) || 0);
  const parsedF = Math.max(0, parseFloat(fat) || 0);

  const roundTo2 = (num: number) => Math.round(num * 100) / 100;
  const formatNum2 = (val: number) => (val > 0 ? String(roundTo2(val)) : '');

  // 記錄開啟鍵盤時的初始狀態，供取消時安全回滾 (Revert)
  const initialKeypadValueRef = useRef<{ value: string; unit: string } | null>(null);

  // 打開移植自 Zenance 的懸浮/吸附數字鍵盤
  const openKeypad = (field: KeypadField, targetEl?: HTMLElement | null) => {
    triggerHaptic('selection');
    switch (field) {
      case 'serving': {
        const prefUnit = category === 'beverage' ? foodVolumeUnit : foodWeightUnit;
        const currentServingUnit = servingUnit || prefUnit;
        initialKeypadValueRef.current = { value: servingSize, unit: currentServingUnit };
        setKeypadConfig({
          field: 'serving',
          title: t('diet.serving'),
          value: parsedServing > 0 ? parsedServing : 0,
          unit: currentServingUnit,
          // 份量無需多單位選擇，嚴格使用用戶偏好設置
          allowDecimals: true,
          maxDecimals: 2,
          anchorEl: targetEl || null,
          valueClassName: 'text-foreground',
        });
        break;
      }
      case 'basis': {
        const isLiquid = category === 'beverage' || basisUnit === 'ml' || basisUnit === 'fl oz';
        const allowedUnits = isLiquid
          ? (foodVolumeUnit === 'fl oz' ? ['fl oz', 'ml'] : ['ml', 'fl oz'])
          : (foodWeightUnit === 'oz' ? ['oz', 'g'] : ['g', 'oz']);

        initialKeypadValueRef.current = { value: basisSize, unit: basisUnit };
        setKeypadConfig({
          field: 'basis',
          title: t('diet.perLabelBasis'),
          value: parsedBasis > 0 ? parsedBasis : 0,
          unit: basisUnit,
          allowedUnits,
          allowDecimals: true,
          maxDecimals: 2,
          anchorEl: targetEl || null,
          valueClassName: 'text-foreground',
        });
        break;
      }
      case 'calories': {
        initialKeypadValueRef.current = { value: calories, unit: calorieUnit };
        setKeypadConfig({
          field: 'calories',
          title: t('diet.calories'),
          value: parsedCal > 0 ? parsedCal : 0,
          unit: calorieUnit,
          allowedUnits: energyUnit === 'kJ' ? ['kJ', 'kcal'] : ['kcal', 'kJ'],
          allowDecimals: true,
          maxDecimals: 2,
          anchorEl: targetEl || null,
          valueClassName: 'text-calories',
        });
        break;
      }
      case 'protein': {
        initialKeypadValueRef.current = { value: protein, unit: 'g' };
        setKeypadConfig({
          field: 'protein',
          title: t('diet.protein'),
          value: parsedP > 0 ? parsedP : 0,
          unit: 'g',
          allowDecimals: true,
          maxDecimals: 2,
          anchorEl: targetEl || null,
          valueClassName: 'text-protein',
        });
        break;
      }
      case 'carbs': {
        initialKeypadValueRef.current = { value: carbs, unit: 'g' };
        setKeypadConfig({
          field: 'carbs',
          title: t('diet.carbs'),
          value: parsedC > 0 ? parsedC : 0,
          unit: 'g',
          allowDecimals: true,
          maxDecimals: 2,
          anchorEl: targetEl || null,
          valueClassName: 'text-carbs',
        });
        break;
      }
      case 'fat': {
        initialKeypadValueRef.current = { value: fat, unit: 'g' };
        setKeypadConfig({
          field: 'fat',
          title: t('diet.fat'),
          value: parsedF > 0 ? parsedF : 0,
          unit: 'g',
          allowDecimals: true,
          maxDecimals: 2,
          anchorEl: targetEl || null,
          valueClassName: 'text-fat',
        });
        break;
      }
    }
  };

  // 即時雙向鏡像同步：原位列表行即時隨鍵盤按鍵更新預覽
  const handleKeypadLiveChange = (val: number, nextUnit: string) => {
    if (!keypadConfig) return;
    switch (keypadConfig.field) {
      case 'serving':
        setServingSize(formatNum2(val));
        setServingUnit(nextUnit);
        break;
      case 'basis':
        setBasisSize(formatNum2(val));
        setBasisUnit(nextUnit);
        break;
      case 'calories':
        setCalories(formatNum2(val));
        setCalorieUnit(nextUnit as 'kcal' | 'kJ');
        break;
      case 'protein':
        setProtein(formatNum2(val));
        break;
      case 'carbs':
        setCarbs(formatNum2(val));
        break;
      case 'fat':
        setFat(formatNum2(val));
        break;
    }
  };

  // 取消/關閉時安全回滾為開啟前的初始值
  const handleKeypadCancel = () => {
    if (!keypadConfig || !initialKeypadValueRef.current) {
      setKeypadConfig(null);
      return;
    }
    const { value: prevVal, unit: prevUnit } = initialKeypadValueRef.current;
    switch (keypadConfig.field) {
      case 'serving':
        setServingSize(prevVal);
        setServingUnit(prevUnit);
        break;
      case 'basis':
        setBasisSize(prevVal);
        setBasisUnit(prevUnit);
        break;
      case 'calories':
        setCalories(prevVal);
        setCalorieUnit(prevUnit as 'kcal' | 'kJ');
        break;
      case 'protein':
        setProtein(prevVal);
        break;
      case 'carbs':
        setCarbs(prevVal);
        break;
      case 'fat':
        setFat(prevVal);
        break;
    }
    setKeypadConfig(null);
  };

  const handleKeypadConfirm = (val: number, nextUnit: string) => {
    if (!keypadConfig) return;
    switch (keypadConfig.field) {
      case 'serving':
        setServingSize(formatNum2(val));
        setServingUnit(nextUnit);
        break;
      case 'basis':
        setBasisSize(formatNum2(val));
        setBasisUnit(nextUnit);
        break;
      case 'calories':
        setCalories(formatNum2(val));
        setCalorieUnit(nextUnit as 'kcal' | 'kJ');
        break;
      case 'protein':
        setProtein(formatNum2(val));
        break;
      case 'carbs':
        setCarbs(formatNum2(val));
        break;
      case 'fat':
        setFat(formatNum2(val));
        break;
    }
    setKeypadConfig(null);
  };

  // 若以 kJ 輸入，存儲時以國際標準 1 kcal = 4.184 kJ 精確折算為大卡
  const normalizedCalories = calorieUnit === 'kJ'
    ? roundTo2(parsedCal / 4.184)
    : roundTo2(parsedCal);

  const scaledSingleServing = useMemo(() => {
    if (basisMode === 'serving') {
      return {
        calories: normalizedCalories,
        protein: roundTo2(parsedP),
        carbs: roundTo2(parsedC),
        fat: roundTo2(parsedF),
        servingSize: roundTo2(parsedServing),
        servingUnit,
      };
    }

    return scaleNutritionFromBasis({
      calories: normalizedCalories,
      protein: parsedP,
      carbs: parsedC,
      fat: parsedF,
      servingSize: parsedServing,
      servingUnit,
      basisSize: parsedBasis > 0 ? parsedBasis : parsedServing,
      basisUnit: parsedBasis > 0 ? basisUnit : servingUnit,
    });
  }, [basisMode, normalizedCalories, parsedP, parsedC, parsedF, parsedServing, parsedBasis, servingUnit, basisUnit]);

  // 表單送出處理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting || !servingSize || parseFloat(servingSize) <= 0) return;

    setIsSubmitting(true);
    try {
      if (basisMode === 'serving') {
        await onSubmit({
          name: name.trim(),
          category,
          brand: brand.trim() || undefined,
          servingSize: parsedServing,
          servingUnit: servingUnit.trim() || 'g',
          calories: normalizedCalories,
          protein: roundTo2(parsedP),
          carbs: roundTo2(parsedC),
          fat: roundTo2(parsedF),
          labelBasisSize: parsedServing,
          labelBasisUnit: servingUnit.trim() || 'g',
          rawNutrition: {
            calories: roundTo2(parsedCal),
            protein: roundTo2(parsedP),
            carbs: roundTo2(parsedC),
            fat: roundTo2(parsedF),
          },
        });
      } else {
        // 自定義基準模式：依比例折算為單份數值儲存，並記憶原始標籤數值與基準單位
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
          labelBasisSize: parsedBasis > 0 ? parsedBasis : parsedServing,
          labelBasisUnit: parsedBasis > 0 ? basisUnit : servingUnit,
          rawNutrition: {
            calories: roundTo2(parsedCal),
            protein: roundTo2(parsedP),
            carbs: roundTo2(parsedC),
            fat: roundTo2(parsedF),
          },
        });
      }

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 處理主彈窗開關事件：當次級懸浮鍵盤 (keypadConfig) 處於開啟狀態時，
  // 阻斷因鍵盤內部選單、單位切換或外部焦點轉移觸發的主彈窗非預期關閉
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && keypadConfig) {
      return;
    }
    onOpenChange(nextOpen);
  };

  // 即時單位變更聯動
  const handleKeypadUnitChange = (nextUnit: string) => {
    if (!keypadConfig) return;
    if (keypadConfig.field === 'serving') {
      setServingUnit(nextUnit);
      if (basisMode === 'serving') {
        setBasisUnit(nextUnit);
      }
    } else if (keypadConfig.field === 'basis') {
      setBasisUnit(nextUnit);
    } else if (keypadConfig.field === 'calories') {
      setCalorieUnit(nextUnit as 'kcal' | 'kJ');
    }
  };

  // 格式化數值膠囊內容：有值時加粗並賦予專屬色，為空 (-) 時呈現極淡佔位色
  const renderAmountValue = (val: string, activeClass: string = 'text-foreground') => {
    if (val) {
      return <span className={cn("font-bold", activeClass)}>{formatDisplayAmount(val)}</span>;
    }
    return <span className="font-normal text-muted-foreground/40 select-none">-</span>;
  };

  const formId = useId();

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <PrecisionDialogContent
          title={isEdit ? t('settings.editCustomFood') : t('diet.addFood', '新增單品食材')}
          form={formId}
          submitDisabled={!name.trim() || isSubmitting || !servingSize || parseFloat(servingSize) <= 0}
          submitAriaLabel={isEdit ? t('common.save') : t('common.add')}
          cancelAriaLabel={t('common.cancel')}
          overlayClassName="z-[70]"
          className="z-[70]"
        >

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
                  onClick={(e) => openKeypad('serving', e.currentTarget)}
                  className={cn(
                    "h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 select-none",
                    servingSize ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {renderAmountValue(servingSize, "text-foreground")}
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
                      setBasisUnit(servingUnit);
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
                    {renderAmountValue(servingSize, "text-foreground/75")}
                    <span className="text-xs text-muted-foreground">{servingUnit}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => openKeypad('basis', e.currentTarget)}
                    className={cn(
                      "h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 select-none",
                      basisSize ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {renderAmountValue(basisSize, "text-foreground")}
                    <span className="text-muted-foreground">{basisUnit}</span>
                    <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                  </button>
                )}
              </div>

              {/* 熱量 */}
              <div className="h-10 px-4 flex items-center justify-between">
                <span className="text-calories text-xs font-medium">{t('diet.calories')}</span>
                <button
                  type="button"
                  onClick={(e) => openKeypad('calories', e.currentTarget)}
                  className={cn(
                    "h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 select-none",
                    calories ? "text-calories" : "text-muted-foreground"
                  )}
                >
                  {renderAmountValue(calories, "text-calories")}
                  <span className="text-xs text-muted-foreground">{calorieUnit}</span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                </button>
              </div>

              {/* 碳水化合物 */}
              <div className="h-10 px-4 flex items-center justify-between">
                <span className="text-carbs text-xs font-medium">{t('diet.carbs')}</span>
                <button
                  type="button"
                  onClick={(e) => openKeypad('carbs', e.currentTarget)}
                  className={cn(
                    "h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 select-none",
                    carbs ? "text-carbs" : "text-muted-foreground"
                  )}
                >
                  {renderAmountValue(carbs, "text-carbs")}
                  <span className="text-xs text-muted-foreground">g</span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                </button>
              </div>

              {/* 蛋白質 */}
              <div className="h-10 px-4 flex items-center justify-between">
                <span className="text-protein text-xs font-medium">{t('diet.protein')}</span>
                <button
                  type="button"
                  onClick={(e) => openKeypad('protein', e.currentTarget)}
                  className={cn(
                    "h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 select-none",
                    protein ? "text-protein" : "text-muted-foreground"
                  )}
                >
                  {renderAmountValue(protein, "text-protein")}
                  <span className="text-xs text-muted-foreground">g</span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                </button>
              </div>

              {/* 脂肪 */}
              <div className="h-10 px-4 flex items-center justify-between">
                <span className="text-fat text-xs font-medium">{t('diet.fat')}</span>
                <button
                  type="button"
                  onClick={(e) => openKeypad('fat', e.currentTarget)}
                  className={cn(
                    "h-7 px-3 rounded-full border border-border/80 bg-background hover:bg-muted font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 select-none",
                    fat ? "text-fat" : "text-muted-foreground"
                  )}
                >
                  {renderAmountValue(fat, "text-fat")}
                  <span className="text-xs text-muted-foreground">g</span>
                  <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                </button>
              </div>
            </div>
          </div>

          {/* 方案 D 徹底無底欄，表單內容直達底部 */}
        </form>
      </PrecisionDialogContent>
    </Dialog>

    {/* 響應式精密數字鍵盤輸入器：桌面端懸浮 Popover / 手機端底部吸附鍵盤 */}
    {keypadConfig && (
      <NumericKeypadDialog
        open={!!keypadConfig}
        onOpenChange={(isOpen) => {
          if (!isOpen) setKeypadConfig(null);
        }}
        anchorEl={keypadConfig.anchorEl}
        title={keypadConfig.title}
        value={keypadConfig.value}
        unit={keypadConfig.unit}
        allowedUnits={keypadConfig.allowedUnits}
        allowDecimals={keypadConfig.allowDecimals}
        maxDecimals={keypadConfig.maxDecimals}
        onConfirm={handleKeypadConfirm}
        onCancel={handleKeypadCancel}
        onLiveChange={handleKeypadLiveChange}
        onUnitChange={handleKeypadUnitChange}
        valueClassName={keypadConfig.valueClassName}
        titleClassName={keypadConfig.titleClassName || keypadConfig.valueClassName}
      />
    )}
    </>
  );
}
