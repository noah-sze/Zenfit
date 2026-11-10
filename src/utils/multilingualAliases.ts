// ============================================================================
// Zenfit 權威領域雙語別名庫 (Authoritative Multilingual & Fitness Slang Registry)
// 涵蓋飲食 Top 50 兩岸三地異名同物、健身動作 Top 30 權威縮寫與黑話
// 純前端記憶體靜態常數索引，零 DB 存儲開銷，體積嚴控 < 30KB
// ============================================================================

import { NATURAL_FOOD_IDS } from '@/services/db/defaultNaturalFoods';
import { DEFAULT_EXERCISE_IDS } from '@/services/db/defaultExercises';

// ----------------------------------------------------------------------------
// 1. 飲食領域權威雙語別名庫 (Top 50 Food Domain Registry)
// ----------------------------------------------------------------------------
export const FOOD_ALIASES_REGISTRY: Record<string, readonly string[]> = {
  // 1. 番茄 / 西紅柿 / tomato
  [NATURAL_FOOD_IDS.beef_tomato_raw]: ['番茄', '牛番茄', '西紅柿', '洋柿子', '蕃茄', '柑仔蜜', 'tomato', 'tomatoes'],
  [NATURAL_FOOD_IDS.cherry_tomato]: ['小番茄', '聖女果', '櫻桃番茄', '小西紅柿', '聖女番茄', 'cherry tomato'],

  // 2. 馬鈴薯 / 土豆 / 洋芋 / potato
  [NATURAL_FOOD_IDS.potato_raw]: ['馬鈴薯', '土豆', '洋芋', '地蛋', '薯仔', 'potato', 'potatoes', 'spud'],

  // 3. 花椰菜 / 菜花 / cauliflower
  [NATURAL_FOOD_IDS.cauliflower_raw]: ['花椰菜', '白花菜', '白花椰菜', '菜花', '花菜', '椰菜花', 'cauliflower'],

  // 4. 青花菜 / 西藍花 / broccoli
  [NATURAL_FOOD_IDS.broccoli_raw]: ['青花菜', '西藍花', '西蘭花', '綠花椰', '綠花椰菜', '綠花菜', '花西蘭', 'fsl', 'xlh', 'broccoli'],

  // 5. 鮭魚 / 三文魚 / salmon
  [NATURAL_FOOD_IDS.salmon_atlantic_raw]: ['鮭魚', '三文魚', '大西洋鮭', '大西洋鮭魚', '撒蒙魚', 'salmon'],

  // 6. 酪梨 / 牛油果 / avocado
  [NATURAL_FOOD_IDS.avocado_raw]: ['酪梨', '牛油果', '鱷梨', '油梨', '樟梨', 'avocado'],

  // 7. 奇異果 / 獼猴桃 / kiwi
  [NATURAL_FOOD_IDS.kiwifruit_raw]: ['奇異果', '綠奇異果', '獼猴桃', '藤梨', '陽桃', 'kiwi', 'kiwifruit'],
  [NATURAL_FOOD_IDS.golden_kiwifruit_raw]: ['黃金奇異果', '金奇異果', '黃金獼猴桃', 'golden kiwi'],

  // 8. 高麗菜 / 包菜 / 捲心菜 / cabbage
  [NATURAL_FOOD_IDS.cabbage_raw]: ['高麗菜', '捲心菜', '包菜', '圓白菜', '甘藍', '椰菜', 'cabbage'],

  // 9. 鮪魚 / 金槍魚 / 吞拿魚 / tuna
  [NATURAL_FOOD_IDS.yellowfin_tuna]: ['鮪魚', '金槍魚', '黃鰭鮪魚', '吞拿魚', '金槍', '黃鰭金槍魚', 'tuna'],

  // 10. 鳳梨 / 菠蘿 / pineapple
  [NATURAL_FOOD_IDS.pineapple_raw]: ['鳳梨', '菠蘿', '黃梨', 'pineapple'],

  // 11. 柳橙 / 橙子 / 柳丁 / orange
  [NATURAL_FOOD_IDS.orange_raw]: ['柳橙', '橙子', '柳丁', '甜橙', '香橙', 'orange'],

  // 12. 奇亞籽 / chia seeds
  [NATURAL_FOOD_IDS.chia_seed_raw]: ['奇亞籽', '芡歐鼠尾草籽', '奇雅子', 'chia seeds', 'chia'],

  // 13. 燕麥片 / oats
  [NATURAL_FOOD_IDS.oat_flakes_raw]: ['燕麥片', '大燕麥片', '純麥片', '麥片', '燕麥', 'oats', 'oatmeal', 'rolled oats'],
  [NATURAL_FOOD_IDS.whole_oat_groats_yanmaimi]: ['燕麥米', '燕麥粒', '全燕麥', 'oat groats'],

  // 14. 希臘優格 / 希臘酸奶 / greek yogurt
  [NATURAL_FOOD_IDS.greek_yogurt_plain_whole]: ['希臘優格', '希臘酸奶', '脫乳清酸奶', '希臘式優格', '希臘式酸奶', 'greek yogurt'],

  // 15. 茅屋乳酪 / 茅屋芝士 / cottage cheese
  [NATURAL_FOOD_IDS.cottage_cheese]: ['茅屋乳酪', '茅屋起司', '茅屋芝士', '鄉村奶酪', '鄉村起司', 'cottage cheese'],

  // 16. 地瓜 / 紅薯 / 番薯 / sweet potato
  [NATURAL_FOOD_IDS.sweet_potato_yellow_raw]: ['地瓜', '黃金地瓜', '紅薯', '番薯', '山芋', '白薯', 'sweet potato', 'yam'],
  [NATURAL_FOOD_IDS.purple_sweet_potato]: ['紫地瓜', '紫薯', '紫心番薯', 'purple sweet potato'],

  // 17. 甜椒 / 彩椒 / 青椒 / bell pepper
  [NATURAL_FOOD_IDS.green_bell_pepper]: ['青椒', '綠青椒', '菜椒', 'green bell pepper'],
  [NATURAL_FOOD_IDS.red_bell_pepper]: ['紅甜椒', '彩椒', '紅椒', '甜椒', '柿子椒', 'red bell pepper'],
  [NATURAL_FOOD_IDS.yellow_bell_pepper_raw]: ['黃甜椒', '彩椒', '黃椒', '甜椒', 'yellow bell pepper'],

  // 18. 杏鮑菇 / king oyster mushroom
  [NATURAL_FOOD_IDS.king_oyster_mushroom]: ['杏鮑菇', '刺芹側耳', '雪茸', '鳳尾菇', 'king oyster mushroom'],

  // 19. 菠菜 / spinach
  [NATURAL_FOOD_IDS.spinach_raw]: ['菠菜', '菠菱菜', '赤根菜', '波斯草', 'spinach'],

  // 20. 萵苣 / 生菜 / 美生菜 / 大陸妹 / lettuce
  [NATURAL_FOOD_IDS.romaine_lettuce]: ['蘿蔓', '羅蔓', '羅蔓生菜', '長葉萵苣', 'romaine', 'romaine lettuce'],
  [NATURAL_FOOD_IDS.iceberg_lettuce]: ['結球萵苣', '美生菜', '生菜', '包心生菜', '圓生菜', 'iceberg lettuce'],
  [NATURAL_FOOD_IDS.youmai_vegetable]: ['油麥菜', '大陸妹', '葉用萵苣', 'youmai'],

  // 21. 蘆筍 / asparagus
  [NATURAL_FOOD_IDS.asparagus_raw]: ['蘆筍', '綠蘆筍', '龍鬚菜', '露筍', '石刁柏', 'asparagus'],
  [NATURAL_FOOD_IDS.white_asparagus_raw]: ['白蘆筍', 'white asparagus'],

  // 22. 櫛瓜 / 西葫蘆 / zucchini
  [NATURAL_FOOD_IDS.zucchini_raw]: ['櫛瓜', '西葫蘆', '翠玉瓜', '美洲南瓜', '角瓜', '筍瓜', 'zucchini', 'courgette'],
  [NATURAL_FOOD_IDS.chinese_squash_xihulu]: ['西葫蘆', '西葫蘆瓜', 'chinese squash'],

  // 23. 洋菇 / 白蘑菇 / button mushroom
  [NATURAL_FOOD_IDS.white_mushroom_raw]: ['洋菇', '白蘑菇', '雙孢蘑菇', '蘑菇', '洋蕈', 'button mushroom', 'mushroom', 'champignon'],

  // 24. 玉米筍 / baby corn
  [NATURAL_FOOD_IDS.corn_kernel]: ['玉米', '玉米粒', '甜玉米', 'corn', 'sweet corn'],

  // 25. 四季豆 / 敏豆 / 豆角 / green beans
  [NATURAL_FOOD_IDS.green_bean_common_raw]: ['四季豆', '敏豆', '菜豆', '豆角', '雲豆', '刀豆', 'green beans', 'snap beans'],
  [NATURAL_FOOD_IDS.yardlong_bean_raw]: ['豇豆', '長豆', '長豆角', 'yardlong bean'],

  // 26. 毛豆 / edamame
  [NATURAL_FOOD_IDS.edamame_kernels]: ['毛豆', '毛豆仁', '枝豆', '菜用大豆', '綠大豆', 'edamame'],

  // 27. 鱈魚 / cod
  [NATURAL_FOOD_IDS.cod_fish]: ['鱈魚', '大西洋鱈', '黑線鱈', '鱈狹鱈', 'cod', 'codfish'],

  // 28. 鯖魚 / 青花魚 / mackerel
  [NATURAL_FOOD_IDS.mackerel]: ['鯖魚', '青花魚', '鯖', '青佔魚', '挪威鯖魚', 'mackerel'],
  [NATURAL_FOOD_IDS.spanish_mackerel_bayu]: ['鮁魚', '藍點馬鮫', '馬鮫魚', 'spanish mackerel'],

  // 29. 鯛魚 / 吳郭魚 / 羅非魚 / tilapia / snapper
  [NATURAL_FOOD_IDS.tilapia_fillet]: ['鯛魚片', '台灣鯛', '吳郭魚', '羅非魚', 'tilapia fillet', 'tilapia'],
  [NATURAL_FOOD_IDS.red_seabream_raw]: ['真鯛', '加吉魚', '銅盆魚', '紅鯛', '黑鯛', 'red seabream', 'sea bream', 'snapper'],

  // 30. 鱸魚 / sea bass
  [NATURAL_FOOD_IDS.sea_bass]: ['鱸魚', '花鱸', '海鱸', '七星鱸', '金目鱸', 'sea bass', 'perch'],

  // 31. 蝦仁 / 鮮蝦 / shrimp
  [NATURAL_FOOD_IDS.shrimp_meat]: ['蝦仁', '鮮蝦', '蝦肉', '海蝦仁', '白蝦仁', 'shrimp', 'prawn'],
  [NATURAL_FOOD_IDS.black_tiger_prawn_raw]: ['草蝦', '黑虎蝦', '草蝦仁', 'black tiger prawn'],
  [NATURAL_FOOD_IDS.giant_freshwater_prawn_raw]: ['泰國蝦', '羅氏沼蝦', '大頭蝦', 'giant freshwater prawn'],

  // 32. 干貝 / 扇貝 / 帶子 / scallops
  [NATURAL_FOOD_IDS.scallop_meat]: ['干貝', '扇貝', '帶子', '瑤柱', '元貝', 'scallops', 'scallop'],

  // 33. 蛤蜊 / 文蛤 / clams
  [NATURAL_FOOD_IDS.clam_meat]: ['蛤蜊', '文蛤', '蚧', '蛤仔', '花蛤', '白蛤', 'clam', 'clams'],
  [NATURAL_FOOD_IDS.short_necked_clam_raw]: ['海瓜子', '花蛤', 'short-necked clam'],

  // 34. 牡蠣 / 生蠔 / 蚵仔 / oysters
  [NATURAL_FOOD_IDS.oyster_meat]: ['牡蠣', '生蠔', '蚵仔', '海蠣', '蠣白', 'oyster', 'oysters'],

  // 35. 魷魚 / 花枝 / 烏賊 / 透抽 / squid
  [NATURAL_FOOD_IDS.squid_raw]: ['魷魚', '花枝', '烏賊', '墨魚', '魷魚鬚', '透抽', 'squid', 'calamari'],
  [NATURAL_FOOD_IDS.bigfin_reef_squid_raw]: ['軟絲', '大尾魷', 'bigfin reef squid'],
  [NATURAL_FOOD_IDS.cuttlefish_raw]: ['花枝', '墨魚', '烏賊', 'cuttlefish'],

  // 36. 章魚 / 八爪魚 / octopus
  [NATURAL_FOOD_IDS.octopus_raw]: ['章魚', '八爪魚', '八帶', '鮞', 'octopus'],

  // 37. 雞胸肉 / chicken breast
  [NATURAL_FOOD_IDS.chicken_breast_raw]: ['雞胸肉', '雞胸', '雞肉', '去皮雞胸', '雞胸肉生', 'chicken breast', 'chicken'],
  [NATURAL_FOOD_IDS.chicken_tenderloin]: ['雞里肌', '雞柳', '雞小胸', 'chicken tenderloin'],

  // 38. 雞腿肉 / chicken thigh
  [NATURAL_FOOD_IDS.chicken_thigh_skinless]: ['雞腿肉', '去皮雞腿肉', '雞腿', '去皮去骨雞腿', '雞扒肉', 'chicken thigh'],
  [NATURAL_FOOD_IDS.chicken_thigh_with_skin]: ['帶皮雞腿肉', '雞腿肉帶皮', 'chicken thigh with skin'],

  // 39. 牛菲力 / 牛里脊 / tenderloin
  [NATURAL_FOOD_IDS.beef_tenderloin]: ['牛菲力', '牛里脊', '菲力', '菲力牛排', '牛柳', '牛柳肉', 'tenderloin', 'filet mignon'],

  // 40. 牛板腱 / 嫩肩里肌 / flat iron
  [NATURAL_FOOD_IDS.beef_top_blade]: ['牛板腱', '嫩肩里肌', '板腱', '牡蠣肉', '三叉肉', '板腱牛排', 'flat iron', 'blade steak'],

  // 41. 牛腱肉 / beef shank
  [NATURAL_FOOD_IDS.beef_shank]: ['牛腱肉', '牛腱', '牛腱子', '牛腱心', '腱子肉', 'beef shank'],

  // 42. 豬里肌 / 豬里脊 / pork loin
  [NATURAL_FOOD_IDS.pork_tenderloin]: ['豬里肌', '豬里脊', '豬大排', '里肌肉', '腰內肉', '純瘦肉', '豬柳', 'pork loin', 'pork tenderloin'],
  [NATURAL_FOOD_IDS.pork_fillet_tenderloin]: ['腰內肉', '小里肌', '豬小里肌', 'pork fillet'],

  // 43. 豬後腿肉 / pork leg lean
  [NATURAL_FOOD_IDS.pork_ham_lean]: ['豬後腿肉', '瘦豬肉', '腿肉', '後腿瘦肉', 'pork leg lean', 'pork ham'],
  [NATURAL_FOOD_IDS.pork_front_leg_lean]: ['豬前腿瘦肉', '前腿肉', 'pork front leg'],

  // 44. 鷹嘴豆 / 雪蓮子 / chickpeas
  [NATURAL_FOOD_IDS.chickpea_dry]: ['鷹嘴豆', '雞豆', '雪蓮子', '桃爾豆', '馬豆', 'chickpeas', 'garbanzo'],

  // 45. 豆腐 / tofu
  [NATURAL_FOOD_IDS.firm_tofu]: ['豆腐', '板豆腐', '老豆腐', '水豆腐', 'firm tofu', 'tofu', 'bean curd'],
  [NATURAL_FOOD_IDS.silken_tofu]: ['嫩豆腐', '絹豆腐', '水豆腐', 'silken tofu'],
  [NATURAL_FOOD_IDS.lactone_tofu]: ['內酯豆腐', '盒裝嫩豆腐', 'lactone tofu'],
  [NATURAL_FOOD_IDS.dried_tofu]: ['豆干', '大豆干', '白豆干', 'dried tofu'],

  // 46. 豆漿 / 豆奶 / soy milk
  [NATURAL_FOOD_IDS.soy_milk_unsweetened]: ['豆漿', '無糖豆漿', '豆奶', '大豆漿', 'soy milk', 'soymilk'],

  // 47. 杏仁 / 巴旦木 / almonds
  [NATURAL_FOOD_IDS.almond_raw]: ['杏仁', '杏仁果', '巴旦木', '美國大杏仁', '扁桃仁', 'almonds', 'almond'],
  [NATURAL_FOOD_IDS.xinjiang_almond_badanmu]: ['巴旦木', '新疆巴旦木', 'badanmu'],

  // 48. 核桃 / 胡桃 / walnuts
  [NATURAL_FOOD_IDS.walnut_raw]: ['核桃', '核桃仁', '胡桃', '胡桃仁', '羌桃', 'walnuts', 'walnut'],

  // 49. 花生 / 落花生 / peanuts
  [NATURAL_FOOD_IDS.peanut_raw]: ['花生', '花生仁', '落花生', '長生果', '地豆', 'peanuts', 'peanut'],

  // 50. 橄欖油 / olive oil (通用天然油脂別名支援)
  'olive_oil': ['橄欖油', '特級初榨橄欖油', '純橄欖油', '初榨橄欖油', 'olive oil', 'evoo'],
};

