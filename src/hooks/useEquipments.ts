import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db/db';
import type { Equipment } from '@/types';
import { PREDEFINED_EQUIPMENT_DEFINITIONS } from '@/constants/muscles';
import { v4 as uuidv4 } from 'uuid';
import type { TFunction } from 'i18next';

export function useEquipments() {
  const equipments = useLiveQuery(
    () => db.equipments.toArray(),
    [],
    [] as Equipment[]
  );

  const activeEquipments = equipments.filter((e) => !e.isArchived);
  const archivedEquipments = equipments.filter((e) => e.isArchived);
  const customEquipments = equipments.filter((e) => e.isCustom && !e.isArchived);
  const archivedCustomEquipments = equipments.filter((e) => e.isCustom && e.isArchived);

  const addCustomEquipment = async (name: string): Promise<{ success: boolean; equipment?: Equipment; error?: string }> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'empty_name' };
    }

    const existing = equipments.find((e) => e.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (existing.isArchived) {
        await db.equipments.update(existing.id, { isArchived: false, updatedAt: Date.now() });
        return { success: true, equipment: { ...existing, isArchived: false } };
      }
      return { success: true, equipment: existing };
    }

    const now = Date.now();
    const newEquipment: Equipment = {
      id: uuidv4(),
      name: trimmed,
      isCustom: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.equipments.add(newEquipment);
    return { success: true, equipment: newEquipment };
  };

  const updateEquipment = async (id: string, name: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'empty_name' };
    }

    const eq = equipments.find((e) => e.id === id);
    if (!eq) {
      return { success: false, error: 'not_found' };
    }

    await db.equipments.update(id, {
      name: trimmed,
      updatedAt: Date.now(),
    });

    return { success: true };
  };

  const archiveEquipment = async (id: string): Promise<void> => {
    await db.equipments.update(id, {
      isArchived: true,
      updatedAt: Date.now(),
    });
  };

  const unarchiveEquipment = async (id: string): Promise<void> => {
    await db.equipments.update(id, {
      isArchived: false,
      updatedAt: Date.now(),
    });
  };

  const deleteEquipment = async (id: string): Promise<{ success: boolean; reason?: 'has_exercises' | 'system_preset' }> => {
    const eq = equipments.find((e) => e.id === id);
    if (!eq || !eq.isCustom) {
      return { success: false, reason: 'system_preset' };
    }

    // 檢查是否有動作正在使用此器械
    const usedCount = await db.exercises.where('equipment').equals(id).count();
    if (usedCount > 0) {
      return { success: false, reason: 'has_exercises' };
    }

    await db.equipments.delete(id);
    return { success: true };
  };

  const getEquipmentDisplayName = (equipmentId: string, t: TFunction): string => {
    const predefined = PREDEFINED_EQUIPMENT_DEFINITIONS.find((p) => p.id === equipmentId);
    if (predefined) {
      return t(predefined.nameKey);
    }
    const found = equipments.find((e) => e.id === equipmentId);
    if (found) {
      return found.name;
    }
    // 相容歷史舊字串
    if (equipmentId === 'machine') return t('equipment.pin_loaded_machine');
    return equipmentId;
  };

  return {
    equipments,
    activeEquipments,
    archivedEquipments,
    customEquipments,
    archivedCustomEquipments,
    addCustomEquipment,
    updateEquipment,
    archiveEquipment,
    unarchiveEquipment,
    deleteEquipment,
    getEquipmentDisplayName,
  };
}
