/**
 * 大麦网数据源
 *
 * 使用大麦搜索 H5 接口获取演出信息
 * 覆盖：演唱会、体育赛事、话剧、展览等大型活动
 *
 * 接口说明：
 * - 搜索接口：https://search.damai.cn/searchajax.html
 * - 详情接口：https://mtop.damai.cn/h5/mtop.alibaba.damai.detail.getdetail/1.2/
 * - 城市列表：https://venue.damai.cn/switchcity
 */

const DAMAI_SEARCH_URL = 'https://search.damai.cn/searchajax.html';

// 大麦城市编码
const CITY_CODES = {
  '上海': 'shanghai',
  '北京': 'beijing',
  '广州': 'guangzhou',
  '深圳': 'shenzhen',
  '杭州': 'hangzhou',
  '成都': 'chengdu',
  '南京': 'nanjing',
  '武汉': 'wuhan',
  '重庆': 'chongqing',
  '西安': 'xian',
  '长沙': 'changsha',
  '天津': 'tianjin',
};

// 大麦分类 → 我们的分类映射
const DAMAI_CATEGORY_MAP = {
  'yyч': 'concert',      // 演唱会
  'yinyue': 'concert',   // 音乐会
  'huaju': 'theater',    // 话剧歌剧
  'tiyu': 'sports',      // 体育赛事
  'zhanlan': 'exhibition', // 展览休闲
  'qinzi': 'workshop',   // 亲子
  'xiqu': 'theater',     // 戏曲
};

// 大麦搜索分类编码
const DAMAI_CATEGORIES = [
  { code: 'yyч', name: '演唱会' },
  { code: 'yinyue', name: '音乐会' },
  { code: 'huaju', name: '话剧歌剧' },
  { code: 'tiyu', name: '体育' },
  { code: 'zhanlan', name: '展览' },
];

/**
 * 从大麦网获取活动数据
 */
export async function fetchFromDamai(city, options = {}) {
  const cityCode = CITY_CODES[city] || city;
  const events = [];

  for (const cat of DAMAI_CATEGORIES) {
    try {
      const items = await searchDamai(cityCode, cat.code, options);
      events.push(...items);
    } catch (err) {
      console.warn(`⚠️  大麦网 ${cat.name} 数据获取失败:`, err.message);
    }
  }

  return events.map(item => normalizeDamaiEvent(item, city));
}

async function searchDamai(cityCode, categoryCode, options = {}) {
  const params = new URLSearchParams({
    keyword: '',
    cty: cityCode,
    ctl: categoryCode,
    tsg: 0,         // 时间筛选：0=全部
    order: 4,       // 排序：4=即将开场
    pageSize: options.pageSize || 20,
    currPage: options.page || 1,
  });

  const url = `${DAMAI_SEARCH_URL}?${params}`;
  const resp = await fetchWithRetry(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      'Referer': 'https://m.damai.cn/',
    },
  });

  const data = await resp.json();

  if (!data || !data.pageData || !data.pageData.resultData) {
    return [];
  }

  return data.pageData.resultData;
}

function normalizeDamaiEvent(item, city) {
  // 解析票务状态
  let ticketStatus = 'on_sale';
  const btnText = (item.verticalGround || '').toLowerCase();
  if (btnText.includes('售罄') || btnText.includes('sold')) {
    ticketStatus = 'sold_out';
  } else if (btnText.includes('预售') || btnText.includes('即将')) {
    ticketStatus = 'upcoming_sale';
  } else if (btnText.includes('紧张') || btnText.includes('热')) {
    ticketStatus = 'selling_fast';
  }

  // 解析价格
  const priceStr = item.priceStr || item.price_str || '';
  const priceMatch = priceStr.match(/(\d+)/);
  const price = priceMatch ? parseInt(priceMatch[1]) : 0;

  // 解析分类
  const catCode = item.categoryName || '';
  let category = 'concert';
  if (catCode.includes('话剧') || catCode.includes('歌剧') || catCode.includes('戏')) category = 'theater';
  else if (catCode.includes('体育') || catCode.includes('赛')) category = 'sports';
  else if (catCode.includes('展览') || catCode.includes('展')) category = 'exhibition';
  else if (catCode.includes('亲子')) category = 'workshop';

  // 解析日期
  const showTime = item.showTime || item.show_time || '';
  const dateMatch = showTime.match(/(\d{4})[.-](\d{2})[.-](\d{2})/);
  const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : '';
  const timeMatch = showTime.match(/(\d{2}:\d{2})/);
  const time = timeMatch ? timeMatch[1] : '';

  return {
    id: `damai_${item.projectId || item.id}`,
    title: item.projectName || item.name || '',
    category,
    date,
    time,
    venue: item.venueName || item.venue_name || '',
    city,
    price,
    priceRange: priceStr || `¥${price}`,
    description: item.description || item.projectName || '',
    tags: extractTags(item),
    ticketUrl: `https://m.damai.cn/damai/detail/item.html?itemId=${item.projectId || item.id}`,
    announceDate: null,
    saleStartDate: item.presaleTime || null,
    ticketStatus,
    source: 'damai',
  };
}

function extractTags(item) {
  const tags = [];
  if (item.artistName) tags.push(item.artistName);
  if (item.categoryName) tags.push(item.categoryName);
  if (item.subcategoryName) tags.push(item.subcategoryName);
  // 从标题提取可能的标签
  const title = item.projectName || '';
  if (title.includes('巡演') || title.includes('巡回')) tags.push('巡演');
  if (title.includes('音乐节')) tags.push('音乐节');
  if (title.includes('首演') || title.includes('首映')) tags.push('首演');
  return [...new Set(tags)];
}

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) return resp;
      if (resp.status === 403 || resp.status === 429) {
        // 被限流，等待后重试
        await sleep(2000 * (i + 1));
        continue;
      }
      throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
