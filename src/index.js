#!/usr/bin/env node

/**
 * WeekendBuddy - 周末活动推荐微信助手
 *
 * 用法：
 *   node src/index.js          # 运行推荐并推送
 *   node src/index.js --test   # 仅在终端预览，不推送
 */

import { readFileSync, existsSync } from 'fs';
import { fetchEvents } from './events.js';
import { getTopRecommendations } from './recommend.js';
import { formatAsHtml, formatAsText } from './format.js';
import { pushToWechat } from './push.js';

// 加载配置
function loadConfig() {
  // 优先从环境变量读取（GitHub Actions 场景）
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
      console.error('解析 USER_PREFERENCES 环境变量失败:', e.message);
    }
  }

  // 从 config.json 读取
  const configPath = new URL('../config.json', import.meta.url).pathname;
  if (existsSync(configPath)) {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  }

  // 从 config.example.json 读取
  const examplePath = new URL('../config.example.json', import.meta.url).pathname;
  if (existsSync(examplePath)) {
    console.log('⚠️  未找到 config.json，使用 config.example.json 的默认配置');
    console.log('   复制并修改: cp config.example.json config.json\n');
    return JSON.parse(readFileSync(examplePath, 'utf-8'));
  }

  console.error('❌ 找不到配置文件，请创建 config.json');
  process.exit(1);
}

async function main() {
  const isTest = process.argv.includes('--test');
  const config = loadConfig();
  const prefs = config.preferences;

  console.log(`\n🤖 WeekendBuddy - 周末活动推荐助手`);
  console.log(`📍 城市: ${prefs.city}`);
  console.log(`❤️  兴趣: ${[...prefs.categories, ...prefs.interests].join(', ')}`);
  console.log(`🎤 关注艺人: ${prefs.favoriteArtists.join(', ') || '无'}\n`);

  // 获取活动
  const events = fetchEvents();
  console.log(`📋 获取到 ${events.length} 个活动`);

  // 推荐
  const recommendations = getTopRecommendations(events, prefs);
  console.log(`🎯 为你筛选出 ${recommendations.length} 个推荐\n`);

  // 终端显示
  console.log(formatAsText(recommendations));

  // 推送到微信
  if (!isTest) {
    const html = formatAsHtml(recommendations);
    const title = `🎯 本周末有 ${recommendations.length} 个推荐活动`;
    await pushToWechat(title, html, config);
  } else {
    console.log('（测试模式，未推送到微信）');
  }
}

main().catch(console.error);
