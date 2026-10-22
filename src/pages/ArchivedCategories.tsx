import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFoods } from '@/hooks/useFoods';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from '@/components/ui/toast';

export default function ArchivedCategories() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { archivedCustomFoods, archivedPresetFoods, unarchiveFood } = useFoods();

  const [activeTab, setActiveTab] = useState<'custom' | 'preset'>('custom');

  const filteredFoods = activeTab === 'custom' ? archivedCustomFoods : archivedPresetFoods;

  const handleUnarchive = async (id: string) => {
    await unarchiveFood(id);
    triggerHaptic('selection');
    toast.show(t('settings.unarchivedSuccess', '已取消歸檔'));
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-20">
      <SegmentedControl<'custom' | 'preset'>
        value={activeTab}
        onChange={setActiveTab}
        fullWidth
        options={[
          {
            value: 'custom',
            label: t('settings.customFoods', '自定義食物'),
          },
          {
            value: 'preset',
            label: t('settings.presetFoods', '預設食材'),
          },
        ]}
      />

      <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground">
        <div className="divide-y divide-border">
          {filteredFoods.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t('settings.noArchivedFoods', '暫無已歸檔食物')}
            </div>
          ) : (
            filteredFoods.map((food) => (
              <div
                key={food.id}
                className="flex items-center justify-between p-3 pl-4 group hover:bg-muted/40 transition-colors"
              >
                <button
                  type="button"
                  className="flex-1 flex flex-col justify-center text-left cursor-pointer min-w-0 select-none"
                  onClick={() => navigate(`/settings/foods/${food.id}`)}
                >
                  <span className="font-medium text-sm text-muted-foreground hover:underline truncate">
                    {food.name}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground/70 truncate">
                    {food.calories} kcal · {food.servingSize} {food.servingUnit}
                  </span>
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer shrink-0"
                  onClick={() => handleUnarchive(food.id)}
                >
                  <RefreshCcw className="h-4 w-4 mr-1.5" />
                  {t('settings.unarchive', '取消歸檔')}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
