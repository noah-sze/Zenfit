import type { MajorMuscleGroup, DetailedMuscle, ExerciseCategory, PredefinedEquipmentId } from '@/types';

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
  nameKey: string;
}

export const PREDEFINED_EQUIPMENT_DEFINITIONS: PredefinedEquipmentDefinition[] = [
  { id: 'barbell', nameKey: 'equipment.barbell' },
  { id: 'dumbbell', nameKey: 'equipment.dumbbell' },
  { id: 'kettlebell', nameKey: 'equipment.kettlebell' },
  { id: 'specialty_bar', nameKey: 'equipment.specialty_bar' },
  { id: 'cable', nameKey: 'equipment.cable' },
  { id: 'pin_loaded_machine', nameKey: 'equipment.pin_loaded_machine' },
  { id: 'plate_loaded_machine', nameKey: 'equipment.plate_loaded_machine' },
  { id: 'smith_machine', nameKey: 'equipment.smith_machine' },
  { id: 'leg_press', nameKey: 'equipment.leg_press' },
  { id: 'hack_squat', nameKey: 'equipment.hack_squat' },
  { id: 'bodyweight', nameKey: 'equipment.bodyweight' },
  { id: 'weighted_bodyweight', nameKey: 'equipment.weighted_bodyweight' },
  { id: 'resistance_band', nameKey: 'equipment.resistance_band' },
  { id: 'gymnastic_rings', nameKey: 'equipment.gymnastic_rings' },
  { id: 'cardio_machine', nameKey: 'equipment.cardio_machine' },
  { id: 'other', nameKey: 'equipment.other' },
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
