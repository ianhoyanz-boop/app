import { UserPreferences, EventRecommendation, EventCategory, EventReminder, ReminderLevel, UserPersona, EventFeedback } from "../types";

const geminiApiKey = process.env.GEMINI_API_KEY || '';

// ==================== Storage Keys ====================
const PREFS_STORAGE_KEY = 'lingotube_event_preferences';
const REMINDERS_STORAGE_KEY = 'lingotube_event_reminders';
const PERSONA_STORAGE_KEY = 'lingotube_user_persona';

// ==================== Gemini API Helper ====================
interface GeminiMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callGemini(
  messages: GeminiMessage[],
  systemPrompt: string,
  useWebSearch: boolean = false
): Promise<string> {
  if (!geminiApiKey) throw new Error("Gemini API Key is missing. Set GEMINI_API_KEY in .env.local");

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: any = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      maxOutputTokens: 4096,
    },
  };

  if (useWebSearch) {
    body.tools = [{ googleSearch: {} }];
  }

  const model = 'gemini-2.0-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const candidates = data.candidates || [];
  if (candidates.length === 0) throw new Error('Gemini 没有返回结果');
  const parts = candidates[0].content?.parts || [];
  return parts.filter((p: any) => p.text).map((p: any) => p.text).join('\n');
}

// ==================== Category Labels ====================
const categoryLabels: Record<EventCategory, string> = {
  concert: '演唱会/音乐会',
  comedy: '脱口秀/喜剧',
  theater: '话剧/音乐剧',
  exhibition: '展览/艺术展',
  sports: '体育赛事',
  festival: '节日/市集',
  movie: '电影首映/特别放映',
  workshop: '工作坊/体验课',
  other: '其他活动',
};

export const getCategoryLabel = (cat: EventCategory): string => categoryLabels[cat] || cat;

// ==================== Preferences ====================
const DEFAULT_PREFERENCES: UserPreferences = {
  city: '上海',
  categories: ['concert', 'comedy'],
  favoriteArtists: [],
  priceRange: { min: 0, max: 2000 },
  preferredDays: ['saturday', 'sunday'],
  keywords: [],
};

export const loadPreferences = (): UserPreferences => {
  try {
    const saved = localStorage.getItem(PREFS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { console.error('Failed to load preferences', e); }
  return DEFAULT_PREFERENCES;
};

export const savePreferences = (prefs: UserPreferences): void => {
  try { localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs)); }
  catch (e) { console.error('Failed to save preferences', e); }
};

// ==================== User Persona ====================
const DEFAULT_PERSONA: UserPersona = {
  name: '',
  bio: '',
  likedEvents: [],
  dislikedEvents: [],
  searchHistory: [],
  aiPersonaSummary: '',
  lastUpdated: Date.now(),
};

