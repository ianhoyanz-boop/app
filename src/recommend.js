/**
 * 推荐引擎 - 根据用户偏好对活动打分排序
 */

export function scoreEvent(event, prefs) {
  let score = 50;

  // 类别匹配 +30
  if (prefs.categories.includes(event.category)) {
    score += 30;
  }

  // 城市匹配 +15
  if (event.city === prefs.city) {
    score += 15;
  }

  // 预算匹配
  if (prefs.budget !== 'any') {
    const maxBudget = { low: 200, medium: 500, high: 99999 }[prefs.budget];
    if (event.price <= maxBudget) score += 10;
    else score -= 15;
  }

  // 兴趣/艺人标签匹配 每个 +15
  const interests = [...(prefs.interests || []), ...(prefs.favoriteArtists || [])]
    .map(i => i.toLowerCase());
  for (const tag of event.tags) {
    if (interests.some(i => tag.toLowerCase().includes(i) || i.includes(tag.toLowerCase()))) {
      score += 15;
    }
  }

  // 周末偏好
  const day = new Date(event.date).getDay();
  if (day === 6 && prefs.preferredDays.includes('saturday')) score += 5;
  if (day === 0 && prefs.preferredDays.includes('sunday')) score += 5;

  // 时间越近分越高
  const daysAway = (new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysAway <= 7) score += 10;
  else if (daysAway <= 14) score += 5;

  return Math.min(100, Math.max(0, score));
}

export function getTopRecommendations(events, prefs, limit = 8) {
  return events
    .map(e => ({ ...e, matchScore: scoreEvent(e, prefs) }))
    .filter(e => e.matchScore >= 60) // 只推荐匹配度 >= 60 的
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}
