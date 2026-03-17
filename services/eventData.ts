import { Event, EventCategory, UserPreferences } from '../types';

// Generate dates for upcoming weekends
function getUpcomingWeekends(count: number): { sat: string; sun: string }[] {
  const weekends: { sat: string; sun: string }[] = [];
  const today = new Date();
  let d = new Date(today);
  // Find next Saturday
  while (d.getDay() !== 6) {
    d.setDate(d.getDate() + 1);
  }
  for (let i = 0; i < count; i++) {
    const sat = new Date(d);
    const sun = new Date(d);
    sun.setDate(sun.getDate() + 1);
    weekends.push({
      sat: sat.toISOString().split('T')[0],
      sun: sun.toISOString().split('T')[0],
    });
    d.setDate(d.getDate() + 7);
  }
  return weekends;
}

const weekends = getUpcomingWeekends(6);

const SAMPLE_EVENTS: Event[] = [
  // 演唱会
  {
    id: 'c1', title: '林俊杰 JJ20 世界巡回演唱会', category: 'concert',
    date: weekends[0].sat, time: '19:30', venue: '梅赛德斯-奔驰文化中心', city: '上海',
    price: 680, priceRange: '¥680 - ¥1880', description: '林俊杰出道20周年世界巡回演唱会，经典曲目全新编曲，震撼视听体验。',
    image: '', tags: ['林俊杰', '流行', '巡演'], ticketUrl: 'https://www.damai.cn', matchScore: 0,
  },
  {
    id: 'c2', title: '草莓音乐节 2026', category: 'concert',
    date: weekends[1].sat, time: '12:00', venue: '上海世博公园', city: '上海',
    price: 380, priceRange: '¥380 - ¥580', description: '多舞台、多风格的户外音乐狂欢，数十组音乐人同台演出。',
    image: '', tags: ['音乐节', '户外', '摇滚', '电子'], ticketUrl: 'https://www.damai.cn', matchScore: 0,
  },
  {
    id: 'c3', title: '周杰伦嘉年华世界巡回演唱会', category: 'concert',
    date: weekends[2].sun, time: '19:00', venue: '国家体育场（鸟巢）', city: '北京',
    price: 1280, priceRange: '¥1280 - ¥2680', description: '周杰伦经典嘉年华主题巡演，一场跨越时代的音乐旅程。',
    image: '', tags: ['周杰伦', '流行', 'R&B'], ticketUrl: 'https://www.damai.cn', matchScore: 0,
  },
  {
    id: 'c4', title: 'NewJeans Fan Meeting', category: 'concert',
    date: weekends[3].sat, time: '18:00', venue: '上海体育馆', city: '上海',
    price: 880, priceRange: '¥880 - ¥1680', description: 'NewJeans 首次中国粉丝见面会，近距离互动体验。',
    image: '', tags: ['NewJeans', 'K-pop', '粉丝见面会'], ticketUrl: 'https://www.damai.cn', matchScore: 0,
  },
  // 脱口秀
  {
    id: 'd1', title: '笑果脱口秀周末专场', category: 'comedy',
    date: weekends[0].sun, time: '20:00', venue: '笑果工厂', city: '上海',
    price: 180, priceRange: '¥180 - ¥280', description: '笑果文化周末精品专场，多位人气演员轮番登台，笑料不断。',
    image: '', tags: ['脱口秀', '笑果', '现场喜剧'], ticketUrl: 'https://www.xiaoguo.com', matchScore: 0,
  },
  {
    id: 'd2', title: '呼兰个人专场「人间清醒」', category: 'comedy',
    date: weekends[1].sun, time: '19:30', venue: '上海大剧院', city: '上海',
    price: 280, priceRange: '¥280 - ¥580', description: '呼兰最新个人专场，犀利观察搭配幽默表达，带你看透人间百态。',
    image: '', tags: ['呼兰', '脱口秀', '个人专场'], ticketUrl: 'https://www.xiaoguo.com', matchScore: 0,
  },
  {
    id: 'd3', title: '单立人喜剧之夜', category: 'comedy',
    date: weekends[2].sat, time: '20:00', venue: '单立人喜剧中心', city: '北京',
    price: 150, priceRange: '¥150 - ¥200', description: '北京最火的脱口秀开放麦，新锐与老将同台竞技。',
    image: '', tags: ['脱口秀', '开放麦', '单立人'], ticketUrl: 'https://www.damai.cn', matchScore: 0,
  },
  // 展览
  {
    id: 'e1', title: 'teamLab 无界美术馆', category: 'exhibition',
    date: weekends[0].sat, time: '10:00', venue: 'teamLab无界上海', city: '上海',
    price: 249, priceRange: '¥249', description: '沉浸式数字艺术体验，置身于光影交织的梦幻世界。',
    image: '', tags: ['teamLab', '数字艺术', '沉浸式'], ticketUrl: 'https://www.teamlab.art', matchScore: 0,
  },
  {
    id: 'e2', title: '莫奈与印象派大师展', category: 'exhibition',
    date: weekends[1].sat, time: '09:30', venue: '上海博物馆东馆', city: '上海',
    price: 128, priceRange: '¥128', description: '法国奥赛博物馆珍品首次来华，近距离欣赏印象派大师真迹。',
    image: '', tags: ['莫奈', '印象派', '艺术展'], ticketUrl: 'https://www.damai.cn', matchScore: 0,
  },
  // 电影
  {
    id: 'm1', title: '流浪地球3 IMAX首映', category: 'movie',
    date: weekends[0].sat, time: '14:00', venue: 'SFC上影影城IMAX', city: '上海',
    price: 88, priceRange: '¥88', description: '刘慈欣科幻巨作第三部，IMAX巨幕首映场。',
    image: '', tags: ['科幻', 'IMAX', '首映'], ticketUrl: 'https://www.maoyan.com', matchScore: 0,
  },
  // 体育
  {
    id: 's1', title: '上海申花 vs 北京国安', category: 'sports',
    date: weekends[1].sun, time: '15:30', venue: '上海八万人体育场', city: '上海',
    price: 120, priceRange: '¥120 - ¥380', description: '中超联赛焦点之战，沪京德比。',
    image: '', tags: ['足球', '中超', '申花'], ticketUrl: 'https://www.damai.cn', matchScore: 0,
  },
  {
    id: 's2', title: 'F1中国大奖赛', category: 'sports',
    date: weekends[3].sun, time: '14:00', venue: '上海国际赛车场', city: '上海',
    price: 580, priceRange: '¥580 - ¥3680', description: 'F1方程式赛车中国站，感受速度与激情。',
    image: '', tags: ['F1', '赛车', '体育'], ticketUrl: 'https://www.damai.cn', matchScore: 0,
  },
  // 美食
  {
    id: 'f1', title: '安义夜巷周末市集', category: 'food',
    date: weekends[0].sat, time: '16:00', venue: '安义路', city: '上海',
    price: 0, priceRange: '免费入场', description: '上海最热闹的周末夜市，汇集各国美食、手作和音乐表演。',
    image: '', tags: ['市集', '美食', '夜市', '免费'], ticketUrl: '', matchScore: 0,
  },
  // 户外
  {
    id: 'o1', title: '崇明岛骑行探索一日游', category: 'outdoor',
    date: weekends[2].sat, time: '08:00', venue: '崇明岛', city: '上海',
    price: 198, priceRange: '¥198', description: '专业领队带队骑行，穿越湿地与田园风光，含午餐。',
    image: '', tags: ['骑行', '户外', '崇明岛'], ticketUrl: 'https://www.damai.cn', matchScore: 0,
  },
  // 话剧
  {
    id: 't1', title: '《暗恋桃花源》经典复排', category: 'theater',
    date: weekends[2].sun, time: '14:00', venue: '上海大剧院', city: '上海',
    price: 280, priceRange: '¥280 - ¥880', description: '赖声川经典话剧，一出喜剧与悲剧交织的永恒之作。',
    image: '', tags: ['话剧', '赖声川', '经典'], ticketUrl: 'https://www.damai.cn', matchScore: 0,
  },
  // 工作坊
  {
    id: 'w1', title: '手冲咖啡入门工作坊', category: 'workshop',
    date: weekends[1].sat, time: '10:00', venue: 'Seesaw Coffee Lab', city: '上海',
    price: 168, priceRange: '¥168', description: '从选豆到萃取，学会在家做出咖啡馆级别的手冲咖啡。',
    image: '', tags: ['咖啡', '手冲', '工作坊'], ticketUrl: 'https://www.damai.cn', matchScore: 0,
  },
  {
    id: 'w2', title: '油画体验·莫奈的花园', category: 'workshop',
    date: weekends[3].sun, time: '14:00', venue: 'Paint Pub 画吧', city: '上海',
    price: 258, priceRange: '¥258', description: '零基础也能画！在专业老师指导下创作你的印象派作品，含所有材料和饮品。',
    image: '', tags: ['油画', '艺术体验', '零基础'], ticketUrl: 'https://www.damai.cn', matchScore: 0,
  },
];

