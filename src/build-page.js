#!/usr/bin/env node

/**
 * 构建静态 HTML 页面，用于 GitHub Pages 部署
 * 生成 docs/index.html，可直接在浏览器中预览微信推送效果
 */

import { writeFileSync, mkdirSync } from 'fs';
import { fetchEventsOffline } from './events.js';
import { getTopRecommendations } from './recommend.js';
import { generateAlerts } from './alerts.js';
import { formatAsHtml } from './format.js';

const prefs = {
  city: '上海',
  categories: ['concert', 'comedy', 'exhibition', 'movie'],
  favoriteArtists: ['林俊杰', '周杰伦', 'NewJeans', '五月天'],
  interests: ['脱口秀', '音乐节', '沉浸式', '咖啡'],
  budget: 'any',
  preferredDays: ['saturday', 'sunday'],
};

const events = fetchEventsOffline();
const alerts = generateAlerts(events, prefs);
const recommendations = getTopRecommendations(events, prefs);
const content = formatAsHtml(alerts, recommendations);

const now = new Date();
const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>WeekendBuddy - 周末活动推荐</title>
  <style>
    * { box-sizing: border-box; }
    body {
      background: #f5f5f5;
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans SC', 'PingFang SC', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .header {
      text-align: center;
      padding: 24px 0 16px;
    }
    .header h1 {
      font-size: 22px;
      margin: 0 0 4px;
      color: #1a1a1a;
    }
    .header p {
      color: #999;
      font-size: 13px;
      margin: 0;
    }
    .badge {
      display: inline-block;
      background: #667eea;
      color: white;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      margin-top: 8px;
    }
    .stats {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin: 16px 0;
      font-size: 12px;
      color: #666;
    }
    .stats .stat {
      background: white;
      padding: 8px 16px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .stats .stat .num {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a1a;
      display: block;
    }
    .footer {
      text-align: center;
      padding: 24px 0;
      color: #bbb;
      font-size: 12px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto;">
    <div class="header">
      <h1>🤖 WeekendBuddy</h1>
      <p>你的周末活动推荐助手</p>
      <span class="badge">📡 每周五自动推送到微信</span>
    </div>

    <div class="stats">
      <div class="stat"><span class="num">${events.length}</span>个活动</div>
      <div class="stat"><span class="num">${alerts.filter(a => a.level === 'urgent').length}</span>紧急提醒</div>
      <div class="stat"><span class="num">${recommendations.length}</span>个推荐</div>
    </div>

    ${content}

    <div class="footer">
      <p>WeekendBuddy · 自动生成于 ${dateStr}</p>
      <p>数据来源: 大麦网 · 猫眼 · 豆瓣同城 · 秀动</p>
      <p><a href="https://github.com/ianhoyanz-boop/app">GitHub</a> · 每周五12:00自动推送</p>
    </div>
  </div>
</body>
</html>`;

mkdirSync('docs', { recursive: true });
writeFileSync('docs/index.html', html);
console.log('✅ 已生成 docs/index.html');
