// ============================================================================
// Zenfit 多語言與繁簡互通搜尋模組 (Multilingual & Simplified/Traditional Search)
// 提供輕量繁簡折疊、英文 Slug / Key 匹配、權威領域雙語別名庫（Phase 2）與拼音首字母極速穿透（Phase 3）
// 嚴格零副作用純函數 (Pure Function)，無任何 UI 顯示入侵
// ============================================================================

import { NATURAL_FOOD_IDS } from '@/services/db/defaultNaturalFoods';
import { DEFAULT_EXERCISE_IDS } from '@/services/db/defaultExercises';
import { DEFAULT_EQUIPMENT_IDS } from '@/services/db/defaultEquipments';
import { getAliasesForTarget } from './multilingualAliases';
import { toPinyinInitials } from './pinyinInitials';

export { getAliasesForTarget } from './multilingualAliases';
export { toPinyinInitials, matchesPinyinInitials } from './pinyinInitials';

// ----------------------------------------------------------------------------
// 1. 繁簡字對照字典 (Comprehensive Simplified <-> Traditional Dictionary)
// ----------------------------------------------------------------------------
const S2T_PAIRS: [string, string][] = [
  // 健身與動作常用字
  ['卧', '臥'],
  ['杠', '槓'],
  ['哑', '啞'],
  ['铃', '鈴'],
  ['练', '練'],
  ['弯', '彎'],
  ['举', '舉'],
  ['组', '組'],
  ['颈', '頸'],
  ['飞', '飛'],
  ['鸟', '鳥'],
  ['耸', '聳'],
  ['夹', '夾'],
  ['绳', '繩'],
  ['缆', '纜'],
  ['轮', '輪'],
  ['侧', '側'],
  ['双', '雙'],
  ['单', '單'],
  ['宽', '寬'],
  ['罗', '羅'],
  ['亚', '亞'],
  ['扑', '撲'],
  ['转', '轉'],
  ['体', '體'],
  ['壶', '壺'],
  ['战', '戰'],
  ['药', '藥'],
  ['垫', '墊'],
  ['弹', '彈'],
  ['卷', '捲'],
  ['撑', '撐'],
  ['桥', '橋'],
  ['迈', '邁'],
  ['动', '動'],
  ['训', '訓'],
  ['负', '負'],
  ['机', '機'],
  ['械', '械'],
  ['导', '導'],
  ['环', '環'],
  ['挂', '掛'],
  ['钩', '鈎'],
  ['链', '鏈'],
  ['锁', '鎖'],
  ['销', '銷'],
  ['压', '壓'],
  ['冲', '衝'],
  ['数', '數'],
  ['计', '計'],
  ['时', '時'],
  ['节', '節'],
  ['强', '強'],
  ['频', '頻'],
  ['率', '率'],
  ['疲', '疲'],
  ['劳', '勞'],
  ['复', '復'],
  ['补', '補'],
  ['偿', '償'],
  ['维', '維'],
  ['围', '圍'],
  ['减', '減'],
  ['热', '熱'],
  ['松', '鬆'],
  ['枪', '槍'],
  ['轴', '軸'],
  ['滚', '滾'],
  ['带', '帶'],
  ['绑', '綁'],
  ['护', '護'],
  ['袜', '襪'],
  ['裤', '褲'],
  ['态', '態'],
  ['块', '塊'],
  ['状', '狀'],
  ['适', '適'],
  ['应', '應'],
  ['关', '關'],
  ['韧', '韌'],
  ['头', '頭'],
  ['发', '髮'],
  ['脑', '腦'],
  ['张', '張'],
  ['驰', '馳'],
  ['缩', '縮'],
  ['缓', '緩'],
  ['渐', '漸'],
  ['进', '進'],
  ['损', '損'],
  ['伤', '傷'],
  ['胀', '脹'],
  ['肿', '腫'],
  ['严', '嚴'],
  ['轻', '輕'],
  ['预', '預'],
  ['防', '防'],
  ['评', '評'],
  ['测', '測'],
  ['试', '試'],
  ['验', '驗'],
  ['证', '證'],

  // 食物、飲食與營養常用字
  ['鸡', '雞'],
  ['鸭', '鴨'],
  ['鹅', '鵝'],
  ['猪', '豬'],
  ['虾', '蝦'],
  ['鱼', '魚'],
  ['贝', '貝'],
  ['面', '麵'],
  ['饭', '飯'],
  ['汤', '湯'],
  ['鲍', '鮑'],
  ['参', '參'],
  ['鱿', '魷'],
  ['乌', '烏'],
  ['贼', '賊'],
  ['蛎', '蠣'],
  ['冻', '凍'],
  ['浆', '漿'],
  ['粮', '糧'],
  ['杂', '雜'],
  ['麦', '麥'],
  ['荞', '蕎'],
  ['莲', '蓮'],
  ['笋', '筍'],
  ['芦', '蘆'],
  ['蓝', '藍'],
  ['绿', '綠'],
  ['葱', '蔥'],
  ['姜', '薑'],
  ['酱', '醬'],
  ['盐', '鹽'],
  ['饮', '飲'],
  ['条', '條'],
  ['丝', '絲'],
  ['矿', '礦'],
  ['钙', '鈣'],
  ['铁', '鐵'],
  ['锌', '鋅'],
  ['饱', '飽'],
  ['纤', '纖'],
  ['胶', '膠'],
  ['质', '質'],
  ['签', '籤'],
  ['饼', '餅'],
  ['馅', '餡'],
  ['馄', '餛'],
  ['饺', '餃'],
  ['馒', '饅'],
  ['鲜', '鮮'],
  ['鳕', '鱈'],
  ['鲈', '鱸'],
  ['鲑', '鮭'],
  ['鳝', '鱔'],
  ['鳗', '鰻'],
  ['鲷', '鯛'],
  ['鲐', '鯖'],
  ['鲤', '鯉'],
  ['螺', '螺'],
  ['蚝', '蠔'],
  ['卤', '滷'],
  ['炖', '燉'],
  ['焖', '燜'],
  ['煨', '煨'],
  ['熏', '燻'],
  ['腌', '醃'],
  ['酿', '釀'],
  ['麴', '麴'],
  ['点', '點'],
  ['饴', '飴'],
  ['调', '調'],
  ['咸', '鹹'],
  ['浓', '濃'],
  ['荤', '葷'],
  ['温', '溫'],
  ['烫', '燙'],
  ['烧', '燒'],
  ['软', '軟'],
  ['细', '細'],
  ['纯', '純'],
  ['净', '淨'],
  ['优', '優'],
  ['级', '級'],
  ['产', '產'],
  ['营', '營'],
  ['养', '養'],
  ['尔', '爾'],
  ['叶', '葉'],
  ['胆', '膽'],
  ['碱', '鹼'],
  ['辅', '輔'],
  ['谷', '穀'],
  ['赖', '賴'],
  ['离', '離'],
  ['锅', '鍋'],
  ['盘', '盤'],
  ['类', '類'],
  ['馆', '館'],
  ['饪', '飪'],
  ['饱', '飽'],
  ['变', '變'],
  ['选', '選'],
  ['择', '擇'],
  ['买', '買'],
  ['卖', '賣'],
  ['购', '購'],
  ['订', '訂'],
  ['价', '價'],
  ['钱', '錢'],
  ['币', '幣'],
  ['总', '總'],
  ['两', '兩'],
  ['钠', '鈉'],
  ['钾', '鉀'],
  ['镁', '鎂'],
  ['铜', '銅'],
  ['锰', '錳'],
  ['萝', '蘿'],
  ['卜', '蔔'],
  ['儿', '兒'],
  ['异', '異'],
  ['黄', '黃'],
  ['壳', '殼'],
  ['藓', '蘚'],
  ['汉', '漢'],
  ['纽', '紐'],
  ['剂', '劑'],
  ['著', '著'],

  // 部首與通用偏旁
  ['钅', '釒'],
  ['饣', '飠'],
  ['纟', '糹'],
  ['讠', '訁'],
  ['门', '門'],
  ['车', '車'],
  ['马', '馬'],
  ['见', '見'],
  ['页', '頁'],
  ['风', '風'],
  ['齐', '齊'],
  ['齿', '齒'],
  ['龙', '龍'],
  ['爱', '愛'],
  ['罢', '罷'],
  ['备', '備'],
  ['笔', '筆'],
  ['毕', '畢'],
  ['边', '邊'],
  ['标', '標'],
  ['宾', '賓'],
  ['财', '財'],
  ['仓', '倉'],
  ['长', '長'],
  ['尝', '嚐'],
  ['彻', '徹'],
  ['陈', '陳'],
  ['称', '稱'],
  ['迟', '遲'],
  ['从', '從'],
  ['聪', '聰'],
  ['当', '當'],
  ['党', '黨'],
  ['灯', '燈'],
  ['电', '電'],
  ['淀', '澱'],
  ['东', '東'],
  ['断', '斷'],
  ['对', '對'],
  ['队', '隊'],
  ['范', '範'],
  ['仿', '倣'],
  ['访', '訪'],
  ['丰', '豐'],
  ['妇', '婦'],
  ['刚', '剛'],
  ['纲', '綱'],
  ['岗', '崗'],
  ['阁', '閣'],
  ['个', '個'],
  ['给', '給'],
  ['构', '構'],
  ['顾', '顧'],
  ['观', '觀'],
  ['惯', '慣'],
  ['广', '廣'],
  ['规', '規'],
  ['归', '歸'],
  ['国', '國'],
  ['过', '過'],
  ['骇', '駭'],
  ['韩', '韓'],
  ['号', '號'],
  ['轰', '轟'],
  ['后', '後'],
  ['户', '戶'],
  ['华', '華'],
  ['画', '畫'],
  ['划', '劃'],
  ['怀', '懷'],
  ['坏', '壞'],
  ['欢', '歡'],
  ['还', '還'],
  ['会', '會'],
  ['汇', '匯'],
  ['获', '獲'],
  ['击', '擊'],
  ['际', '際'],
  ['继', '繼'],
  ['家', '傢'],
  ['艰', '艱'],
  ['坚', '堅'],
  ['检', '檢'],
  ['简', '簡'],
  ['荐', '薦'],
  ['将', '將'],
  ['奖', '獎'],
  ['讲', '講'],
  ['阶', '階'],
  ['借', '藉'],
  ['届', '屆'],
  ['尽', '儘'],
  ['紧', '緊'],
  ['锦', '錦'],
  ['惊', '驚'],
  ['竞', '競'],
  ['静', '靜'],
  ['旧', '舊'],
  ['纠', '糾'],
  ['局', '侷'],
  ['据', '據'],
  ['惧', '懼'],
  ['剧', '劇'],
  ['决', '決'],
  ['绝', '絕'],
  ['军', '軍'],
  ['开', '開'],
  ['凯', '凱'],
  ['颗', '顆'],
  ['垦', '墾'],
  ['恳', '懇'],
  ['库', '庫'],
  ['夸', '誇'],
  ['亏', '虧'],
  ['扩', '擴'],
  ['腊', '臘'],
  ['蜡', '蠟'],
  ['兰', '蘭'],
  ['拦', '攔'],
  ['栏', '欄'],
  ['览', '覽'],
  ['揽', '攬'],
  ['捞', '撈'],
  ['乐', '樂'],
  ['厘', '釐'],
  ['里', '裡'],
  ['礼', '禮'],
  ['丽', '麗'],
  ['厉', '厲'],
  ['励', '勵'],
  ['帘', '簾'],
  ['怜', '憐'],
  ['联', '聯'],
  ['谅', '諒'],
  ['辽', '遼'],
  ['猎', '獵'],
  ['临', '臨'],
  ['邻', '鄰'],
  ['灵', '靈'],
  ['岭', '嶺'],
  ['领', '領'],
  ['刘', '劉'],
  ['聋', '聾'],
  ['楼', '樓'],
  ['搂', '摟'],
  ['炉', '爐'],
  ['陆', '陸'],
  ['录', '錄'],
  ['驴', '驢'],
  ['乱', '亂'],
  ['伦', '倫'],
  ['论', '論'],
  ['萝', '蘿'],
  ['逻', '邏'],
  ['码', '碼'],
  ['蚂', '螞'],
  ['蛮', '蠻'],
  ['满', '滿'],
  ['么', '麼'],
  ['没', '沒'],
  ['们', '們'],
  ['梦', '夢'],
  ['秘', '祕'],
  ['灭', '滅'],
  ['鸣', '鳴'],
  ['铭', '銘'],
  ['谋', '謀'],
  ['亩', '畝'],
  ['纳', '納'],
  ['难', '難'],
  ['恼', '惱'],
  ['闹', '鬧'],
  ['馁', '餒'],
  ['内', '內'],
  ['拟', '擬'],
  ['撵', '攆'],
  ['宁', '寧'],
  ['拧', '擰'],
  ['农', '農'],
  ['诺', '諾'],
  ['欧', '歐'],
  ['殴', '毆'],
  ['呕', '嘔'],
  ['庞', '龐'],
  ['抛', '拋'],
  ['赔', '賠'],
  ['喷', '噴'],
  ['骗', '騙'],
  ['飘', '飄'],
  ['贫', '貧'],
  ['凭', '憑'],
  ['苹', '蘋'],
  ['朴', '樸'],
  ['迁', '遷'],
  ['牵', '牽'],
  ['铅', '鉛'],
  ['谦', '謙'],
  ['钎', '釺'],
  ['潜', '潛'],
  ['浅', '淺'],
  ['遣', '遣'],
  ['歉', '歉'],
  ['墙', '牆'],
  ['抢', '搶'],
  ['乔', '喬'],
  ['侨', '僑'],
  ['翘', '翹'],
  ['窃', '竊'],
  ['钦', '欽'],
  ['亲', '親'],
  ['琴', '琴'],
  ['寝', '寢'],
  ['氢', '氫'],
  ['倾', '傾'],
  ['顷', '頃'],
  ['请', '請'],
  ['庆', '慶'],
  ['穷', '窮'],
  ['琼', '瓊'],
  ['趋', '趨'],
  ['区', '區'],
  ['躯', '軀'],
  ['驱', '驅'],
  ['龋', '齲'],
  ['权', '權'],
  ['劝', '勸'],
  ['确', '確'],
  ['鹊', '鵲'],
  ['让', '讓'],
  ['饶', '饒'],
  ['扰', '擾'],
  ['绕', '繞'],
  ['认', '認'],
  ['荣', '榮'],
  ['锐', '銳'],
  ['润', '潤'],
  ['洒', '灑'],
  ['萨', '薩'],
  ['伞', '傘'],
  ['丧', '喪'],
  ['骚', '騷'],
  ['扫', '掃'],
  ['涩', '澀'],
  ['纱', '紗'],
  ['刹', '剎'],
  ['筛', '篩'],
  ['晒', '曬'],
  ['删', '刪'],
  ['陕', '陝'],
  ['闪', '閃'],
  ['赏', '賞'],
  ['绍', '紹'],
  ['赊', '賒'],
  ['设', '設'],
  ['摄', '攝'],
  ['审', '審'],
  ['婶', '嬸'],
  ['肾', '腎'],
  ['声', '聲'],
  ['胜', '勝'],
  ['师', '師'],
  ['诗', '詩'],
  ['狮', '獅'],
  ['湿', '濕'],
  ['识', '識'],
  ['实', '實'],
  ['蚀', '蝕'],
  ['驶', '駛'],
  ['势', '勢'],
  ['视', '視'],
  ['饰', '飾'],
  ['释', '釋'],
  ['寿', '壽'],
  ['授', '授'],
  ['书', '書'],
  ['枢', '樞'],
  ['输', '輸'],
  ['术', '術'],
  ['树', '樹'],
  ['竖', '豎'],
  ['谁', '誰'],
  ['税', '稅'],
  ['顺', '順'],
  ['说', '說'],
  ['硕', '碩'],
  ['丝', '絲'],
  ['饲', '飼'],
  ['肆', '肆'],
  ['颂', '頌'],
  ['诉', '訴'],
  ['肃', '肅'],
  ['虽', '雖'],
  ['随', '隨'],
  ['岁', '歲'],
  ['孙', '孫'],
  ['台', '臺'],
  ['抬', '擡'],
  ['态', '態'],
  ['贪', '貪'],
  ['摊', '攤'],
  ['滩', '灘'],
  ['坛', '壇'],
  ['谈', '談'],
  ['叹', '歎'],
  ['涛', '濤'],
  ['腾', '騰'],
  ['题', '題'],
  ['体', '體'],
  ['听', '聽'],
  ['统', '統'],
  ['图', '圖'],
  ['涂', '塗'],
  ['团', '團'],
  ['颓', '頹'],
  ['脱', '脫'],
  ['鸵', '鴕'],
  ['网', '網'],
  ['伪', '偽'],
  ['纬', '緯'],
  ['苇', '葦'],
  ['卫', '衛'],
  ['稳', '穩'],
  ['问', '問'],
  ['窝', '窩'],
  ['无', '無'],
  ['吴', '吳'],
  ['芜', '蕪'],
  ['务', '務'],
  ['误', '誤'],
  ['牺', '犧'],
  ['锡', '錫'],
  ['习', '習'],
  ['戏', '戲'],
  ['系', '係'],
  ['峡', '峽'],
  ['狭', '狹'],
  ['暇', '暇'],
  ['显', '顯'],
  ['险', '險'],
  ['县', '縣'],
  ['现', '現'],
  ['线', '線'],
  ['宪', '憲'],
  ['乡', '鄉'],
  ['详', '詳'],
  ['响', '響'],
  ['项', '項'],
  ['销', '銷'],
  ['晓', '曉'],
  ['协', '協'],
  ['携', '攜'],
  ['胁', '脅'],
  ['写', '寫'],
  ['泻', '瀉'],
  ['谢', '謝'],
  ['兴', '興'],
  ['绣', '繡'],
  ['须', '須'],
  ['虚', '虛'],
  ['许', '許'],
  ['叙', '敘'],
  ['绪', '緒'],
  ['续', '續'],
  ['悬', '懸'],
  ['癣', '癬'],
  ['学', '學'],
  ['勋', '勳'],
  ['寻', '尋'],
  ['询', '詢'],
  ['讯', '訊'],
  ['逊', '遜'],
  ['压', '壓'],
  ['鸦', '鴉'],
  ['讶', '訝'],
  ['严', '嚴'],
  ['岩', '巖'],
  ['样', '樣'],
  ['摇', '搖'],
  ['遥', '遙'],
  ['耀', '耀'],
  ['爷', '爺'],
  ['业', '業'],
  ['医', '醫'],
  ['仪', '儀'],
  ['遗', '遺'],
  ['与', '與'],
  ['屿', '嶼'],
  ['语', '語'],
  ['驭', '馭'],
  ['郁', '鬱'],
  ['狱', '獄'],
  ['园', '園'],
  ['圆', '圓'],
  ['缘', '緣'],
  ['远', '遠'],
  ['愿', '願'],
  ['约', '約'],
  ['跃', '躍'],
  ['云', '雲'],
  ['匀', '勻'],
  ['陨', '隕'],
  ['运', '運'],
  ['酝', '醞'],
  ['晕', '暈'],
  ['韵', '韻'],
  ['灾', '災'],
  ['载', '載'],
  ['暂', '暫'],
  ['赞', '贊'],
  ['脏', '髒'],
  ['枣', '棗'],
  ['灶', '竈'],
  ['则', '則'],
  ['责', '責'],
  ['泽', '澤'],
  ['增', '增'],
  ['赠', '贈'],
  ['闸', '閘'],
  ['铡', '鍘'],
  ['斋', '齋'],
  ['债', '債'],
  ['斩', '斬'],
  ['盏', '盞'],
  ['涨', '漲'],
  ['阵', '陣'],
  ['镇', '鎮'],
  ['争', '爭'],
  ['睁', '睜'],
  ['执', '執'],
  ['纸', '紙'],
  ['钟', '鐘'],
  ['终', '終'],
  ['种', '種'],
  ['肿', '腫'],
  ['轴', '軸'],
  ['昼', '晝'],
  ['皱', '皺'],
  ['驻', '駐'],
  ['专', '專'],
  ['砖', '磚'],
  ['赚', '賺'],
  ['庄', '莊'],
  ['装', '裝'],
  ['壮', '壯'],
  ['浊', '濁'],
  ['资', '資'],
  ['综', '綜'],
  ['踪', '蹤'],
  ['纵', '縱'],
];

