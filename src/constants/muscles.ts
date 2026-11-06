import type { MajorMuscleGroup, DetailedMuscle, ExerciseCategory, PredefinedEquipmentId } from '@/types';
import { DEFAULT_EQUIPMENT_IDS } from '@/services/db/defaultData';

export interface MajorMuscleGroupDefinition {
  id: MajorMuscleGroup;
  detailedMuscles: DetailedMuscle[];
}

export const MAJOR_MUSCLE_GROUPS: MajorMuscleGroupDefinition[] = [
  {
    id: 'chest',
    detailedMuscles: ['upper_chest', 'mid_lower_chest'],
  },
  {
    id: 'back',
    detailedMuscles: ['lats', 'upper_back_traps', 'lower_back'],
  },
  {
    id: 'shoulders',
    detailedMuscles: ['front_delts', 'side_delts', 'rear_delts'],
  },
  {
    id: 'arms',
    detailedMuscles: ['biceps', 'triceps', 'forearms'],
  },
  {
    id: 'legs',
    detailedMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
  },
  {
    id: 'core',
    detailedMuscles: ['abs', 'obliques'],
  },
];

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  'free_weight',
  'machine',
  'bodyweight',
  'cardio',
];

export interface PredefinedEquipmentDefinition {
  id: PredefinedEquipmentId;
  slug: string;
  nameKey: string;
}

export const PREDEFINED_EQUIPMENT_DEFINITIONS: PredefinedEquipmentDefinition[] = [
  { id: DEFAULT_EQUIPMENT_IDS.barbell, slug: 'barbell', nameKey: 'equipment.barbell' },
  { id: DEFAULT_EQUIPMENT_IDS.dumbbell, slug: 'dumbbell', nameKey: 'equipment.dumbbell' },
  { id: DEFAULT_EQUIPMENT_IDS.kettlebell, slug: 'kettlebell', nameKey: 'equipment.kettlebell' },
  { id: DEFAULT_EQUIPMENT_IDS.specialty_bar, slug: 'specialty_bar', nameKey: 'equipment.specialty_bar' },
  { id: DEFAULT_EQUIPMENT_IDS.cable, slug: 'cable', nameKey: 'equipment.cable' },
  { id: DEFAULT_EQUIPMENT_IDS.pin_loaded_machine, slug: 'pin_loaded_machine', nameKey: 'equipment.pin_loaded_machine' },
  { id: DEFAULT_EQUIPMENT_IDS.plate_loaded_machine, slug: 'plate_loaded_machine', nameKey: 'equipment.plate_loaded_machine' },
  { id: DEFAULT_EQUIPMENT_IDS.smith_machine, slug: 'smith_machine', nameKey: 'equipment.smith_machine' },
  { id: DEFAULT_EQUIPMENT_IDS.leg_press, slug: 'leg_press', nameKey: 'equipment.leg_press' },
  { id: DEFAULT_EQUIPMENT_IDS.hack_squat, slug: 'hack_squat', nameKey: 'equipment.hack_squat' },
  { id: DEFAULT_EQUIPMENT_IDS.bodyweight, slug: 'bodyweight', nameKey: 'equipment.bodyweight' },
  { id: DEFAULT_EQUIPMENT_IDS.weighted_bodyweight, slug: 'weighted_bodyweight', nameKey: 'equipment.weighted_bodyweight' },
  { id: DEFAULT_EQUIPMENT_IDS.resistance_band, slug: 'resistance_band', nameKey: 'equipment.resistance_band' },
  { id: DEFAULT_EQUIPMENT_IDS.gymnastic_rings, slug: 'gymnastic_rings', nameKey: 'equipment.gymnastic_rings' },
  { id: DEFAULT_EQUIPMENT_IDS.cardio_machine, slug: 'cardio_machine', nameKey: 'equipment.cardio_machine' },
  { id: DEFAULT_EQUIPMENT_IDS.other, slug: 'other', nameKey: 'equipment.other' },
];

export const EQUIPMENT_TYPES: PredefinedEquipmentId[] = PREDEFINED_EQUIPMENT_DEFINITIONS.map((e) => e.id);

export function getMajorGroupForDetailedMuscle(muscle: DetailedMuscle): MajorMuscleGroup | undefined {
  for (const group of MAJOR_MUSCLE_GROUPS) {
    if (group.detailedMuscles.includes(muscle)) {
      return group.id;
    }
  }
  return undefined;
}