export const loadPersona = (): UserPersona => {
  try {
    const saved = localStorage.getItem(PERSONA_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { console.error('Failed to load persona', e); }
  return DEFAULT_PERSONA;
};

export const savePersona = (persona: UserPersona): void => {
  try { localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(persona)); }
  catch (e) { console.error('Failed to save persona', e); }
};

export const addEventFeedback = async (
  eventId: string,
  eventTitle: string,
  category: EventCategory,
  liked: boolean,
  reason?: string
): Promise<UserPersona> => {
  const persona = loadPersona();
  const feedback: EventFeedback = {
    eventId, eventTitle, category,
    reason,
    timestamp: Date.now(),
  };

  if (liked) {
    persona.likedEvents = [feedback, ...persona.likedEvents].slice(0, 50);
  } else {
    persona.dislikedEvents = [feedback, ...persona.dislikedEvents].slice(0, 50);
  }

  // Ask Gemini to update the persona summary based on new feedback
  try {
    const updatedSummary = await updatePersonaSummary(persona);
    persona.aiPersonaSummary = updatedSummary;
  } catch (e) {
    console.error('Failed to update persona summary', e);
  }

  persona.lastUpdated = Date.now();
  savePersona(persona);
  return persona;
};

async function updatePersonaSummary(persona: UserPersona): Promise<string> {
  const likedSummary = persona.likedEvents.slice(0, 20).map(e =>
    `- ${e.eventTitle} (${getCategoryLabel(e.category)})${e.reason ? ` - 原因: ${e.reason}` : ''}`
  ).join('\n');

  const dislikedSummary = persona.dislikedEvents.slice(0, 20).map(e =>
    `- ${e.eventTitle} (${getCategoryLabel(e.category)})${e.reason ? ` - 原因: ${e.reason}` : ''}`
  ).join('\n');

  const prompt = `基于以下用户的活动反馈数据，用中文生成一段简洁的用户画像总结（200字以内）。
这个总结将用于未来的推荐，所以请重点分析：
1. 用户的口味偏好和审美倾向
2. 喜好的规律和模式
3. 不喜欢的类型和原因
4. 价位敏感度和风格偏好

用户自我描述：${persona.bio || '未提供'}

喜欢的活动：
${likedSummary || '暂无数据'}

不喜欢的活动：
${dislikedSummary || '暂无数据'}

之前的画像总结：${persona.aiPersonaSummary || '暂无'}

请直接输出更新后的画像总结，不要有任何前缀。`;

  return await callGemini(
    [{ role: 'user', content: prompt }],
    '你是一个用户画像分析专家，擅长从用户行为中提取偏好模式。'
  );
}

// ==================== Event Search (Gemini + Google Search) ====================
export const searchEvents = async (prefs: UserPreferences): Promise<EventRecommendation[]> => {
  const persona = loadPersona();

  const categoryText = prefs.categories.map(c => categoryLabels[c]).join('、');
  const artistText = prefs.favoriteArtists.length > 0
    ? `特别关注这些艺人/团体: ${prefs.favoriteArtists.join('、')}。` : '';
  const keywordText = prefs.keywords.length > 0
    ? `用户还对以下关键词感兴趣: ${prefs.keywords.join('、')}。` : '';
  const dayText = prefs.preferredDays.map(d => {
    if (d === 'friday') return '周五';
    if (d === 'saturday') return '周六';
    return '周日';
  }).join('、');

  const personaContext = persona.aiPersonaSummary
    ? `\n\n【用户画像】\n${persona.aiPersonaSummary}`
    : '';

  const systemPrompt = `你是一个超级贴心的活动推荐助手。你的目标是帮助忙碌的上班族发现他们感兴趣的周末活动。
你了解中国各大城市的娱乐生态，包括大麦网、摩天轮票务、秀动、猫眼等主流票务平台。
你需要主动搜索最新的活动信息，特别注意那些提前公告但还未开票的热门活动。${personaContext}`;

  const userMessage = `请帮我搜索近期在 ${prefs.city} 的活动推荐。

**我的偏好：**
- 感兴趣的类型：${categoryText}
- 价格范围：${prefs.priceRange.min}-${prefs.priceRange.max} 元
- 偏好日期：${dayText}
${artistText}
${keywordText}

**搜索要求：**
1. 搜索未来2个月内的真实活动，包括已开票和即将开票的
2. 特别注意提前很久公告的热门演出（巡演、大型演唱会等），这些容易错过购票窗口
3. 标注每个活动的售票状态（已开票/预售中/即将开票/已售罄等）
4. 基于我的偏好给匹配度评分(0-100)

今天是 ${new Date().toISOString().split('T')[0]}。

请严格按以下 JSON 格式返回（不要有其他文字）：
{
  "events": [
    {
      "title": "活动名称",
      "category": "concert|comedy|theater|exhibition|sports|festival|movie|workshop|other",
      "date": "2025-04-01",
      "time": "19:30",
      "venue": "场地名称",
      "city": "${prefs.city}",
      "description": "活动描述，包含售票状态信息",
      "price": "280-880元",
      "matchScore": 85,
      "matchReason": "为什么推荐这个活动给你",
      "ticketUrl": "购票链接（如有）",
      "source": "信息来源"
    }
  ]
}`;

  const responseText = await callGemini(
    [{ role: 'user', content: userMessage }],
    systemPrompt,
    true // use Google Search
  );

  // Parse JSON from response (handle potential markdown code blocks)
  let jsonStr = responseText;
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }
  // Also try to find JSON object directly
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonStr = objectMatch[0];
  }

  try {
    const data = JSON.parse(jsonStr);
    const persona = loadPersona();
    persona.searchHistory = [
      `${prefs.city} ${categoryText} ${new Date().toISOString().split('T')[0]}`,
      ...persona.searchHistory
    ].slice(0, 20);
    savePersona(persona);

    return (data.events || []).map((evt: any, index: number) => ({
      ...evt,
      id: `evt-${Date.now()}-${index}`,
      matchScore: Math.min(100, Math.max(0, evt.matchScore || 0)),
    }));
  } catch (e) {
    console.error('Failed to parse events JSON:', e, responseText);
    throw new Error('解析活动数据失败，请重试');
  }
};