// ----------------------------------------------------------------------------
// 2. 健身動作權威縮寫與黑話庫 (Top 30 Exercise Domain Registry)
// ----------------------------------------------------------------------------
export const EXERCISE_ALIASES_REGISTRY: Record<string, readonly string[]> = {
  // 1. 槓鈴臥推 / BP / Bench Press / Bench
  [DEFAULT_EXERCISE_IDS.bench_press]: [
    '槓鈴臥推', '臥推', '平面臥推', '槓鈴平推', '平胸臥推',
    'bp', 'bench press', 'bench', 'barbell bench', 'barbell bench press',
  ],

  // 2. 啞鈴臥推 / DB Bench / Dumbbell Press
  [DEFAULT_EXERCISE_IDS.dumbbell_bench_press]: [
    '啞鈴臥推', '啞鈴平推', '啞鈴推胸',
    'db bench', 'dumbbell bench press', 'dumbbell press', 'dbbp', 'db press',
  ],

  // 3. 上斜槓鈴臥推 / Incline Bench / Incline Press
  [DEFAULT_EXERCISE_IDS.incline_barbell_bench_press]: [
    '上斜槓鈴臥推', '上斜推', '上斜臥推', '槓鈴上斜臥推',
    'incline bench', 'incline press', 'incline bp', 'incline barbell bench press',
  ],

  // 4. 槓鈴深蹲 / Squat / Back Squat / 深蹲
  [DEFAULT_EXERCISE_IDS.barbell_squat]: [
    '槓鈴深蹲', '深蹲', '後蹲', '背蹲', '槓蹲',
    'squat', 'back squat', 'barbell squat', 'bs',
  ],

  // 5. 前蹲舉 / Front Squat / FS
  [DEFAULT_EXERCISE_IDS.barbell_front_squat]: [
    '前蹲舉', '前蹲', '槓鈴前蹲', '槓鈴前深蹲',
    'front squat', 'fs', 'barbell front squat',
  ],

  // 6. 羅馬尼亞硬舉 / RDL / Romanian Deadlift
  [DEFAULT_EXERCISE_IDS.romanian_deadlift]: [
    '羅馬尼亞硬舉', '羅馬尼亞', '直腿硬舉', '直腿硬拉', '羅馬尼亞硬拉',
    'rdl', 'romanian deadlift', 'barbell rdl',
  ],
  [DEFAULT_EXERCISE_IDS.dumbbell_romanian_deadlift]: [
    '啞鈴羅馬尼亞硬舉', '啞鈴羅馬尼亞', '啞鈴直腿硬舉',
    'db rdl', 'dumbbell rdl', 'dumbbell romanian deadlift',
  ],

  // 7. 傳統硬舉 / DL / Deadlift / 硬拉
  [DEFAULT_EXERCISE_IDS.deadlift]: [
    '傳統硬舉', '硬舉', '傳統硬拉', '硬拉',
    'dl', 'deadlift', 'conventional deadlift',
  ],

  // 8. 相撲硬舉 / Sumo Deadlift
  [DEFAULT_EXERCISE_IDS.sumo_deadlift]: [
    '相撲硬舉', '相撲硬拉', '相撲',
    'sumo dl', 'sumo deadlift',
  ],

  // 9. 站姿槓鈴肩推 / 站姿槓鈴推舉 / OHP / Overhead Press / 軍事推舉 / 肩推
  [DEFAULT_EXERCISE_IDS.standing_overhead_press]: [
    '站姿槓鈴推舉', '站姿槓鈴肩推', '站姿肩推', '肩推', '軍事推舉', '站推', '槓鈴肩推',
    'ohp', 'overhead press', 'military press', 'standing shoulder press',
  ],

  // 10. 啞鈴肩推 / DB Shoulder Press / DB OHP
  [DEFAULT_EXERCISE_IDS.seated_dumbbell_overhead_press]: [
    '坐姿啞鈴推舉', '啞鈴肩推', '坐姿肩推', '啞鈴推舉', '啞鈴坐姿肩推',
    'db shoulder press', 'db ohp', 'db press', 'dumbbell shoulder press',
  ],
  [DEFAULT_EXERCISE_IDS.seated_barbell_overhead_press]: [
    '坐姿槓鈴推舉', '坐姿槓鈴肩推', 'seated barbell press',
  ],

  // 11. 引體向上 / Pull Up / Chin Up
  [DEFAULT_EXERCISE_IDS.pullups]: [
    '引體向上', '正握引體', '引體',
    'pull up', 'pullup', 'pull-up', 'pullups',
  ],
  [DEFAULT_EXERCISE_IDS.chinups]: [
    '反握引體向上', '反握引體', '正手引體',
    'chin up', 'chinup', 'chin-up', 'chinups',
  ],

  // 12. 滑輪下拉 / Lat Pulldown / 高位下拉
  [DEFAULT_EXERCISE_IDS.lat_pulldown]: [
    '滑輪下拉', '高位下拉', '下拉', '滑輪寬下拉',
    'lat pulldown', 'pulldown', 'cable pulldown',
  ],
  [DEFAULT_EXERCISE_IDS.close_grip_lat_pulldown]: [
    '窄握滑輪下拉', '窄握高位下拉', 'close grip lat pulldown',
  ],

  // 13. 俯身槓鈴划船 / BB Row / Barbell Row / 划船
  [DEFAULT_EXERCISE_IDS.barbell_row]: [
    '俯身槓鈴划船', '槓鈴划船', '划船', '俯身划船', '槓划',
    'bb row', 'barbell row', 'bent-over row', 'bent over row', 'barbell bent-over row',
  ],
  [DEFAULT_EXERCISE_IDS.pendlay_row]: [
    '潘德雷划船', '彭德利划船', 'pendlay row',
  ],

  // 14. 單臂啞鈴划船 / One-arm DB Row / DB Row
  [DEFAULT_EXERCISE_IDS.one_arm_dumbbell_row]: [
    '單臂啞鈴划船', '啞鈴划船', '單手划船', '單臂划船',
    'one-arm db row', 'db row', 'single arm db row', 'dumbbell row',
  ],

  // 15. 滑輪坐姿划船 / Cable Seated Row
  [DEFAULT_EXERCISE_IDS.seated_cable_row]: [
    '滑輪坐姿划船', '坐姿划船', '水平划船', '滑輪划船',
    'cable seated row', 'seated cable row', 'cable row', 'seated row',
  ],

  // 16. 啞鈴側平舉 / Lateral Raise / 側飛鳥
  [DEFAULT_EXERCISE_IDS.dumbbell_lateral_raise]: [
    '啞鈴側平舉', '側平舉', '側飛鳥', '飛鳥', '啞鈴側飛',
    'lateral raise', 'lat raise', 'side raise', 'side lateral raise',
  ],
  [DEFAULT_EXERCISE_IDS.cable_lateral_raise]: [
    '滑輪側平舉', '繩索側平舉', 'cable lateral raise',
  ],

  // 17. 雙槓屈臂伸 / Dips
  [DEFAULT_EXERCISE_IDS.dips]: [
    '雙槓屈臂伸', '雙槓臂屈伸', '雙槓撐體', '雙槓推', '屈臂伸',
    'dips', 'chest dips', 'tricep dips', 'dip',
  ],
  [DEFAULT_EXERCISE_IDS.bench_dips]: [
    '仰臥臂屈伸', '長凳雙槓屈臂伸', 'bench dips',
  ],

  // 18. 槓鈴二頭彎舉 / BB Curl
  [DEFAULT_EXERCISE_IDS.barbell_curl]: [
    '槓鈴二頭彎舉', '槓鈴彎舉', '二頭彎舉', '彎舉',
    'bb curl', 'barbell curl', 'barbell bicep curl',
  ],
  [DEFAULT_EXERCISE_IDS.ez_bar_curl]: [
    'ez槓二頭彎舉', '曲桿彎舉', 'ez bar curl',
  ],

  // 19. 啞鈴二頭彎舉 / DB Curl
  [DEFAULT_EXERCISE_IDS.dumbbell_curl]: [
    '啞鈴二頭彎舉', '啞鈴彎舉', '二頭啞鈴彎舉',
    'db curl', 'dumbbell curl', 'dumbbell bicep curl',
  ],

  // 20. 啞鈴錘式彎舉 / Hammer Curl / DB Hammer Curl
  [DEFAULT_EXERCISE_IDS.dumbbell_hammer_curl]: [
    '啞鈴錘式彎舉', '錘式彎舉', '鐵錘彎舉', '槌式彎舉', '錘式', '槌式',
    'hammer curl', 'db hammer curl', 'dumbbell hammer curl',
  ],

  // 21. 滑輪三頭下壓 / Triceps Pushdown
  [DEFAULT_EXERCISE_IDS.triceps_pushdown]: [
    '滑輪三頭下壓', '繩索三頭下壓', '繩索下壓', '滑輪下壓', '三頭下壓',
    'triceps pushdown', 'cable pushdown', 'pushdown',
  ],
  [DEFAULT_EXERCISE_IDS.rope_triceps_pushdown]: [
    '繩索三頭下壓', '繩索下壓', 'rope triceps pushdown',
  ],

  // 22. 仰臥三頭臂屈伸 / Skull Crusher / 法式推舉
  [DEFAULT_EXERCISE_IDS.lying_triceps_extension]: [
    '仰臥三頭臂屈伸', '仰臥槓鈴臂屈伸', '法式推舉', '碎頭者', '三頭臂屈伸',
    'skull crusher', 'skullcrusher', 'french press', 'lying triceps extension',
  ],

  // 23. 機械腿推機 / Leg Press / 倒蹬機 / 腿推
  [DEFAULT_EXERCISE_IDS.leg_press]: [
    '機械腿推機', '腿推機', '倒蹬機', '腿推', '腿推舉', '倒蹬',
    'leg press', '45 degree leg press',
  ],

  // 24. 坐姿腿伸展機 / Leg Extension / 腿伸展
  [DEFAULT_EXERCISE_IDS.leg_extension]: [
    '坐姿腿伸展機', '腿伸展', '踢腿機', '伸腿機', '腿屈伸',
    'leg extension', 'quad extension',
  ],

  // 25. 俯臥腿彎舉 / Leg Curl
  [DEFAULT_EXERCISE_IDS.leg_curl]: [
    '俯臥腿彎舉', '勾腿機', '勾腿', '腿彎曲', '腿彎舉',
    'leg curl', 'lying leg curl', 'hamstring curl',
  ],
  [DEFAULT_EXERCISE_IDS.seated_leg_curl]: [
    '坐姿腿彎舉', '坐姿勾腿', 'seated leg curl',
  ],

  // 26. 槓鈴臀推 / Hip Thrust
  [DEFAULT_EXERCISE_IDS.barbell_hip_thrust]: [
    '槓鈴臀推', '臀橋', '臀推', '臀衝',
    'hip thrust', 'barbell hip thrust',
  ],
  [DEFAULT_EXERCISE_IDS.smith_machine_hip_thrust]: [
    '史密斯臀推', 'smith hip thrust',
  ],

  // 27. 保加利亞分腿蹲 / BSS / Bulgarian Split Squat
  [DEFAULT_EXERCISE_IDS.bulgarian_split_squat]: [
    '保加利亞分腿蹲', '保加利亞', '保加利亞單腿蹲',
    'bss', 'bulgarian split squat', 'split squat',
  ],

  // 28. 啞鈴箭步蹲 / 啞鈴弓箭步蹲 / Lunge
  [DEFAULT_EXERCISE_IDS.dumbbell_walking_lunges]: [
    '啞鈴弓箭步蹲', '啞鈴箭步蹲', '箭步蹲', '跨步蹲', '弓步蹲', '行進箭步蹲',
    'lunge', 'walking lunge', 'db lunge', 'lunges',
  ],

  // 29. 繩索面拉 / 面拉 / Face Pull
  [DEFAULT_EXERCISE_IDS.cable_face_pull]: [
    '繩索面拉', '面拉', '臉拉', '面部拉引',
    'face pull', 'cable face pull', 'facepull',
  ],

  // 30. 健腹輪 / Ab Wheel / Ab Roller
  [DEFAULT_EXERCISE_IDS.ab_wheel_rollout]: [
    '健腹輪', '腹肌輪', '滾輪', '滾腹輪',
    'ab wheel', 'ab roller', 'ab wheel rollout',
  ],
};

