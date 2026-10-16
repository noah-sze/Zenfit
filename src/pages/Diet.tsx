import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useFoodLogs } from '@/hooks/useFoodLogs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { MealType, FoodLog } from '@/types';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function Diet() {
  const { t } = useTranslation();
  const { selectedDate, openAddModal } = useAppStore();
  const { mealGroups, deleteFoodLog, totals } = useFoodLogs(selectedDate);
  const confirm = useConfirm();

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  const handleDelete = async (item: FoodLog) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: `${t('common.confirm')} ${item.foodName}?`,
      variant: 'destructive',
    });
    if (ok) {
      await deleteFoodLog(item.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* 頂部全日總計卡片 */}
      <div className="p-4 bg-muted/40 border border-border/80 rounded-lg flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-widest text-muted-foreground block font-mono">
            {t('diet.consumed')}
          </span>
          <span className="text-2xl font-bold font-mono">
            {totals.calories} <span className="text-xs font-normal text-muted-foreground font-sans">kcal</span>
          </span>
        </div>

        <div className="flex gap-4 font-mono text-xs">
          <div>
            <span className="text-xs text-muted-foreground block">P</span>
            <span className="text-sm font-semibold">{Math.round(totals.protein)}g</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">C</span>
            <span className="text-sm font-semibold">{Math.round(totals.carbs)}g</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">F</span>
            <span className="text-sm font-semibold">{Math.round(totals.fat)}g</span>
          </div>
        </div>
      </div>

      {/* 四大餐別列表 */}
      {mealTypes.map((type) => {
        const items = mealGroups[type];
        const groupCalories = items.reduce((acc, curr) => acc + (curr.calories || 0), 0);
        const groupProtein = items.reduce((acc, curr) => acc + (curr.protein || 0), 0);

        return (
          <Card key={type} className="border border-border bg-card text-card-foreground shadow-none rounded-lg overflow-hidden">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border/40">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium tracking-tight">
                  {t(`diet.${type}`)}
                </CardTitle>
                <span className="text-xs font-mono text-muted-foreground">
                  {groupCalories} kcal · {Math.round(groupProtein)}g P
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => openAddModal('food')}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Plus className="size-4 mr-1" />
                {t('common.add')}
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {items.length > 0 ? (
                <div className="divide-y divide-border/40">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-normal text-foreground">
                          {item.foodName}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {item.quantity} {item.unit} · P: {item.protein}g · C: {item.carbs}g · F: {item.fat}g
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-semibold">
                          {item.calories} <span className="text-xs text-muted-foreground font-normal">kcal</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground/60">
                  {t('common.noData')}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
