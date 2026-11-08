// ============================================================================
// Zenfit 預設器械資料庫 (Default Equipments Ground Truth DB)
// 100% 確定性 RFC 4122 v5 靜態 UUID
// ============================================================================

import type { Equipment } from '@/types';

export const DEFAULT_EQUIPMENT_IDS = {
  barbell: '8f77d138-cf42-4c61-a344-1e2ff3f89b76',
  dumbbell: '1041b1ab-4eca-4803-9cd2-65c22e55b6da',
  kettlebell: '94e288d6-cf5c-4604-90d6-e2850dbc95a5',
  specialty_bar: 'd7d3f8d0-62b3-42cd-a522-32028e77243c',
  cable: '78b58539-5594-41c7-9a80-ab7d40ad29a9',
  pin_loaded_machine: '23ca870e-0ba1-4469-9762-32448fa33dc0',
  plate_loaded_machine: 'a699a092-d302-4808-9e4e-70de76de8422',
  smith_machine: '5e5cae97-df9e-4215-9f85-8594b2e0b3fd',
  leg_press: '9c7b6c1a-00ec-4c23-8e05-575f20c2742d',
  hack_squat: 'adeed8ce-b9ff-4aa3-9e0c-5f038704504b',
  bodyweight: '217a2140-a204-4166-96bf-5e1907698f71',
  weighted_bodyweight: '2d01e672-01bb-4fae-a610-9bd465521b0a',
  resistance_band: 'a61c5717-dc38-4da5-b606-80f81021b65e',
  gymnastic_rings: '483ee55b-c270-4443-917a-5aed86e9b8b8',
  cardio_machine: '50498079-511f-4fe6-876b-926b9fdeacaa',
  other: 'dd0054e9-27d8-4f55-bbb1-8db5446051e8',
} as const;

export type DefaultEquipmentKey = keyof typeof DEFAULT_EQUIPMENT_IDS;

export const DEFAULT_EQUIPMENTS: Equipment[] = [
  { id: DEFAULT_EQUIPMENT_IDS.barbell, name: '槓鈴', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.dumbbell, name: '啞鈴', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.kettlebell, name: '壺鈴', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.specialty_bar, name: '專項槓', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.cable, name: '繩索滑輪', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.pin_loaded_machine, name: '插銷式器械', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.plate_loaded_machine, name: '掛片式器械', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.smith_machine, name: '史密斯機', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.leg_press, name: '腿舉機', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.hack_squat, name: '哈克機', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.bodyweight, name: '徒手自重', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.weighted_bodyweight, name: '負重自重', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.resistance_band, name: '彈力帶', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.gymnastic_rings, name: '體操吊環', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.cardio_machine, name: '有氧設備', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
  { id: DEFAULT_EQUIPMENT_IDS.other, name: '其他', isCustom: false, isArchived: false, createdAt: 0, updatedAt: 0 },
];