const S2T_MAP = new Map<string, string>();
const T2S_MAP = new Map<string, string>();

for (const [s, t] of S2T_PAIRS) {
  S2T_MAP.set(s, t);
  T2S_MAP.set(t, s);
}

/**
 * 將字串中的簡體字轉換為繁體字
 */
export function toTraditional(str: string): string {
  if (!str) return '';
  if (!/[^\x00-\x7F]/.test(str)) return str;

  let result = '';
  for (const ch of str) {
    result += S2T_MAP.get(ch) ?? ch;
  }
  return result;
}

/**
 * 將字串中的繁體字轉換為簡體字
 */
export function toSimplified(str: string): string {
  if (!str) return '';
  if (!/[^\x00-\x7F]/.test(str)) return str;

  let result = '';
  for (const ch of str) {
    result += T2S_MAP.get(ch) ?? ch;
  }
  return result;
}

/**
 * 中文字串正規化（統一字串為標準繁體，便於檢索折疊）
 */
export function normalizeChinese(str: string): string {
  if (!str) return '';
  return toTraditional(str.trim().toLowerCase());
}

// ----------------------------------------------------------------------------
// 2. 預設資料庫英文 Slug / Key 反向查找表 (UUID / Key -> English Slug)
// ----------------------------------------------------------------------------
const ALL_SLUGS_MAP = new Map<string, string>();