// ==================== Event Advice (Gemini) ====================
export const getEventAdvice = async (event: EventRecommendation, question: string): Promise<string> => {
  const systemPrompt = `你是一个热心的活动助手。用户正在考虑参加一个活动，请用中文简洁回答他们的问题。
可以搜索最新信息来帮助回答关于购票、交通、周边美食等问题。`;

  const userMessage = `我在考虑参加这个活动：
- 活动：${event.title}
- 日期：${event.date} ${event.time}
- 场地：${event.venue}
- 票价：${event.price}

我的问题：${question}`;

  return await callGemini(
    [{ role: 'user', content: userMessage }],
    systemPrompt,
    true
  );
};

// ==================== Reminders ====================
export const loadReminders = (): EventReminder[] => {
  try {
    const saved = localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { console.error('Failed to load reminders', e); }
  return [];
};

export const saveReminders = (reminders: EventReminder[]): void => {
  try { localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders)); }
  catch (e) { console.error('Failed to save reminders', e); }
};

export const getReminderLevel = (eventDate: string): ReminderLevel => {
  const now = new Date();
  const event = new Date(eventDate);
  const diffMs = event.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 2) return 'urgent';
  if (diffDays <= 7) return 'important';
  if (diffDays <= 30) return 'watch';
  return 'bookmark';
};

export const reminderLevelConfig: Record<ReminderLevel, { label: string; color: string; bgColor: string; description: string }> = {
  urgent: { label: '紧急', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', description: '48小时内开票/开演' },
  important: { label: '重要', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200', description: '一周内有动态' },
  watch: { label: '关注', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', description: '2周-1个月内预告' },
  bookmark: { label: '收藏', color: 'text-slate-600', bgColor: 'bg-slate-50 border-slate-200', description: '远期关注' },
};

export const addReminder = (event: EventRecommendation, note: string = '演出日'): EventReminder => {
  const reminders = loadReminders();
  const reminder: EventReminder = {
    id: `rem-${Date.now()}`,
    eventId: event.id,
    eventTitle: event.title,
    level: getReminderLevel(event.date),
    triggerDate: event.date,
    eventDate: event.date,
    note,
    ticketUrl: event.ticketUrl,
    dismissed: false,
  };
  reminders.push(reminder);
  saveReminders(reminders);
  return reminder;
};

export const dismissReminder = (reminderId: string): void => {
  const reminders = loadReminders();
  const updated = reminders.map(r => r.id === reminderId ? { ...r, dismissed: true } : r);
  saveReminders(updated);
};

export const removeReminder = (reminderId: string): void => {
  const reminders = loadReminders().filter(r => r.id !== reminderId);
  saveReminders(reminders);
};

export const getActiveReminders = (): EventReminder[] => {
  const reminders = loadReminders();
  return reminders
    .filter(r => !r.dismissed)
    .map(r => ({ ...r, level: getReminderLevel(r.eventDate) }))
    .sort((a, b) => {
      const levelOrder: Record<ReminderLevel, number> = { urgent: 0, important: 1, watch: 2, bookmark: 3 };
      return levelOrder[a.level] - levelOrder[b.level];
    });
};
