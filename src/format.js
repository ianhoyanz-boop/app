/**
 * 将推荐结果格式化为好看的 HTML（微信消息）和终端文本
 */

import { CATEGORY_LABELS } from './events.js';

export function formatAsHtml(recommendations) {
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`;

  let html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; border-bottom: 2px solid #667eea; padding-bottom: 8px;">
        🎯 本周末活动推荐 (${dateStr})
      </h2>
  `;

  for (const event of recommendations) {
    const categoryLabel = CATEGORY_LABELS[event.category] || event.category;
    const matchBar = '●'.repeat(Math.round(event.matchScore / 10)) +
                     '○'.repeat(10 - Math.round(event.matchScore / 10));

    html += `
      <div style="background: #f8f9fa; border-radius: 12px; padding: 16px; margin: 12px 0; border-left: 4px solid #667eea;">
        <div style="font-size: 10px; color: #667eea; margin-bottom: 4px;">${categoryLabel}</div>
        <h3 style="margin: 4px 0; color: #1a1a1a; font-size: 16px;">${event.title}</h3>
        <p style="color: #666; font-size: 13px; margin: 4px 0;">${event.description}</p>
        <div style="font-size: 12px; color: #888; margin-top: 8px;">
          📅 ${event.date} ${event.time}<br>
          📍 ${event.venue}（${event.city}）<br>
          💰 ${event.priceRange}<br>
          匹配度: ${matchBar} ${event.matchScore}%
        </div>
        ${event.ticketUrl ? `<a href="${event.ticketUrl}" style="display: inline-block; margin-top: 8px; background: #667eea; color: white; padding: 6px 16px; border-radius: 6px; text-decoration: none; font-size: 13px;">去购票 →</a>` : ''}
      </div>
    `;
  }

  if (recommendations.length === 0) {
    html += '<p style="color: #999; text-align: center; padding: 40px 0;">这周末暂无特别匹配的活动，好好休息吧 😴</p>';
  }

  html += '</div>';
  return html;
}

export function formatAsText(recommendations) {
  if (recommendations.length === 0) {
    return '这周末暂无特别匹配的活动，好好休息吧 😴';
  }

  let text = '🎯 本周末活动推荐\n';
  text += '═'.repeat(40) + '\n\n';

  for (let i = 0; i < recommendations.length; i++) {
    const e = recommendations[i];
    const categoryLabel = CATEGORY_LABELS[e.category] || e.category;
    text += `${i + 1}. ${categoryLabel}\n`;
    text += `   ${e.title}\n`;
    text += `   📅 ${e.date} ${e.time}\n`;
    text += `   📍 ${e.venue}（${e.city}）\n`;
    text += `   💰 ${e.priceRange}\n`;
    text += `   匹配度: ${e.matchScore}%\n`;
    text += `   ${e.description}\n`;
    if (e.ticketUrl) text += `   🎫 ${e.ticketUrl}\n`;
    text += '\n';
  }

  return text;
}
