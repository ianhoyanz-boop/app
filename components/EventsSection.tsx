import React, { useState, useEffect, useCallback } from 'react';
import { UserPreferences, EventRecommendation, EventSearchState, EventReminder, ReminderLevel, UserPersona, EventCategory } from '../types';
import {
  searchEvents, loadPreferences, savePreferences, getEventAdvice,
  getActiveReminders, addReminder, removeReminder, dismissReminder,
  reminderLevelConfig, getCategoryLabel, loadReminders,
  loadPersona, savePersona, addEventFeedback,
} from '../services/eventService';
import { PreferencesPanel } from './PreferencesPanel';

const categoryIcons: Record<string, string> = {
  concert: '🎵', comedy: '🎤', theater: '🎭', exhibition: '🎨',
  sports: '⚽', festival: '🎪', movie: '🎬', workshop: '🔧', other: '📌',
};

const scoreColor = (score: number) => {
  if (score >= 85) return 'text-emerald-600 bg-emerald-50';
  if (score >= 70) return 'text-indigo-600 bg-indigo-50';
  if (score >= 50) return 'text-orange-600 bg-orange-50';
  return 'text-slate-500 bg-slate-50';
};

export const EventsSection: React.FC = () => {
  const [prefs, setPrefs] = useState<UserPreferences>(loadPreferences);
  const [persona, setPersona] = useState<UserPersona>(loadPersona);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showPersona, setShowPersona] = useState(false);
  const [searchState, setSearchState] = useState<EventSearchState>({ status: 'idle', events: [] });
  const [reminders, setReminders] = useState<EventReminder[]>(getActiveReminders);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [askingAdvice, setAskingAdvice] = useState<string | null>(null);
  const [adviceQuestion, setAdviceQuestion] = useState('');
  const [adviceAnswer, setAdviceAnswer] = useState('');
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'reminders' | 'persona'>('discover');
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [isFirstVisit] = useState(() => !localStorage.getItem('lingotube_event_preferences'));

  useEffect(() => {
    if (isFirstVisit) setShowPrefs(true);
  }, [isFirstVisit]);

  useEffect(() => {
    const interval = setInterval(() => setReminders(getActiveReminders()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSavePrefs = (newPrefs: UserPreferences) => {
    setPrefs(newPrefs);
    savePreferences(newPrefs);
  };

  const handleSearch = useCallback(async () => {
    setSearchState({ status: 'searching', events: [] });
    try {
      const events = await searchEvents(prefs);
      setSearchState({ status: 'done', events });
    } catch (err: any) {
      setSearchState({ status: 'error', events: [], error: err.message || '搜索失败' });
    }
  }, [prefs]);

  const handleAddReminder = (event: EventRecommendation) => {
    addReminder(event);
    setReminders(getActiveReminders());
  };

  const handleRemoveReminder = (reminderId: string) => {
    removeReminder(reminderId);
    setReminders(getActiveReminders());
  };

  const handleDismissReminder = (reminderId: string) => {
    dismissReminder(reminderId);
    setReminders(getActiveReminders());
  };

  const isEventTracked = (eventId: string) => {
    return loadReminders().some(r => r.eventId === eventId && !r.dismissed);
  };

  const handleFeedback = async (event: EventRecommendation, liked: boolean, reason?: string) => {
    setFeedbackLoading(event.id);
    try {
      const updatedPersona = await addEventFeedback(
        event.id, event.title, event.category as EventCategory, liked, reason
      );
      setPersona(updatedPersona);
    } catch (e) {
      console.error('Feedback failed', e);
    } finally {
      setFeedbackLoading(null);
    }
  };

  const handleSavePersonaBio = (bio: string) => {
    const updated = { ...persona, bio, lastUpdated: Date.now() };
    setPersona(updated);
    savePersona(updated);
  };

  const handleAskAdvice = async (event: EventRecommendation) => {
    if (!adviceQuestion.trim()) return;
    setAdviceLoading(true);
    setAdviceAnswer('');
    try {
      const answer = await getEventAdvice(event, adviceQuestion);
      setAdviceAnswer(answer);
    } catch {
      setAdviceAnswer('获取信息失败，请稍后再试。');
    } finally {
      setAdviceLoading(false);
    }
  };

  const urgentCount = reminders.filter(r => r.level === 'urgent').length;
  const importantCount = reminders.filter(r => r.level === 'important').length;

  return (
    <div className="h-full overflow-y-auto pb-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">
              周末<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">探索</span>
            </h1>
            <p className="text-slate-500 mt-1">AI 了解你的品味，主动帮你发现精彩活动</p>
          </div>
          <button
            onClick={() => setShowPrefs(true)}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-slate-600 font-medium hover:bg-gray-50 hover:shadow-sm transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            偏好
          </button>
        </div>

        {/* Urgent notification banner */}
        {urgentCount > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 animate-bounce-in">
            <span className="text-2xl">🔔</span>
            <div className="flex-1">
              <span className="font-semibold text-red-700">{urgentCount} 个紧急提醒！</span>
              <span className="text-red-600 text-sm ml-2">有活动即将开票或开演</span>
            </div>
            <button onClick={() => setActiveTab('reminders')} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">
              查看
            </button>
          </div>
        )}
        {importantCount > 0 && urgentCount === 0 && (
          <div className="mt-3 p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-center gap-3">
            <span className="text-xl">📋</span>
            <span className="text-orange-700 text-sm">{importantCount} 个关注的活动将在本周内有动态</span>
            <button onClick={() => setActiveTab('reminders')} className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 ml-auto">
              查看
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        <button onClick={() => setActiveTab('discover')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'discover' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
          发现活动
        </button>
        <button onClick={() => setActiveTab('reminders')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all relative ${activeTab === 'reminders' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
          我的提醒
          {reminders.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-indigo-100 text-indigo-700 font-bold">{reminders.length}</span>
          )}
        </button>
        <button onClick={() => setActiveTab('persona')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'persona' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
          我的画像
        </button>
      </div>

      {/* ===== Discover Tab ===== */}
      {activeTab === 'discover' && (
        <div>
          {/* Preferences summary + search */}
          <div className="mb-6 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium">📍 {prefs.city}</span>
              {prefs.categories.slice(0, 4).map(cat => (
                <span key={cat} className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium">
                  {categoryIcons[cat]} {getCategoryLabel(cat)}
                </span>
              ))}
              {prefs.favoriteArtists.slice(0, 3).map(a => (
                <span key={a} className="px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 text-xs font-medium">⭐ {a}</span>
              ))}
            </div>
            {persona.aiPersonaSummary && (
              <div className="mb-3 p-2.5 rounded-xl bg-violet-50 border border-violet-100 text-xs text-violet-700">
                🧠 <span className="font-medium">AI 对你的了解：</span>{persona.aiPersonaSummary.slice(0, 100)}...
              </div>
            )}
            <button
              onClick={handleSearch}
              disabled={searchState.status === 'searching'}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-lg hover:from-indigo-700 hover:to-violet-700 shadow-md hover:shadow-lg transition-all disabled:opacity-60"
            >
              {searchState.status === 'searching' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AI 正在搜索中...
                </span>
              ) : '🔍 搜索近期活动'}
            </button>
          </div>

          {searchState.status === 'error' && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              搜索出错：{searchState.error}
            </div>
          )}

          {searchState.status === 'done' && searchState.events.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <span className="text-4xl block mb-3">🔍</span>
              <p>没有找到匹配的活动，试试调整偏好设置？</p>
            </div>
          )}

          {searchState.events.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 font-medium">找到 {searchState.events.length} 个推荐活动</p>
              {searchState.events.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  isExpanded={expandedEvent === event.id}
                  isTracked={isEventTracked(event.id)}
                  feedbackLoading={feedbackLoading === event.id}
                  onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                  onTrack={() => handleAddReminder(event)}
                  onLike={(reason) => handleFeedback(event, true, reason)}
                  onDislike={(reason) => handleFeedback(event, false, reason)}
                  onAskAdvice={() => { setAskingAdvice(event.id); setAdviceQuestion(''); setAdviceAnswer(''); }}
                  askingAdvice={askingAdvice === event.id}
                  adviceQuestion={adviceQuestion}
                  adviceAnswer={adviceAnswer}
                  adviceLoading={adviceLoading}
                  onAdviceQuestionChange={setAdviceQuestion}
                  onSubmitAdvice={() => handleAskAdvice(event)}
                />
              ))}
            </div>
          )}

          {searchState.status === 'idle' && (
            <div className="text-center py-16 text-slate-400">
              <span className="text-6xl block mb-4">🎉</span>
              <p className="text-lg font-medium text-slate-500 mb-2">找到你的下一个周末计划</p>
              <p className="text-sm">设置好偏好，点击搜索按钮开始探索</p>
            </div>
          )}
        </div>
      )}

      {/* ===== Reminders Tab ===== */}
      {activeTab === 'reminders' && (
        <div>
          {reminders.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <span className="text-5xl block mb-4">📌</span>
              <p className="text-lg font-medium text-slate-500 mb-2">还没有任何提醒</p>
              <p className="text-sm">在「发现活动」中搜索并追踪你感兴趣的活动</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-xl bg-gray-50">
                {(['urgent', 'important', 'watch', 'bookmark'] as ReminderLevel[]).map(level => {
                  const cfg = reminderLevelConfig[level];
                  return (
                    <span key={level} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${cfg.bgColor} ${cfg.color}`}>
                      {cfg.label} · {cfg.description}
                    </span>
                  );
                })}
              </div>
              {reminders.map(reminder => {
                const cfg = reminderLevelConfig[reminder.level];
                return (
                  <div key={reminder.id} className={`p-4 rounded-xl border ${cfg.bgColor} transition-all`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${cfg.color} ${cfg.bgColor} border`}>{cfg.label}</span>
                          <span className="text-sm font-semibold text-slate-800">{reminder.eventTitle}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 space-x-3">
                          <span>📅 {reminder.eventDate}</span>
                          <span>📝 {reminder.note}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        {reminder.ticketUrl && (
                          <a href={reminder.ticketUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700">
                            去购票
                          </a>
                        )}
                        <button onClick={() => handleDismissReminder(reminder.id)} className="px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-600 hover:bg-white/50">忽略</button>
                        <button onClick={() => handleRemoveReminder(reminder.id)} className="px-2 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-600 hover:bg-white/50">删除</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== Persona Tab ===== */}
      {activeTab === 'persona' && (
        <PersonaPanel persona={persona} onSaveBio={handleSavePersonaBio} />
      )}

      {/* Preferences Modal */}
      {showPrefs && (
        <PreferencesPanel preferences={prefs} onSave={handleSavePrefs} onClose={() => setShowPrefs(false)} />
      )}
    </div>
  );
};

// ===== Persona Panel =====
const PersonaPanel: React.FC<{ persona: UserPersona; onSaveBio: (bio: string) => void }> = ({ persona, onSaveBio }) => {
  const [bio, setBio] = useState(persona.bio);
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-6">
      {/* Self-description */}
      <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-2">关于我</h3>
        <p className="text-xs text-slate-500 mb-3">告诉 AI 你是谁，你的生活方式和兴趣，它会据此优化推荐</p>
        {editing ? (
          <div>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-400 resize-none"
              rows={4}
              placeholder="例如：我是一个在上海工作的程序员，平时很忙，周末喜欢放松。喜欢独立音乐和脱口秀，偶尔看话剧。对沉浸式体验很感兴趣。预算不会太高，但遇到特别喜欢的艺人可以破例..."
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => { onSaveBio(bio); setEditing(false); }} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">保存</button>
              <button onClick={() => { setBio(persona.bio); setEditing(false); }} className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-gray-50">取消</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-600 mb-2 min-h-[40px]">{persona.bio || '还没有填写，点击编辑告诉 AI 更多关于你的信息'}</p>
            <button onClick={() => setEditing(true)} className="text-sm text-indigo-600 font-medium hover:text-indigo-700">编辑</button>
          </div>
        )}
      </div>

      {/* AI-generated persona summary */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100">
        <h3 className="font-bold text-violet-800 mb-2 flex items-center gap-2">
          🧠 AI 对你的了解
        </h3>
        {persona.aiPersonaSummary ? (
          <p className="text-sm text-violet-700 leading-relaxed">{persona.aiPersonaSummary}</p>
        ) : (
          <p className="text-sm text-violet-500 italic">
            AI 还在学习了解你。搜索活动后对推荐进行点赞/踩，AI 会逐渐建立你的品味画像。
          </p>
        )}
        {persona.lastUpdated && persona.aiPersonaSummary && (
          <p className="text-xs text-violet-400 mt-2">
            最后更新：{new Date(persona.lastUpdated).toLocaleString('zh-CN')}
          </p>
        )}
      </div>

      {/* Feedback history */}
      <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-3">反馈记录</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-600 mb-2">👍 喜欢的 ({persona.likedEvents.length})</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {persona.likedEvents.slice(0, 10).map((e, i) => (
                <div key={i} className="text-xs p-2 rounded-lg bg-emerald-50 text-emerald-700">
                  {e.eventTitle}
                  {e.reason && <span className="block text-emerald-500 mt-0.5">{e.reason}</span>}
                </div>
              ))}
              {persona.likedEvents.length === 0 && <p className="text-xs text-slate-400 italic">暂无</p>}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-red-600 mb-2">👎 不感兴趣 ({persona.dislikedEvents.length})</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {persona.dislikedEvents.slice(0, 10).map((e, i) => (
                <div key={i} className="text-xs p-2 rounded-lg bg-red-50 text-red-700">
                  {e.eventTitle}
                  {e.reason && <span className="block text-red-500 mt-0.5">{e.reason}</span>}
                </div>
              ))}
              {persona.dislikedEvents.length === 0 && <p className="text-xs text-slate-400 italic">暂无</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== Event Card =====
interface EventCardProps {
  event: EventRecommendation;
  isExpanded: boolean;
  isTracked: boolean;
  feedbackLoading: boolean;
  onToggle: () => void;
  onTrack: () => void;
  onLike: (reason?: string) => void;
  onDislike: (reason?: string) => void;
  onAskAdvice: () => void;
  askingAdvice: boolean;
  adviceQuestion: string;
  adviceAnswer: string;
  adviceLoading: boolean;
  onAdviceQuestionChange: (q: string) => void;
  onSubmitAdvice: () => void;
}

const EventCard: React.FC<EventCardProps> = ({
  event, isExpanded, isTracked, feedbackLoading,
  onToggle, onTrack, onLike, onDislike, onAskAdvice,
  askingAdvice, adviceQuestion, adviceAnswer, adviceLoading,
  onAdviceQuestionChange, onSubmitAdvice,
}) => {
  const [showFeedbackInput, setShowFeedbackInput] = useState<'like' | 'dislike' | null>(null);
  const [feedbackReason, setFeedbackReason] = useState('');

  const submitFeedback = (liked: boolean) => {
    if (liked) onLike(feedbackReason || undefined);
    else onDislike(feedbackReason || undefined);
    setShowFeedbackInput(null);
    setFeedbackReason('');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{categoryIcons[event.category] || '📌'}</span>
              <h3 className="font-bold text-slate-800 text-base leading-tight">{event.title}</h3>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>📅 {event.date} {event.time}</span>
              <span>📍 {event.venue}</span>
              <span>💰 {event.price}</span>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-lg text-sm font-bold ${scoreColor(event.matchScore)}`}>
            {event.matchScore}分
          </div>
        </div>
        <p className="mt-2 text-xs text-indigo-600 font-medium bg-indigo-50 inline-block px-2.5 py-1 rounded-lg">
          💡 {event.matchReason}
        </p>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 animate-fade-in">
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">{event.description}</p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {!isTracked ? (
              <button onClick={(e) => { e.stopPropagation(); onTrack(); }} className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors">
                🔔 加入提醒
              </button>
            ) : (
              <span className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium">✓ 已追踪</span>
            )}
            {event.ticketUrl && (
              <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium hover:shadow-md transition-all">
                🎫 去购票
              </a>
            )}
            <button onClick={(e) => { e.stopPropagation(); onAskAdvice(); }} className="px-4 py-2 rounded-xl bg-gray-100 text-slate-600 text-sm font-medium hover:bg-gray-200 transition-colors">
              💬 问一问
            </button>
          </div>

          {/* Feedback buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-50" onClick={e => e.stopPropagation()}>
            <span className="text-xs text-slate-400 mr-1">这个推荐如何？</span>
            <button
              onClick={() => setShowFeedbackInput(showFeedbackInput === 'like' ? null : 'like')}
              disabled={feedbackLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showFeedbackInput === 'like' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300' : 'bg-gray-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
            >
              👍 喜欢
            </button>
            <button
              onClick={() => setShowFeedbackInput(showFeedbackInput === 'dislike' ? null : 'dislike')}
              disabled={feedbackLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showFeedbackInput === 'dislike' ? 'bg-red-100 text-red-700 ring-2 ring-red-300' : 'bg-gray-50 text-slate-500 hover:bg-red-50 hover:text-red-600'}`}
            >
              👎 不感兴趣
            </button>
            {feedbackLoading && <span className="text-xs text-slate-400 animate-pulse">AI 正在更新画像...</span>}
          </div>

          {/* Feedback reason input */}
          {showFeedbackInput && (
            <div className="mt-2 flex gap-2 animate-fade-in" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={feedbackReason}
                onChange={e => setFeedbackReason(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitFeedback(showFeedbackInput === 'like')}
                placeholder={showFeedbackInput === 'like' ? '为什么喜欢？（可选）' : '为什么不感兴趣？（可选）'}
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-indigo-400"
              />
              <button
                onClick={() => submitFeedback(showFeedbackInput === 'like')}
                className={`px-3 py-1.5 rounded-lg text-xs text-white font-medium ${showFeedbackInput === 'like' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                提交
              </button>
            </div>
          )}

          {/* Ask Advice Section */}
          {askingAdvice && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100" onClick={e => e.stopPropagation()}>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={adviceQuestion}
                  onChange={(e) => onAdviceQuestionChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSubmitAdvice()}
                  placeholder="怎么去？附近有什么好吃的？还有票吗？"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-indigo-400"
                />
                <button onClick={onSubmitAdvice} disabled={adviceLoading} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {adviceLoading ? '...' : '问'}
                </button>
              </div>
              {adviceAnswer && (
                <div className="text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
                  {adviceAnswer}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
