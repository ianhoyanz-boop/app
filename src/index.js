#!/usr/bin/env node

/**
 * WeekendBuddy - 周末活动推荐微信助手
 *
 * 用法：
 *   node src/index.js          # 运行推荐 + 提醒并推送到微信
 *   node src/index.js --test      # 仅在终端预览，不推送
 *   node src/index.js --offline   # 离线模式，跳过 API 直接用示例数据
 *   node src/index.js --html      # 生成 HTML 文件预览微信推送效果
 *
 * 运行频率（GitHub Actions）：
 *   - 每天早上9点检查紧急提醒（开票提醒、余票预警）
 *   - 每周五中午推送周末精选
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fetchEvents, fetchEventsOffline } from './events.js';
import { getTopRecommendations } from './recommend.js';
import { generateAlerts } from './alerts.js';
import { formatAsHtml, formatAsText } from './format.js';
import { pushToWechat } from './push.js';

function loadConfig() {
  if (process.env.USER_PREFERENCES) {
    try {
      const prefs = JSON.parse(process.env.USER_PREFERENCES);
      return {
        push: {
          method: process.env.PUSH_METHOD || 'pushplus',
          token: process.env.PUSHPLUS_TOKEN || process.env.SERVERCHAN_KEY,
        },
        preferences: prefs,
      };
    } catch (e) {
      console.error('解析 USER_PREFERENCES 失败:', e.message);
    }
  }

  const configPath = new URL('../config.json', import.meta.url).pathname;
  if (existsSync(configPath)) {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  }

  const examplePath = new URL('../config.example.json', import.meta.url).pathname;
  if (existsSync(examplePath)) {
    console.log('⚠️  未找到 config.json，使用示例配置');
    console.log('   请复制并修改: cp config.example.json config.json\n');
    return JSON.parse(readFileSync(examplePath, 'utf-8'));
  }

  console.error('❌ 找不到配置文件');
  process.exit(1);
}

async function main() {
  const isTest = process.argv.includes('--test');
  const isOffline = process.argv.includes('--offline');
  const isHtml = process.argv.includes('--html');
  const isDaily = process.argv.includes('--daily'); // 每日检查模式（只推紧急+重要）
  const config = loadConfig();
  const prefs = config.preferences;

  console.log(`\n🤖 WeekendBuddy - 周末活动推荐助手`);
  console.log(`📍 城市: ${prefs.city}`);
  console.log(`❤️  兴趣: ${[...prefs.categories, ...(prefs.interests || [])].join(', ')}`);
  console.log(`🎤 关注艺人: ${(prefs.favoriteArtists || []).join(', ') || '无'}\n`);

  // 获取活动
  let events;
  if (isOffline) {
    console.log('📦 离线模式，使用示例数据');
    events = fetchEventsOffline();
  } else {
    console.log('📡 正在获取活动数据...');
    events = await fetchEvents(prefs.city);
  }
  console.log(`📋 获取到 ${events.length} 个活动`);

  // 生成分级提醒
  const alerts = generateAlerts(events, prefs);
  const urgentCount = alerts.filter(a => a.level === 'urgent').length;
  const importantCount = alerts.filter(a => a.level === 'important').length;
  console.log(`🔔 提醒: ${urgentCount} 紧急, ${importantCount} 重要, ${alerts.length} 总计`);

  // 推荐活动
  const recommendations = getTopRecommendations(events, prefs);
  console.log(`🎯 推荐: ${recommendations.length} 个活动\n`);

  // 每日模式：只有紧急/重要提醒时才推送
  if (isDaily) {
    const urgentAlerts = alerts.filter(a => a.level === 'urgent' || a.level === 'important');
    if (urgentAlerts.length === 0) {
      console.log('✅ 今天没有紧急提醒，不打扰你');
      return;
    }
    console.log(formatAsText(urgentAlerts, []));
    if (!isTest) {
      const html = formatAsHtml(urgentAlerts, []);
      const title = `⚡ ${urgentCount > 0 ? '紧急' : '重要'}：${urgentAlerts[0].event.title}`;
      await pushToWechat(title, html, config);
    }
    return;
  }

  // 周五模式：完整推送
  console.log(formatAsText(alerts, recommendations));

  if (!isTest) {
    const html = formatAsHtml(alerts, recommendations);
    let title;
    if (urgentCount > 0) {
      title = `🔴 ${urgentCount}个紧急提醒 + 本周末${recommendations.length}个推荐`;
    } else {
      title = `🎯 本周末${recommendations.length}个推荐活动`;
    }
    await pushToWechat(title, html, config);
  } else {
    console.log('（测试模式，未推送到微信）');
  }

  // --html 模式：生成 HTML 文件，可在浏览器中预览
  if (isHtml) {
    const html = formatAsHtml(alerts, recommendations);
    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>WeekendBuddy 预览</title></head>
<body style="background: #f5f5f5; margin: 0; padding: 20px;">${html}</body>
</html>`;
    writeFileSync('preview.html', fullHtml);
    console.log('\n✅ 已生成 preview.html，用浏览器打开即可预览微信推送效果');
  }
}

main().catch(console.error);