function calculateMatchScore(event: Event, prefs: UserPreferences): number {
  let score = 50; // base score

  // Category match
  if (prefs.categories.includes(event.category)) {
    score += 30;
  }

  // City match
  if (event.city === prefs.city) {
    score += 15;
  }

  // Budget match
  if (prefs.budget !== 'any') {
    const budgetMax = prefs.budget === 'low' ? 200 : prefs.budget === 'medium' ? 500 : 99999;
    if (event.price <= budgetMax) score += 10;
    else score -= 10;
  }

  // Tag/interest match
  const interests = [...prefs.interests, ...prefs.favoriteArtists].map(i => i.toLowerCase());
  for (const tag of event.tags) {
    if (interests.some(i => tag.toLowerCase().includes(i) || i.includes(tag.toLowerCase()))) {
      score += 15;
    }
  }

  // Date preference match
  const eventDate = new Date(event.date);
  const day = eventDate.getDay();
  if (day === 6 && prefs.preferredDays.includes('saturday')) score += 5;
  if (day === 0 && prefs.preferredDays.includes('sunday')) score += 5;

  // Proximity bonus (sooner events score slightly higher)
  const daysAway = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysAway <= 7) score += 10;
  else if (daysAway <= 14) score += 5;

  return Math.min(100, Math.max(0, score));
}

export function getRecommendedEvents(prefs: UserPreferences): Event[] {
  return SAMPLE_EVENTS
    .map(event => ({ ...event, matchScore: calculateMatchScore(event, prefs) }))
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function getEventsByCategory(category: EventCategory, prefs: UserPreferences): Event[] {
  return getRecommendedEvents(prefs).filter(e => e.category === category);
}

export function getEventById(id: string): Event | undefined {
  return SAMPLE_EVENTS.find(e => e.id === id);
}
