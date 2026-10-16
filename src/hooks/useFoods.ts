import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { FoodItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export function useFoods(searchQuery = '') {
  const foods = useLiveQuery(
    async () => {
      const all = await db.foods.toArray();
      const activeFoods = all.filter((item) => !item.isArchived);
      if (!searchQuery.trim()) {
        return activeFoods;
      }
      const q = searchQuery.toLowerCase().trim();
      return activeFoods.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.brand && item.brand.toLowerCase().includes(q))
      );
    },
    [searchQuery]
  );

  const addFood = async (data: Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt' | 'isCustom'>) => {
    const now = Date.now();
    const newFood: FoodItem = {
      ...data,
      id: uuidv4(),
      isCustom: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.foods.add(newFood);
    return newFood.id;
  };

  const deleteFood = async (id: string) => {
    await db.foods.update(id, { isArchived: true, updatedAt: Date.now() });
  };

  return {
    foods: foods || [],
    isLoading: foods === undefined,
    addFood,
    deleteFood,
  };
}
