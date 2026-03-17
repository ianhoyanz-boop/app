/**
 * 智能提醒引擎 - 分级管理
 *
 * 提醒分4个等级：
 * 🔴 紧急 (urgent)    — 需要马上行动：明天开票、活动就在这周末且余票紧张
 * 🟡 重要 (important)  — 近期需要关注：3天内开票、余票在减少
 * 🟢 关注 (notice)     — 值得留意：新活动公告、一周内开票
 * 📌 收藏 (bookmark)   — 长期关注：很久以后的活动、已售罄但可能补票
 *
 * 触发时机：
 * - 活动刚公告 → 关注"你可能感兴趣的新活动"
 * - 开票前3天 → 重要"即将开票，准备好"
 * - 开票前1天 → 紧急"明天开票！设好闹钟"
 * - 开票当天 → 紧急"现在可以买票了！"
 * - 余票减少 → 重要"余票紧张，尽快下单"
 * - 即将售罄 → 紧急"快没了！"
 * - 售罄 → 收藏"已售罄，帮你盯着补票"
 * - 活动前3天 → 关注"活动快到了"
 * - 活动前1天 → 重要"明天就是了！别忘了"
 */

export const ALERT_LEVELS = {
  urgent:    { label: '🔴 紧急', priority: 4, description: '需要马上行动' },
  important: { label: '🟡 重要', priority: 3, description: '近期需要关注' },
  notice:    { label: '🟢 关注', priority: 2, description: '值得留意' },
  bookmark:  { label: '📌 收藏', priority: 1, description: '长期跟踪' },
};

function daysBetween(dateStr1, dateStr2) {
  return (new Date(dateStr2) - new Date(dateStr1)) / (1000 * 60 * 60 * 24);
}

export function generateAlerts(events, prefs) {
  const today = new Date().toISOString().split('T')[0];
  const alerts = [];

  for (const event of events) {
    // 跳过不匹配城市的（除非特别关注的艺人）
    const isInterested = isUserInterested(event, prefs);
    if (!isInterested) continue;

    const daysToEvent = daysBetween(today, event.date);
    const daysToSale = event.saleStartDate ? daysBetween(today, event.saleStartDate) : null;

    // === 基于开票时间的提醒 ===
    if (daysToSale !== null) {
      if (daysToSale > 0 && daysToSale <= 1) {
        alerts.push({
          level: 'urgent',
          event,
          message: '🎫 明天开票！设好闹钟准备抢票',
          action: '设置开票提醒',
        });
      } else if (daysToSale > 1 && daysToSale <= 3) {
        alerts.push({
          level: 'important',
          event,
          message: `🎫 ${Math.ceil(daysToSale)}天后开票，准备好付款方式`,
          action: '标记日历',
        });
      } else if (daysToSale > 3 && daysToSale <= 7) {
        alerts.push({
          level: 'notice',
          event,
          message: `🎫 ${Math.ceil(daysToSale)}天后开票`,
          action: '加入关注',
        });
      } else if (daysToSale <= 0 && daysToSale > -1) {
        // 今天开票
        alerts.push({
          level: 'urgent',
          event,
          message: '🎫 今天开票！现在就可以买了',
          action: '立即购票',
        });
      }
    }

    // === 基于票务状态的提醒 ===
    if (event.ticketStatus === 'selling_fast') {
      alerts.push({
        level: 'important',
        event,
        message: '⚡ 余票紧张，再不买就没了',
        action: '立即购票',
      });
    } else if (event.ticketStatus === 'almost_gone') {
      alerts.push({
        level: 'urgent',
        event,
        message: '🔥 即将售罄！最后几张票',
        action: '立即抢票',
      });
    } else if (event.ticketStatus === 'sold_out') {
      alerts.push({
        level: 'bookmark',
        event,
        message: '😢 已售罄，帮你盯着补票/转让信息',
        action: '加入候补',
      });
    }

    // === 基于活动时间的提醒 ===
    if (daysToEvent >= 0 && daysToEvent < 1 && event.ticketStatus !== 'sold_out') {
      alerts.push({
        level: 'urgent',
        event,
        message: '📅 就是今天！别忘了出门',
        action: '查看详情',
      });
    } else if (daysToEvent >= 1 && daysToEvent < 2 && event.ticketStatus !== 'sold_out') {
      alerts.push({
        level: 'important',
        event,
        message: '📅 明天就是了！准备好出发',
        action: '查看详情',
      });
    } else if (daysToEvent >= 2 && daysToEvent <= 3 && event.ticketStatus !== 'sold_out') {
      alerts.push({
        level: 'notice',
        event,
        message: '📅 活动就在这周末',
        action: '查看详情',
      });
    }
  }

  // 按优先级排序：紧急 > 重要 > 关注 > 收藏
  alerts.sort((a, b) => ALERT_LEVELS[b.level].priority - ALERT_LEVELS[a.level].priority);

  return alerts;
}

function isUserInterested(event, prefs) {
  // 城市匹配
  const cityMatch = event.city === prefs.city;

  // 类别匹配
  const categoryMatch = prefs.categories.includes(event.category);

  // 艺人/兴趣匹配（即使城市不匹配也推送——你喜欢的艺人值得跨城）
  const interests = [...(prefs.interests || []), ...(prefs.favoriteArtists || [])]
    .map(i => i.toLowerCase());
  const artistMatch = event.tags.some(tag =>
    interests.some(i => tag.toLowerCase().includes(i) || i.includes(tag.toLowerCase()))
  );

  // 艺人匹配 → 无论什么城市都推
  if (artistMatch) return true;
  // 城市+类别都匹配
  if (cityMatch && categoryMatch) return true;

  return false;
}

/**
 * 按等级分组提醒
 */
export function groupAlertsByLevel(alerts) {
  const groups = {
    urgent: [],
    important: [],
    notice: [],
    bookmark: [],
  };
  for (const alert of alerts) {
    groups[alert.level].push(alert);
  }
  return groups;
}