for (const [slug, id] of Object.entries(NATURAL_FOOD_IDS)) {
  ALL_SLUGS_MAP.set(id, slug);
  ALL_SLUGS_MAP.set(slug, slug);
}

for (const [slug, id] of Object.entries(DEFAULT_EXERCISE_IDS)) {
  ALL_SLUGS_MAP.set(id, slug);
  ALL_SLUGS_MAP.set(slug, slug);
}

for (const [slug, id] of Object.entries(DEFAULT_EQUIPMENT_IDS)) {
  ALL_SLUGS_MAP.set(id, slug);
  ALL_SLUGS_MAP.set(slug, slug);
}

/**
 * 依據目標 ID 取得對應的英文 Slug
 */
function getSlugForId(id?: string): string | undefined {
  if (!id) return undefined;
  return ALL_SLUGS_MAP.get(id);
}

/**
 * 比對搜尋字串是否匹配英文 Slug
 */
function matchesSlug(slug: string, query: string): boolean {
  if (slug.includes(query)) return true;

  if (slug.includes('_')) {
    const slugWithSpaces = slug.replace(/_/g, ' ');
    if (slugWithSpaces.includes(query)) return true;
    const slugWithoutSeparators = slug.replace(/_/g, '');
    const cleanQWithoutSeparators = query.replace(/[\s_-]+/g, '');
    if (cleanQWithoutSeparators && slugWithoutSeparators.includes(cleanQWithoutSeparators)) return true;
  }

  // 分詞比對：當搜尋字詞包含多個單字（如 "bench press" 或 "chicken breast"）
  if (query.includes(' ') || query.includes('-') || query.includes('_')) {
    const qWords = query.split(/[\s_+,-]+/).filter(Boolean);
    if (qWords.length > 0) {
      const slugTokens = slug.split('_').filter(Boolean);
      const allWordsMatch = qWords.every((w) =>
        slugTokens.some((t) => t.includes(w) || w.includes(t)) || slug.includes(w)
      );
      if (allWordsMatch) return true;
    }
  }

  return false;
}

