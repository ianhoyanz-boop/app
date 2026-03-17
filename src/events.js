/**
 * 活动数据源
 *
 * 每个活动有完整的时间线：
 * - announceDate: 活动公告日期
 * - saleStartDate: 开票日期
 * - eventDate: 活动日期
 * - ticketStatus: 当前票务状态
 *
 * 后续可接入真实 API（大麦、秀动、豆瓣同城）
 */

export const CATEGORY_LABELS = {
  concert: '🎵 演唱会/音乐',
  comedy: '🎤 脱口秀/喜剧',
  movie: '🎬 电影',
  exhibition: '🎨 展览',
  sports: '⚽ 体育',
  food: '🍜 美食/市集',
  outdoor: '🏕️ 户外',
  workshop: '📚 工作坊',
  theater: '🎭 话剧',
};

export const TICKET_STATUS = {
  not_announced: { label: '未公布', icon: '⚪', color: '#999' },
  upcoming_sale: { label: '即将开票', icon: '🔵', color: '#3b82f6' },
  on_sale: { label: '在售', icon: '🟢', color: '#22c55e' },
  selling_fast: { label: '余票紧张', icon: '🟡', color: '#eab308' },
  almost_gone: { label: '即将售罄', icon: '🟠', color: '#f97316' },
  sold_out: { label: '售罄', icon: '🔴', color: '#ef4444' },
  resale: { label: '二手转让中', icon: '🟣', color: '#a855f7' },
};

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function getUpcomingWeekends(count) {
  const weekends = [];
  const d = new Date();
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
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

export function fetchEvents() {
  const w = getUpcomingWeekends(8);

  return [
    // === 演唱会 ===
    {
      id: 'c1', title: '林俊杰 JJ20 世界巡回演唱会', category: 'concert',
      date: w[0].sat, time: '19:30', venue: '梅赛德斯-奔驰文化中心', city: '上海',
      price: 680, priceRange: '¥680 - ¥1880',
      description: '出道20周年世界巡回，经典曲目全新编曲',
      tags: ['林俊杰', '流行', '巡演'],
      ticketUrl: 'https://m.damai.cn',
      announceDate: daysFromNow(-30),
      saleStartDate: daysFromNow(-14),
      ticketStatus: 'selling_fast',
    },
    {
      id: 'c2', title: '草莓音乐节 2026', category: 'concert',
      date: w[1].sat, time: '12:00', venue: '上海世博公园', city: '上海',
      price: 380, priceRange: '¥380 - ¥580',
      description: '多舞台户外音乐狂欢，数十组音乐人同台',
      tags: ['音乐节', '户外', '摇滚', '电子'],
      ticketUrl: 'https://m.damai.cn',
      announceDate: daysFromNow(-20),
      saleStartDate: daysFromNow(-7),
      ticketStatus: 'on_sale',
    },
    {
      id: 'c3', title: '周杰伦嘉年华世界巡回演唱会', category: 'concert',
      date: w[4].sun, time: '19:00', venue: '国家体育场（鸟巢）', city: '北京',
      price: 1280, priceRange: '¥1280 - ¥2680',
      description: '跨越时代的音乐旅程，经典嘉年华主题巡演',
      tags: ['周杰伦', '流行', 'R&B'],
      ticketUrl: 'https://m.damai.cn',
      announceDate: daysFromNow(-45),
      saleStartDate: daysFromNow(2),  // 2天后开票！
      ticketStatus: 'upcoming_sale',
    },
    {
      id: 'c4', title: 'NewJeans Fan Meeting 上海站', category: 'concert',
      date: w[5].sat, time: '18:00', venue: '上海体育馆', city: '上海',
      price: 880, priceRange: '¥880 - ¥1680',
      description: 'NewJeans 首次中国粉丝见面会',
      tags: ['NewJeans', 'K-pop', '粉丝见面会'],
      ticketUrl: 'https://m.damai.cn',
      announceDate: daysFromNow(-10),
      saleStartDate: daysFromNow(7),  // 一周后开票
      ticketStatus: 'upcoming_sale',
    },
    {
      id: 'c5', title: '五月天「人生无限公司」巡演', category: 'concert',
      date: w[7].sat, time: '19:00', venue: '上海虹口足球场', city: '上海',
      price: 580, priceRange: '¥580 - ¥1580',
      description: '五月天年度巡演，重温经典热血时刻',
      tags: ['五月天', '摇滚', '流行'],
      ticketUrl: 'https://m.damai.cn',
      announceDate: daysFromNow(-5),
      saleStartDate: daysFromNow(14),
      ticketStatus: 'not_announced',
    },
    {
      id: 'c6', title: 'Taylor Swift The Eras Tour 上海站', category: 'concert',
      date: w[7].sun, time: '19:30', venue: '上海体育场', city: '上海',
      price: 1580, priceRange: '¥1580 - ¥3880',
      description: 'The Eras Tour 亚洲巡演上海站',
      tags: ['Taylor Swift', '流行', '巡演'],
      ticketUrl: 'https://m.damai.cn',
      announceDate: daysFromNow(-60),
      saleStartDate: daysFromNow(-30),
      ticketStatus: 'sold_out',
    },

    // === 脱口秀 ===
    {
      id: 'd1', title: '笑果脱口秀周末专场', category: 'comedy',
      date: w[0].sun, time: '20:00', venue: '笑果工厂', city: '上海',
      price: 180, priceRange: '¥180 - ¥280',
      description: '多位人气演员轮番登台，笑料不断',
      tags: ['脱口秀', '笑果', '现场喜剧'],
      ticketUrl: 'https://www.xiaoguo.com',
      announceDate: daysFromNow(-7),
      saleStartDate: daysFromNow(-7),
      ticketStatus: 'on_sale',
    },
    {
      id: 'd2', title: '呼兰个人专场「人间清醒」', category: 'comedy',
      date: w[1].sun, time: '19:30', venue: '上海大剧院', city: '上海',
      price: 280, priceRange: '¥280 - ¥580',
      description: '犀利观察搭配幽默表达，带你看透人间百态',
      tags: ['呼兰', '脱口秀', '个人专场'],
      ticketUrl: 'https://www.xiaoguo.com',
      announceDate: daysFromNow(-14),
      saleStartDate: daysFromNow(-5),
      ticketStatus: 'selling_fast',
    },
    {
      id: 'd3', title: '单立人喜剧之夜', category: 'comedy',
      date: w[2].sat, time: '20:00', venue: '单立人喜剧中心', city: '北京',
      price: 150, priceRange: '¥150 - ¥200',
      description: '北京最火的脱口秀开放麦',
      tags: ['脱口秀', '开放麦', '单立人'],
      ticketUrl: 'https://m.damai.cn',
      announceDate: daysFromNow(-5),
      saleStartDate: daysFromNow(-3),
      ticketStatus: 'on_sale',
    },
    {
      id: 'd4', title: '杨笠「独立女性」全国巡演', category: 'comedy',
      date: w[3].sat, time: '19:30', venue: '上海文化广场', city: '上海',
      price: 380, priceRange: '¥380 - ¥680',
      description: '杨笠年度个人专场全国巡演上海站',
      tags: ['杨笠', '脱口秀', '个人专场'],
      ticketUrl: 'https://www.xiaoguo.com',
      announceDate: daysFromNow(-3),
      saleStartDate: daysFromNow(1),  // 明天开票！
      ticketStatus: 'upcoming_sale',
    },

    // === 展览 ===
    {
      id: 'e1', title: 'teamLab 无界美术馆', category: 'exhibition',
      date: w[0].sat, time: '10:00', venue: 'teamLab无界上海', city: '上海',
      price: 249, priceRange: '¥249',
      description: '沉浸式数字艺术，光影交织的梦幻世界',
      tags: ['teamLab', '数字艺术', '沉浸式'],
      ticketUrl: 'https://www.teamlab.art',
      announceDate: daysFromNow(-90),
      saleStartDate: daysFromNow(-90),
      ticketStatus: 'on_sale',
    },
    {
      id: 'e2', title: '莫奈与印象派大师展', category: 'exhibition',
      date: w[1].sat, time: '09:30', venue: '上海博物馆东馆', city: '上海',
      price: 128, priceRange: '¥128',
      description: '法国奥赛博物馆珍品首次来华',
      tags: ['莫奈', '印象派', '艺术展'],
      ticketUrl: 'https://m.damai.cn',
      announceDate: daysFromNow(-30),
      saleStartDate: daysFromNow(-14),
      ticketStatus: 'selling_fast',
    },

    // === 电影 ===
    {
      id: 'm1', title: '流浪地球3 IMAX首映', category: 'movie',
      date: w[0].sat, time: '14:00', venue: 'SFC上影影城IMAX', city: '上海',
      price: 88, priceRange: '¥88',
      description: '刘慈欣科幻巨作第三部，IMAX巨幕首映',
      tags: ['科幻', 'IMAX', '首映'],
      ticketUrl: 'https://m.maoyan.com',
      announceDate: daysFromNow(-14),
      saleStartDate: daysFromNow(-3),
      ticketStatus: 'almost_gone',
    },

    // === 体育 ===
    {
      id: 's1', title: '上海申花 vs 北京国安', category: 'sports',
      date: w[1].sun, time: '15:30', venue: '上海八万人体育场', city: '上海',
      price: 120, priceRange: '¥120 - ¥380',
      description: '中超焦点之战，沪京德比',
      tags: ['足球', '中超', '申花'],
      ticketUrl: 'https://m.damai.cn',
      announceDate: daysFromNow(-10),
      saleStartDate: daysFromNow(-5),
      ticketStatus: 'on_sale',
    },
    {
      id: 's2', title: 'F1中国大奖赛', category: 'sports',
      date: w[3].sun, time: '14:00', venue: '上海国际赛车场', city: '上海',
      price: 580, priceRange: '¥580 - ¥3680',
      description: 'F1方程式中国站，速度与激情',
      tags: ['F1', '赛车', '体育'],
      ticketUrl: 'https://m.damai.cn',
      announceDate: daysFromNow(-60),
      saleStartDate: daysFromNow(-30),
      ticketStatus: 'sold_out',
    },

    // === 美食 ===
    {
      id: 'f1', title: '安义夜巷周末市集', category: 'food',
      date: w[0].sat, time: '16:00', venue: '安义路', city: '上海',
      price: 0, priceRange: '免费入场',
      description: '各国美食、手作和音乐表演',
      tags: ['市集', '美食', '夜市', '免费'],
      ticketUrl: '',
      announceDate: daysFromNow(-7),
      saleStartDate: null,
      ticketStatus: 'on_sale',
    },

    // === 户外 ===
    {
      id: 'o1', title: '崇明岛骑行一日游', category: 'outdoor',
      date: w[2].sat, time: '08:00', venue: '崇明岛', city: '上海',
      price: 198, priceRange: '¥198',
      description: '专业领队带队，穿越湿地与田园，含午餐',
      tags: ['骑行', '户外', '崇明岛'],
      ticketUrl: 'https://m.damai.cn',
      announceDate: daysFromNow(-10),
      saleStartDate: daysFromNow(-7),
      ticketStatus: 'on_sale',
    },

    // === 话剧 ===
    {
      id: 't1', title: '《暗恋桃花源》经典复排', category: 'theater',
      date: w[2].sun, time: '14:00', venue: '上海大剧院', city: '上海',
      price: 280, priceRange: '¥280 - ¥880',
      description: '赖声川经典，喜剧与悲剧交织的永恒之作',
      tags: ['话剧', '赖声川', '经典'],
      ticketUrl: 'https://m.damai.cn',
      announceDate: daysFromNow(-20),
      saleStartDate: daysFromNow(-10),
      ticketStatus: 'on_sale',
    },

    // === 工作坊 ===
    {
      id: 'w1', title: '手冲咖啡入门工作坊', category: 'workshop',
      date: w[1].sat, time: '10:00', venue: 'Seesaw Coffee Lab', city: '上海',
      price: 168, priceRange: '¥168',
      description: '从选豆到萃取，做出咖啡馆级手冲',
      tags: ['咖啡', '手冲', '工作坊'],
      ticketUrl: 'https://m.damai.cn',
      announceDate: daysFromNow(-14),
      saleStartDate: daysFromNow(-7),
      ticketStatus: 'on_sale',
    },
    {
      id: 'w2', title: '油画体验·莫奈的花园', category: 'workshop',
      date: w[3].sun, time: '14:00', venue: 'Paint Pub 画吧', city: '上海',
      price: 258, priceRange: '¥258',
      description: '零基础也能画！含所有材料和饮品',
      tags: ['油画', '艺术体验', '零基础'],
      ticketUrl: 'https://m.damai.cn',
      announceDate: daysFromNow(-7),
      saleStartDate: daysFromNow(-3),
      ticketStatus: 'on_sale',
    },
  ];
}
