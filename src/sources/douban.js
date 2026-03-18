/**
 * 豆瓣同城数据源
 *
 * 爬取豆瓣同城页面获取活动信息
 * 覆盖：展览、话剧、工作坊、讲座等小众/文艺活动
 *
 * 页面说明：
 * - 同城活动列表：https://www.douban.com/location/{city}/events/
 * - 分类筛选：?type=exhibition / music / drama / salon / party / sports / travel / commonweal
 * - 时间筛选：?when=weekend / today / week / month
 */

const DOUBAN_BASE = 'https://www.douban.com/location';

// 豆瓣城市 URL slug
const CITY_SLUGS = {
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

// 豆瓣分类 → 我们的分类映射
const DOUBAN_CATEGORY_MAP = {
  'exhibition': 'exhibition',
  'drama': 'theater',
  'music': 'concert',
  'salon': 'workshop',
  'party': 'food',
  'sports': 'outdoor',
  'film': 'movie',
  'travel': 'outdoor',
  'commonweal': 'workshop',
};

// 我们关心的豆瓣分类
const DOUBAN_TYPES = ['exhibition', 'drama', 'salon', 'music', 'party', 'sports'];

/**
 * 从豆瓣同城获取活动数据
 */
export async function fetchFromDouban(city, options = {}) {
  const citySlug = CITY_SLUGS[city] || city;
  const events = [];

  for (const type of DOUBAN_TYPES) {
    try {
      const items = await fetchDoubanEvents(citySlug, type);
      events.push(...items.map(item => normalizeDoubanEvent(item, city, type)));
    } catch (err) {
      console.warn(`⚠️  豆瓣同城 ${type} 数据获取失败:`, err.message);
    }
    // 豆瓣反爬较严，每个请求间隔一下
    await sleep(500);
  }

  return events;
}

async function fetchDoubanEvents(citySlug, type) {
  const url = `${DOUBAN_BASE}/${citySlug}/events?type=${type}&when=future`;

  const resp = await fetchWithRetry(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Referer': 'https://www.douban.com/',
    },
  });

  const html = await resp.text();
  return parseDoubanHtml(html);
}

/**
 * 解析豆瓣同城 HTML 页面
 *
 * 豆瓣同城的活动列表结构：
 * <ul class="events-list">
 *   <li class="list-entry">
 *     <div class="event-pic"><a href="..."><img src="..." /></a></div>
 *     <div class="event-info">
 *       <h3 class="event-title"><a href="url">标题</a></h3>
 *       <div class="event-time">时间: 2026年03月22日 周六 14:00-17:00</div>
 *       <div class="event-address">地点: 上海市静安区xxx</div>
 *       <div class="event-fee">费用: 128元</div>
 *       <div class="event-user-count">xxx人感兴趣</div>
 *     </div>
 *   </li>
 * </ul>
 */
function parseDoubanHtml(html) {
  const events = [];

  // 用正则提取活动信息（避免引入 DOM 解析依赖）
  const entryPattern = /<li[^>]*class="[^"]*list-entry[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let match;

  while ((match = entryPattern.exec(html)) !== null) {
    const block = match[1];

    // 标题和链接
    const titleMatch = block.match(/<a[^>]*href="(https:\/\/www\.douban\.com\/event\/\d+\/?)"[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) continue;
    const url = titleMatch[1];
    const title = titleMatch[2].replace(/<[^>]+>/g, '').trim();

    // 时间
    const timeMatch = block.match(/时间[：:]\s*([\s\S]*?)(?:<\/|$)/);
    const timeStr = timeMatch ? timeMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // 地点
    const placeMatch = block.match(/地点[：:]\s*([\s\S]*?)(?:<\/|$)/);
    const place = placeMatch ? placeMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // 费用
    const feeMatch = block.match(/费用[：:]\s*([\s\S]*?)(?:<\/|$)/);
    const feeStr = feeMatch ? feeMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // 感兴趣人数
    const interestMatch = block.match(/(\d+)\s*人\s*(?:感兴趣|参加)/);
    const interestCount = interestMatch ? parseInt(interestMatch[1]) : 0;

    // 提取 ID
    const idMatch = url.match(/\/event\/(\d+)/);
    const id = idMatch ? idMatch[1] : '';

    events.push({
      id,
      title,
      url,
      timeStr,
      place,
      feeStr,
      interestCount,
    });
  }

  return events;
}

function normalizeDoubanEvent(item, city, type) {
  // 解析日期时间
  // "2026年03月22日 周六 14:00-17:00" / "2026-03-22 14:00"
  const { date, time } = parseDoubanTime(item.timeStr);

  // 解析价格
  const { price, priceRange } = parseDoubanFee(item.feeStr);

  // 根据热度推断票务状态
  let ticketStatus = 'on_sale';
  if (item.interestCount > 500) ticketStatus = 'selling_fast';
  if (price === 0) ticketStatus = 'on_sale'; // 免费活动不存在票务紧张

  // 生成标签
  const tags = [];
  const category = DOUBAN_CATEGORY_MAP[type] || 'exhibition';
  if (type === 'exhibition') tags.push('展览');
  if (type === 'drama') tags.push('话剧', '演出');
  if (type === 'salon') tags.push('工作坊', '讲座');
  if (type === 'party') tags.push('派对', '聚会');
  if (type === 'music') tags.push('现场音乐');
  if (type === 'sports') tags.push('运动', '户外');
  if (item.interestCount > 200) tags.push('热门');

  return {
    id: `douban_${item.id}`,
    title: item.title,
    category,
    date,
    time,
    venue: item.place,
    city,
    price,
    priceRange,
    description: item.title,
    tags: [...new Set(tags)],
    ticketUrl: item.url,
    announceDate: null,
    saleStartDate: null,
    ticketStatus,
    source: 'douban',
    extra: {
      interestCount: item.interestCount,
    },
  };
}

function parseDoubanTime(timeStr) {
  if (!timeStr) return { date: '', time: '' };

  // "2026年03月22日 周六 14:00-17:00"
  let dateMatch = timeStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!dateMatch) {
    // "2026-03-22"
    dateMatch = timeStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  }
  const date = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
    : '';

  const timeMatch = timeStr.match(/(\d{1,2}:\d{2})/);
  const time = timeMatch ? timeMatch[1] : '';

  return { date, time };
}

function parseDoubanFee(feeStr) {
  if (!feeStr) return { price: 0, priceRange: '免费' };
  if (feeStr.includes('免费') || feeStr.includes('free')) {
    return { price: 0, priceRange: '免费' };
  }

  const prices = [];
  const regex = /(\d+)/g;
  let m;
  while ((m = regex.exec(feeStr)) !== null) {
    prices.push(parseInt(m[1]));
  }

  if (prices.length === 0) return { price: 0, priceRange: feeStr };
  if (prices.length === 1) return { price: prices[0], priceRange: `¥${prices[0]}` };
  return {
    price: Math.min(...prices),
    priceRange: `¥${Math.min(...prices)} - ¥${Math.max(...prices)}`,
  };
}

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(15000),
      });
      if (resp.ok) return resp;
      if (resp.status === 403 || resp.status === 429) {
        await sleep(3000 * (i + 1)); // 豆瓣限流更严格
        continue;
      }
      throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(2000 * (i + 1));
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
