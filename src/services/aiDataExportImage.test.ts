import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  renderDailyExportToCanvas,
  generateDailyExportImageBlob,
  generateDailyExportImageDataUrl,
  DARK_PALETTE,
  LIGHT_PALETTE,
} from './aiDataExportImage';
import type { DailyExportPayload } from './aiDataExport';

describe('aiDataExportImage', () => {
  const mockPayload: DailyExportPayload = {
    date: '2026-04-17',
    scope: 'all',
    diet: {
      activityLevel: 1.55,
      activityLabel: '中度活動',
      macroSplit: { carbs: 40, protein: 30, fat: 30 },
      target: {
        calories: 2200,
        energyUnit: 'kcal',
        carbs: 220,
        protein: 165,
        fat: 73,
      },
      actual: {
        calories: 2150,
        energyUnit: 'kcal',
        carbs: 210,
        protein: 160,
        fat: 70,
      },
      calorieDiff: -50,
      meals: [
        {
          mealType: 'breakfast',
          mealLabel: '早餐',
          calories: 520,
          carbs: 45,
          protein: 30,
          fat: 12,
          items: [
            {
              type: 'food',
              name: '燕麥片',
              amount: '60g',
              calories: 233,
              carbs: 39.8,
              protein: 8.1,
              fat: 4.1,
            },
          ],
        },
        {
          mealType: 'lunch',
          mealLabel: '午餐',
          calories: 850,
          carbs: 95,
          protein: 60,
          fat: 25,
          items: [
            {
              type: 'recipe',
              name: '高蛋白雞肉飯',
              calories: 550,
              carbs: 65,
              protein: 45,
              fat: 10,
              ingredients: [],
            },
            {
              type: 'estimate',
              name: '燙青菜',
              calories: 80,
              carbs: 8,
              protein: 3,
              fat: 4,
            },
            {
              type: 'as_planned',
              name: '日常加餐配額',
              calories: 220,
              carbs: 22,
              protein: 12,
              fat: 11,
            },
          ],
        },
      ],
    },
    workout: {
      summary: {
        totalExercises: 2,
        totalSets: 6,
        totalVolume: 3400,
        weightUnit: 'kg',
      },
      sessions: [
        {
          routineTitle: '推日課表',
          exercises: [
            {
              name: '槓鈴臥推',
              equipment: '槓鈴',
              primaryMuscles: ['中下胸'],
              secondaryMuscles: ['三角肌前束'],
              sets: [
                { setNumber: 1, weight: 80, reps: 8, unit: 'kg' },
                { setNumber: 2, weight: 85, reps: 6, unit: 'kg', rpe: 8.5 },
              ],
            },
          ],
        },
      ],
    },
    body: {
      weight: 71.5,
      trendWeight: 72.0,
      weightUnit: 'kg',
      bodyFat: 14.8,
      circumferences: [
        { key: 'chest', label: '胸圍', value: 102, unit: 'cm' },
        { key: 'waist', label: '腰圍', value: 77, unit: 'cm' },
      ],
    },
  };

  beforeEach(() => {
    const mockCtx = {
      measureText: (text: string) => ({ width: text.length * 8 }),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      arcTo: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      clip: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textBaseline: 'top',
      textAlign: 'left',
    };

    const mockCanvas = {
      getContext: () => mockCtx,
      width: 0,
      height: 0,
      toBlob: (cb: (b: Blob | null) => void) => {
        cb(new Blob(['mock-png'], { type: 'image/png' }));
      },
      toDataURL: () => 'data:image/png;base64,mock',
    };

    const mockDocument = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return { ...mockCanvas } as unknown as HTMLCanvasElement;
        }
        return {} as unknown as HTMLElement;
      },
      documentElement: {
        classList: {
          contains: () => true,
        } as unknown as DOMTokenList,
      } as unknown as HTMLElement,
    } as unknown as Document;

    vi.stubGlobal('document', mockDocument);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Design Token Palettes', () => {
    it('defines accurate macro colors for dark mode', () => {
      expect(DARK_PALETTE.canvasBg).toBe('#09090b');
      expect(DARK_PALETTE.calories).toBe('#f43f5e');
      expect(DARK_PALETTE.carbs).toBe('#f59e0b');
      expect(DARK_PALETTE.protein).toBe('#38bdf8');
      expect(DARK_PALETTE.fat).toBe('#a78bfa');
    });

    it('defines accurate macro colors for light mode', () => {
      expect(LIGHT_PALETTE.canvasBg).toBe('#f4f4f5');
      expect(LIGHT_PALETTE.calories).toBe('#e11d48');
      expect(LIGHT_PALETTE.carbs).toBe('#d97706');
      expect(LIGHT_PALETTE.protein).toBe('#0284c7');
      expect(LIGHT_PALETTE.fat).toBe('#7c3aed');
    });
  });

  describe('renderDailyExportToCanvas', () => {
    it('calculates DPR scaled width & height correctly for dark theme', () => {
      const canvas = renderDailyExportToCanvas(mockPayload, {
        theme: 'dark',
        width: 480,
        dpr: 2,
      });

      expect(canvas.width).toBe(960);
      expect(canvas.height).toBeGreaterThan(400);
    });

    it('handles light theme without crashing', () => {
      const canvas = renderDailyExportToCanvas(mockPayload, {
        theme: 'light',
        width: 440,
        dpr: 1,
      });

      expect(canvas.width).toBe(440);
      expect(canvas.height).toBeGreaterThan(300);
    });

    it('renders scope-isolated payload (diet only) with multiple separated meal cards', () => {
      const dietPayload: DailyExportPayload = {
        date: '2026-04-17',
        scope: 'diet',
        diet: mockPayload.diet,
      };

      const canvas = renderDailyExportToCanvas(dietPayload);
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    });

    it('renders surplus calories branch correctly when actual > target', () => {
      const surplusPayload: DailyExportPayload = {
        date: '2026-04-17',
        scope: 'diet',
        diet: {
          ...mockPayload.diet!,
          actual: {
            calories: 2500,
            energyUnit: 'kcal',
            carbs: 260,
            protein: 190,
            fat: 90,
          },
          target: {
            calories: 2000,
            energyUnit: 'kcal',
            carbs: 200,
            protein: 150,
            fat: 65,
          },
          calorieDiff: 500,
        },
      };

      const canvas = renderDailyExportToCanvas(surplusPayload);
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    });

    it('renders empty sessions and empty meals gracefully', () => {
      const emptyPayload: DailyExportPayload = {
        date: '2026-04-17',
        scope: 'all',
        diet: {
          ...mockPayload.diet!,
          meals: [],
        },
        workout: {
          summary: {
            totalExercises: 0,
            totalSets: 0,
            totalVolume: 0,
            weightUnit: 'kg',
          },
          sessions: [],
        },
        body: {
          weightUnit: 'kg',
          circumferences: [],
        },
      };

      const canvas = renderDailyExportToCanvas(emptyPayload);
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    });
  });

  describe('generateDailyExportImageBlob & generateDailyExportImageDataUrl', () => {
    it('generates a valid image Blob with image/png mime type', async () => {
      const blob = await generateDailyExportImageBlob(mockPayload);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
    });

    it('generates a valid data URL string', () => {
      const dataUrl = generateDailyExportImageDataUrl(mockPayload);
      expect(dataUrl).toContain('data:image/png');
    });
  });
});