// ----------------------------------------------------------------------------
// 3. 預建高速快取索引 (High-speed Inverted & Canonical Index)
// ----------------------------------------------------------------------------
const EMPTY_ALIASES: readonly string[] = Object.freeze([]);
const ID_TO_ALIASES_MAP = new Map<string, readonly string[]>();
const NAME_TO_ALIASES_MAP = new Map<string, readonly string[]>();

function registerAliases(registry: Record<string, readonly string[]>): void {
  for (const [id, aliases] of Object.entries(registry)) {
    const cleanList = Object.freeze(Array.from(new Set(aliases.map((a) => a.trim().toLowerCase()))));
    ID_TO_ALIASES_MAP.set(id, cleanList);

    // 同時以別名庫中的每一個名稱為 key 建立映射
    for (const alias of aliases) {
      const cleanAlias = alias.trim().toLowerCase();
      if (!NAME_TO_ALIASES_MAP.has(cleanAlias)) {
        NAME_TO_ALIASES_MAP.set(cleanAlias, cleanList);
      } else {
        const existing = NAME_TO_ALIASES_MAP.get(cleanAlias)!;
        const merged = Object.freeze(Array.from(new Set([...existing, ...cleanList])));
        NAME_TO_ALIASES_MAP.set(cleanAlias, merged);
      }
    }
  }
}

registerAliases(FOOD_ALIASES_REGISTRY);
registerAliases(EXERCISE_ALIASES_REGISTRY);

/**
 * 查詢目標實體對應的所有權威雙語別名
 * 支援透過標準種子 UUID / Key 查詢，亦支援透過實體名稱查詢
 * O(1) 極速快取查找，零重複記憶體配置
 * 
 * @param id 實體 ID (UUID 或 Key)
 * @param name 實體名稱 (如「馬鈴薯」、「槓鈴臥推」)
 * @returns 唯讀別名陣列（保證去重與小寫正規化）
 */
export function getAliasesForTarget(id?: string, name?: string): readonly string[] {
  if (id) {
    const list = ID_TO_ALIASES_MAP.get(id);
    if (list) return list;
  }

  if (name) {
    const cleanName = name.trim().toLowerCase();
    const list = NAME_TO_ALIASES_MAP.get(cleanName);
    if (list) return list;
  }

  return EMPTY_ALIASES;
}
