/**
 * 格式化推送消息 - 分级显示
 */

import { CATEGORY_LABELS, TICKET_STATUS } from './events.js';
import { ALERT_LEVELS, groupAlertsByLevel } from './alerts.js';

export function formatAsHtml(alerts, recommendations) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const grouped = groupAlertsByLevel(alerts);

  let html = `
    <div style="font-family: -apple-system, 'Noto Sans SC', sans-serif; max-width: 600px; margin: 0 auto; padding: 12px;">
      <h2 style="color: #1a1a1a; margin-bottom: 4px;">🤖 WeekendBuddy</h2>
      <p style="color: #888; font-size: 13px; margin-top: 0;">${dateStr} 活动提醒</p>
  `;

  // 🔴 紧急提醒
  if (grouped.urgent.length > 0) {
    html += renderSection('🔴 需要马上行动', '#fee2e2', '#dc2626', grouped.urgent);
  }

  // 🟡 重要提醒
  if (grouped.important.length > 0) {
    html += renderSection('🟡 近期关注', '#fef9c3', '#ca8a04', grouped.important);
  }

  // 🟢 一般关注
  if (grouped.notice.length > 0) {
    html += renderSection('🟢 值得留意', '#dcfce7', '#16a34a', grouped.notice);
  }

  // 📌 长期跟踪
  if (grouped.bookmark.length > 0) {
    html += renderSection('📌 持续关注', '#f3e8ff', '#9333ea', grouped.bookmark);
  }

  // 本周末精选推荐（非提醒类）
  if (recommendations.length > 0) {
    html += `<h3 style="color: #374151; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">📋 本周末精选</h3>`;
    for (const e of recommendations.slice(0, 5)) {
      const status = TICKET_STATUS[e.ticketStatus] || TICKET_STATUS.on_sale;
      html += `
        <div style="background: #f8f9fa; border-radius: 8px; padding: 12px; margin: 8px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; color: #667eea;">${CATEGORY_LABELS[e.category] || e.category}</span>
            <span style="font-size: 11px; color: ${status.color};">${status.icon} ${status.label}</span>
          </div>
          <div style="font-weight: 600; margin: 4px 0;">${e.title}</div>
          <div style="font-size: 12px; color: #888;">📅 ${e.date} ${e.time} · 📍 ${e.venue} · 💰 ${e.priceRange}</div>
          ${e.ticketUrl && e.ticketStatus !== 'sold_out' ? `<a href="${e.ticketUrl}" style="display: inline-block; margin-top: 6px; background: #667eea; color: white; padding: 4px 12px; border-radius: 4px; text-decoration: none; font-size: 12px;">去购票</a>` : ''}
        </div>
      `;
    }
  }

  if (alerts.length === 0 && recommendations.length === 0) {
    html += '<p style="color: #999; text-align: center; padding: 40px 0;">这周没有特别匹配的活动，好好休息吧 😴</p>';
  }

  html += '</div>';
  return html;
}

function renderSection(title, bgColor, borderColor, alertList) {
  let html = `
    <div style="margin: 16px 0;">
      <h3 style="color: ${borderColor}; font-size: 15px; margin-bottom: 8px;">${title}</h3>
  `;

  for (const alert of alertList) {
    const e = alert.event;
    const status = TICKET_STATUS[e.ticketStatus] || TICKET_STATUS.on_sale;
    html += `
      <div style="background: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: 8px; padding: 12px; margin: 8px 0;">
        <div style="font-weight: 600; color: #1a1a1a;">${e.title}</div>
        <div style="font-size: 13px; color: ${borderColor}; margin: 4px 0; font-weight: 500;">${alert.message}</div>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">
          📅 ${e.date} ${e.time} · 📍 ${e.venue}（${e.city}）<br>
          💰 ${e.priceRange} · ${status.icon} ${status.label}
        </div>
        ${e.ticketUrl && e.ticketStatus !== 'sold_out' ? `<a href="${e.ticketUrl}" style="display: inline-block; margin-top: 6px; background: ${borderColor}; color: white; padding: 4px 14px; border-radius: 4px; text-decoration: none; font-size: 12px;">${alert.action}</a>` : ''}
      </div>
    `;
  }

  html += '</div>';
  return html;
}

export function formatAsText(alerts, recommendations) {
  const grouped = groupAlertsByLevel(alerts);
  let text = '🤖 WeekendBuddy 活动提醒\n';
  text += '═'.repeat(40) + '\n\n';

  if (grouped.urgent.length > 0) {
    text += '🔴 【紧急 - 需要马上行动】\n\n';
    text += formatAlertGroup(grouped.urgent);
  }

  if (grouped.important.length > 0) {
    text += '🟡 【重要 - 近期关注】\n\n';
    text += formatAlertGroup(grouped.important);
  }

  if (grouped.notice.length > 0) {
    text += '🟢 【关注 - 值得留意】\n\n';
    text += formatAlertGroup(grouped.notice);
  }

  if (grouped.bookmark.length > 0) {
    text += '📌 【收藏 - 持续关注】\n\n';
    text += formatAlertGroup(grouped.bookmark);
  }

  if (recommendations.length > 0) {
    text += '─'.repeat(40) + '\n';
    text += '📋 本周末精选\n\n';
    for (const e of recommendations.slice(0, 5)) {
      const status = TICKET_STATUS[e.ticketStatus] || TICKET_STATUS.on_sale;
      text += `  ${CATEGORY_LABELS[e.category]} ${e.title}\n`;
      text += `  📅 ${e.date} ${e.time} · 📍 ${e.venue}\n`;
      text += `  💰 ${e.priceRange} · ${status.icon} ${status.label}\n\n`;
    }
  }

  if (alerts.length === 0 && recommendations.length === 0) {
    text += '这周没有特别匹配的活动，好好休息吧 😴\n';
  }

  return text;
}

function formatAlertGroup(alertList) {
  let text = '';
  for (const alert of alertList) {
    const e = alert.event;
    const status = TICKET_STATUS[e.ticketStatus] || TICKET_STATUS.on_sale;
    text += `  ▸ ${e.title}\n`;
    text += `    ${alert.message}\n`;
    text += `    📅 ${e.date} ${e.time} · 📍 ${e.venue}（${e.city}）\n`;
    text += `    💰 ${e.priceRange} · ${status.icon} ${status.label}\n`;
    if (e.ticketUrl && e.ticketStatus !== 'sold_out') {
      text += `    🎫 ${e.ticketUrl}\n`;
    }
    text += '\n';
  }
  return text;
}
