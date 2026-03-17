/**
 * 微信推送模块
 *
 * 支持两种免费推送渠道（二选一）：
 *
 * 1. PushPlus（推荐）
 *    - 去 https://www.pushplus.plus 微信扫码关注
 *    - 复制你的 token
 *    - 设置到 config.json 或环境变量 PUSHPLUS_TOKEN
 *
 * 2. Server酱
 *    - 去 https://sct.ftqq.com 微信扫码登录
 *    - 复制你的 SendKey
 *    - 设置到环境变量 SERVERCHAN_KEY
 */

export async function pushToWechat(title, content, config) {
  const method = config?.push?.method || process.env.PUSH_METHOD || 'pushplus';
  const token = config?.push?.token || process.env.PUSHPLUS_TOKEN || process.env.SERVERCHAN_KEY;

  if (!token) {
    console.log('⚠️  未配置推送 Token，仅在终端显示推荐结果\n');
    console.log('📱 配置微信推送方法：');
    console.log('   1. 去 https://www.pushplus.plus 微信扫码关注');
    console.log('   2. 复制你的 Token');
    console.log('   3. 设为环境变量: export PUSHPLUS_TOKEN=你的token');
    console.log('   或写入 config.json 的 push.token 字段\n');
    return false;
  }

  try {
    if (method === 'pushplus') {
      const resp = await fetch('https://www.pushplus.plus/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          title,
          content,
          template: 'html',
        }),
      });
      const data = await resp.json();
      if (data.code === 200) {
        console.log('✅ 已推送到微信！');
        return true;
      }
      console.error('❌ PushPlus 推送失败:', data.msg);
      return false;
    }

    if (method === 'serverchan') {
      const resp = await fetch(`https://sctapi.ftqq.com/${token}.send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, desp: content }),
      });
      const data = await resp.json();
      if (data.code === 0) {
        console.log('✅ 已推送到微信！');
        return true;
      }
      console.error('❌ Server酱推送失败:', data.message);
      return false;
    }

    console.error('❌ 未知推送方式:', method);
    return false;
  } catch (err) {
    console.error('❌ 推送出错:', err.message);
    return false;
  }
}
