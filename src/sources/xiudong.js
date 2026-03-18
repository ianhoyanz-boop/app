/**
 * 秀动数据源
 *
 * 使用秀动移动端/小程序接口获取演出信息
 * 覆盖：Live House、独立音乐、小型演出、音乐节
 *
 * 接口说明：
 * - 演出列表：https://wap.showstart.com/v3/event/list
 * - 演出详情：https://wap.showstart.com/v3/event/detail/{id}
 * - 城市搜索：https://wap.showstart.com/v3/event/search
 */

const XIUDONG_BASE = 'https://wap.showstart.com/v3';

// 秀动城市 ID
const CITY_IDS = {
  '上海': 2810,
  '北京': 2811,
  '广州': 2812,
  '深圳': 2813,
  '杭州': 2814,
  '成都': 2815,
  '南京': 2816,
  '武汉': 2817,
  '重庆': 2818,
  '西安': 2819,
  '长沙': 2820,
  '天津': 2821,
};

// 秀动演出类型
const SHOW_TYPES = [
  { id: 1, name: 'Live House' },
  { id: 2, name: '音乐节' },
  { id: 3, name: '演唱会' },
  { id: 5, name: '话剧/舞台剧' },
  { id: 13, name: '脱口秀/喜剧' },
];

/**
 * 从秀动获取演出数据
 */
export async function fetchFromXiudong(city, options = {}) {
  const cityId = CITY_IDS[city] || CITY_IDS['上海'];
  const events = [];

  for (const showType of SHOW_TYPES) {
    try {
      const items = await fetchShowList(cityId, showType.id, options);
      events.push(...items.map(item => normalizeXiudongEvent(item, city, showType)));
    } catch (err) {
      console.warn(`⚠️  秀动 ${showType.name} 数据获取失败:`, err.message);
    }
  }

  return events;
}

async function fetchShowList(cityId, showType, options = {}) {
  const url = `${XIUDONG_BASE}/event/list`;

  const resp = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      'Content-Type': 'application/json',
      'Referer': 'https://wap.showstart.com/',
    },
    body: JSON.stringify({
      cityId,
      showType,
      pageNo: options.page || 1,
      pageSize: options.pageSize || 20,
    }),
  });

  const data = await resp.json();

  if (!data || data.code !== 0 || !data.data) {
    return [];
  }

  return data.data.list || data.data || [];
}

function normalizeXiudongEvent(item, city, showType) {
  // 解析日期
  const showTime = item.showTime || item.startTime || '';
  const dateMatch = showTime.match(/(\d{4})-(\d{2})-(\d{2})/);
  const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : '';
  const timeMatch = showTime.match(/(\d{2}:\d{2})/);
  const time = timeMatch ? timeMatch[1] : '';

  // 解析价格
  const price = item.minPrice || item.price || 0;
  const maxPrice = item.maxPrice || price;
  const priceRange = price === maxPrice ? `¥${price}` : `¥${price} - ¥${maxPrice}`;

  // 票务状态
  let ticketStatus = 'on_sale';
  if (item.status === 2 || item.soldOut) {
    ticketStatus = 'sold_out';
  } else if (item.status === 0) {
    ticketStatus = 'upcoming_sale';
  } else if (item.leftTicketNum !== undefined && item.leftTicketNum < 50) {
    ticketStatus = 'selling_fast';
  } else if (item.leftTicketNum !== undefined && item.leftTicketNum < 10) {
    ticketStatus = 'almost_gone';
  }

  // 分类映射
  let category = 'concert';
  if (showType.id === 5) category = 'theater';
  if (showType.id === 13) category = 'comedy';

  // 标签
  const tags = [showType.name];
  if (item.artistName) tags.push(item.artistName);
  if (item.venueName) tags.push(item.venueName);
  if (showType.id === 1) tags.push('Live House');
  if (showType.id === 2) tags.push('音乐节', '户外');

  return {
    id: `xiudong_${item.id || item.eventId}`,
    title: item.title || item.eventName || '',
    category,
    date,
    time,
    venue: item.venueName || item.venue || '',
    city,
    price,
    priceRange,
    description: item.description || item.title || '',
    tags: [...new Set(tags)],
    ticketUrl: `https://wap.showstart.com/pages/activity/detail/detail?activityId=${item.id || item.eventId}`,
    announceDate: null,
    saleStartDate: item.saleTime || null,
    ticketStatus,
    source: 'xiudong',
    extra: {
      leftTicketNum: item.leftTicketNum,
      wantCount: item.wantNum || 0,
    },
  };
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
