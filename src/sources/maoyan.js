/**
 * 猫眼电影数据源
 *
 * 使用猫眼移动端 API 获取正在上映和即将上映的电影
 * 覆盖：电影（院线+IMAX+首映）
 *
 * 接口说明：
 * - 正在热映：https://m.maoyan.com/ajax/movieOnInfoList
 * - 即将上映：https://m.maoyan.com/ajax/comingList
 * - 电影详情：https://m.maoyan.com/ajax/detailmovie?movieId=xxx
 */

const MAOYAN_BASE = 'https://m.maoyan.com/ajax';

// 猫眼城市编码
const CITY_IDS = {
  '上海': 10,
  '北京': 1,
  '广州': 20,
  '深圳': 30,
  '杭州': 50,
  '成都': 59,
  '南京': 35,
  '武汉': 45,
  '重庆': 132,
  '西安': 233,
  '长沙': 70,
  '天津': 3,
};

/**
 * 从猫眼获取电影数据
 */
export async function fetchFromMaoyan(city, options = {}) {
  const cityId = CITY_IDS[city] || 10;
  const events = [];

  // 获取正在热映
  try {
    const onShowing = await fetchMovieList(`${MAOYAN_BASE}/movieOnInfoList`, cityId);
    events.push(...onShowing.map(m => normalizeMaoyanMovie(m, city, 'showing')));
  } catch (err) {
    console.warn('⚠️  猫眼热映数据获取失败:', err.message);
  }

  // 获取即将上映
  try {
    const coming = await fetchComingList(cityId);
    events.push(...coming.map(m => normalizeMaoyanMovie(m, city, 'coming')));
  } catch (err) {
    console.warn('⚠️  猫眼即将上映数据获取失败:', err.message);
  }

  return events;
}

async function fetchMovieList(url, cityId) {
  const resp = await fetchWithRetry(`${url}?token=&ci=${cityId}&limit=20`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      'Referer': 'https://m.maoyan.com/',
    },
  });

  const data = await resp.json();
  return data.movieList || data.movieOnInfoList || [];
}

async function fetchComingList(cityId) {
  const resp = await fetchWithRetry(`${MAOYAN_BASE}/comingList?token=&ci=${cityId}&limit=20`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      'Referer': 'https://m.maoyan.com/',
    },
  });

  const data = await resp.json();
  return data.coming || [];
}

function normalizeMaoyanMovie(movie, city, type) {
  // 解析日期 — 猫眼的日期格式可能是 "2026-03-21" 或时间戳
  let date = '';
  if (movie.comingTitle) {
    // "3月21日" → 解析
    date = parseChineseDate(movie.comingTitle);
  } else if (movie.rt) {
    date = movie.rt;
  }

  // 票务状态
  let ticketStatus = 'on_sale';
  if (type === 'coming') {
    ticketStatus = movie.haspreSale ? 'upcoming_sale' : 'not_announced';
  }
  if (movie.wishNum > 50000) {
    ticketStatus = type === 'showing' ? 'selling_fast' : ticketStatus;
  }

  // 提取标签
  const tags = [];
  if (movie.cat) tags.push(...movie.cat.split(','));
  if (movie.sc && movie.sc > 8) tags.push('高分');
  if (movie.version && movie.version.includes('IMAX')) tags.push('IMAX');
  if (movie.version && movie.version.includes('3D')) tags.push('3D');

  // 价格（猫眼只有部分电影有）
  const price = movie.minPrice || 0;

  return {
    id: `maoyan_${movie.id}`,
    title: movie.nm || '',
    category: 'movie',
    date,
    time: '',  // 电影没有固定时间
    venue: '',  // 电影院不固定
    city,
    price: Math.round(price / 100),  // 猫眼价格单位是分
    priceRange: price > 0 ? `¥${Math.round(price / 100)}起` : '以影院为准',
    description: movie.scm || movie.nm || '',
    tags: [...new Set(tags)],
    ticketUrl: `https://m.maoyan.com/movie/${movie.id}`,
    announceDate: null,
    saleStartDate: null,
    ticketStatus,
    source: 'maoyan',
    extra: {
      score: movie.sc || 0,
      wishCount: movie.wish || 0,
      boxInfo: movie.boxInfo || '',
    },
  };
}

function parseChineseDate(str) {
  // "3月21日" → "2026-03-21"
  const match = str.match(/(\d{1,2})月(\d{1,2})日/);
  if (!match) return '';
  const year = new Date().getFullYear();
  return `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
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
