import React, { useState } from 'react';
import { UserPreferences, EventCategory } from '../types';
import { getCategoryLabel } from '../services/eventService';

interface PreferencesPanelProps {
  preferences: UserPreferences;
  onSave: (prefs: UserPreferences) => void;
  onClose: () => void;
}

const ALL_CATEGORIES: EventCategory[] = [
  'concert', 'comedy', 'theater', 'exhibition', 'sports', 'festival', 'movie', 'workshop', 'other'
];
const DAYS = [
  { key: 'friday' as const, label: '周五' },
  { key: 'saturday' as const, label: '周六' },
  { key: 'sunday' as const, label: '周日' },
];

export const PreferencesPanel: React.FC<PreferencesPanelProps> = ({ preferences, onSave, onClose }) => {
  const [prefs, setPrefs] = useState<UserPreferences>({ ...preferences });
  const [newArtist, setNewArtist] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  const toggleCategory = (cat: EventCategory) => {
    setPrefs(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  const toggleDay = (day: 'friday' | 'saturday' | 'sunday') => {
    setPrefs(prev => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter(d => d !== day)
        : [...prev.preferredDays, day]
    }));
  };

  const addArtist = () => {
    const trimmed = newArtist.trim();
    if (trimmed && !prefs.favoriteArtists.includes(trimmed)) {
      setPrefs(prev => ({ ...prev, favoriteArtists: [...prev.favoriteArtists, trimmed] }));
      setNewArtist('');
    }
  };

  const removeArtist = (artist: string) => {
    setPrefs(prev => ({ ...prev, favoriteArtists: prev.favoriteArtists.filter(a => a !== artist) }));
  };

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !prefs.keywords.includes(trimmed)) {
      setPrefs(prev => ({ ...prev, keywords: [...prev.keywords, trimmed] }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw: string) => {
    setPrefs(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== kw) }));
  };

  const handleSave = () => {
    onSave(prefs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">偏好设置</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
          </div>
          <p className="text-sm text-slate-500 mt-1">告诉我你的喜好，我来帮你找到最适合的活动</p>
        </div>

        <div className="p-6 space-y-6">
          {/* City */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">所在城市</label>
            <input
              type="text"
              value={prefs.city}
              onChange={e => setPrefs(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-800"
              placeholder="例如：上海、北京、广州"
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">感兴趣的活动类型</label>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    prefs.categories.includes(cat)
                      ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {getCategoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Days */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">偏好日期</label>
            <div className="flex gap-2">
              {DAYS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleDay(key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    prefs.preferredDays.includes(key)
                      ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              价格范围（元）: {prefs.priceRange.min} - {prefs.priceRange.max}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={prefs.priceRange.min}
                onChange={e => setPrefs(prev => ({ ...prev, priceRange: { ...prev.priceRange, min: Number(e.target.value) } }))}
                className="w-24 px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-center"
                min={0}
              />
              <span className="text-slate-400">—</span>
              <input
                type="number"
                value={prefs.priceRange.max}
                onChange={e => setPrefs(prev => ({ ...prev, priceRange: { ...prev.priceRange, max: Number(e.target.value) } }))}
                className="w-24 px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-center"
                min={0}
              />
            </div>
          </div>

          {/* Favorite Artists */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">关注的艺人/团体</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newArtist}
                onChange={e => setNewArtist(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArtist())}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"
                placeholder="输入艺人名称，回车添加"
              />
              <button onClick={addArtist} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100">
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {prefs.favoriteArtists.map(artist => (
                <span key={artist} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                  {artist}
                  <button onClick={() => removeArtist(artist)} className="text-purple-400 hover:text-purple-600 ml-1">&times;</button>
                </span>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">兴趣关键词</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"
                placeholder="例如：独立音乐、即兴喜剧、沉浸式"
              />
              <button onClick={addKeyword} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100">
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {prefs.keywords.map(kw => (
                <span key={kw} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                  {kw}
                  <button onClick={() => removeKeyword(kw)} className="text-emerald-400 hover:text-emerald-600 ml-1">&times;</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-slate-600 font-medium hover:bg-gray-50">
            取消
          </button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md">
            保存偏好
          </button>
        </div>
      </div>
    </div>
  );
};