// ----------------------------------------------------------------------------
// 3. 多語言、簡繁折疊、權威別名與拼音比對函數 (Single Source of Truth Search Matcher)
// ----------------------------------------------------------------------------
export interface SearchTarget {
  id?: string;
  name: string;
  brand?: string;
  notes?: string;
}

/**
 * 核心多語言比對函數
 * 
 * 串接層級：
 * 1. 原始名稱與品牌匹配 (Raw Match)
 * 2. 簡繁對稱折疊匹配 (Bilateral Simplified/Traditional Match)
 * 3. 英文種子 Slug 匹配 (Slug Match)
 * 4. 權威雙語別名庫匹配 (Phase 2 - Domain Aliases)
 * 5. 拼音首字母極速匹配 (Phase 3 - Pinyin Initials Match)
 * 6. 多詞分詞匹配 (Multi-token Match)
 * 
 * @param query 使用者輸入的搜尋字串
 * @param target 被檢索的目標實體（包含名稱、品牌、備註、ID）
 * @param type 實體領域類型 ('food' | 'exercise')
 * @returns 是否命中
 */
export function matchesMultilingual(
  query: string,
  target: SearchTarget,
  type?: 'food' | 'exercise'
): boolean {
  if (!query || !target || !target.name) return false;

  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return false;

  const targetName = target.name.toLowerCase();
  const targetBrand = target.brand ? target.brand.toLowerCase() : '';
  const targetNotes = target.notes ? target.notes.toLowerCase() : '';

  // 1. 原始字串匹配 (Case-insensitive raw match)
  if (
    targetName.includes(cleanQuery) ||
    (targetBrand && targetBrand.includes(cleanQuery)) ||
    (targetNotes && targetNotes.includes(cleanQuery))
  ) {
    return true;
  }

  const isQueryAscii = !/[^\x00-\x7F]/.test(cleanQuery);

  // 2. 簡繁雙向正規化比對 (Bilateral Simplified/Traditional match)
  // 若 query 為純 ASCII（如英文、拼音縮寫），不可能包含繁簡字，跳過高開銷比對
  let qTrad = cleanQuery;
  let qSimp = cleanQuery;
  if (!isQueryAscii) {
    qTrad = toTraditional(cleanQuery);
    qSimp = toSimplified(cleanQuery);

    const targetNameTrad = toTraditional(targetName);
    const targetNameSimp = toSimplified(targetName);

    if (targetNameTrad.includes(qTrad) || targetNameSimp.includes(qSimp)) {
      return true;
    }

    if (targetBrand) {
      const targetBrandTrad = toTraditional(targetBrand);
      const targetBrandSimp = toSimplified(targetBrand);
      if (targetBrandTrad.includes(qTrad) || targetBrandSimp.includes(qSimp)) {
        return true;
      }
    }

    if (targetNotes) {
      const targetNotesTrad = toTraditional(targetNotes);
      const targetNotesSimp = toSimplified(targetNotes);
      if (targetNotesTrad.includes(qTrad) || targetNotesSimp.includes(qSimp)) {
        return true;
      }
    }
  }

  // 3. 英文 Slug / Key 匹配 (English Slug matching)
  const slug = getSlugForId(target.id);
  if (slug && matchesSlug(slug, cleanQuery)) {
    return true;
  }

  // 4. 權威雙語別名庫匹配 (Phase 2 - Domain Aliases Matching)
  const targetAliases = getAliasesForTarget(target.id, target.name);
  if (targetAliases.length > 0) {
    for (let i = 0; i < targetAliases.length; i++) {
      const aliasLower = targetAliases[i];
      if (
        aliasLower.includes(cleanQuery) ||
        cleanQuery.includes(aliasLower) ||
        matchesSlug(aliasLower, cleanQuery)
      ) {
        return true;
      }

      // 簡繁折疊別名比對（僅在 query 包含非 ASCII 漢字時執行）
      if (!isQueryAscii) {
        const aliasTrad = toTraditional(aliasLower);
        const aliasSimp = toSimplified(aliasLower);
        if (aliasTrad.includes(qTrad) || aliasSimp.includes(qSimp)) {
          return true;
        }
      }
    }
  }

  // 5. 拼音首字母極速匹配 (Phase 3 - Pinyin Initials Matching)
  // 當 query 全為純英文字母且長度 >= 2 時啟用
  if (isQueryAscii && /^[a-z]{2,}$/.test(cleanQuery)) {
    // 5.1 比對目標正名的拼音首字母
    const nameInitials = toPinyinInitials(targetName);
    if (nameInitials.includes(cleanQuery)) {
      return true;
    }

    // 5.2 比對品牌名稱的拼音首字母
    if (targetBrand) {
      const brandInitials = toPinyinInitials(targetBrand);
      if (brandInitials.includes(cleanQuery)) {
        return true;
      }
    }

    // 5.3 比對權威別名的拼音首字母（如輸入「td」命中「馬鈴薯」，因其別名「土豆」拼音為 td）
    if (targetAliases.length > 0) {
      for (let i = 0; i < targetAliases.length; i++) {
        const aliasInitials = toPinyinInitials(targetAliases[i]);
        if (aliasInitials.includes(cleanQuery)) {
          return true;
        }
      }
    }
  }

  // 6. 多詞空格分離比對（如「槓鈴 臥推」或「beef shank」）
  if (cleanQuery.includes(' ') || cleanQuery.includes('_') || cleanQuery.includes('+')) {
    const queryTokens = cleanQuery.split(/[\s_+,-]+/).filter(Boolean);
    if (queryTokens.length > 1) {
      const allTokensMatch = queryTokens.every((token) =>
        matchesMultilingual(token, target, type)
      );
      if (allTokensMatch) return true;
    }
  }

  return false;
}
