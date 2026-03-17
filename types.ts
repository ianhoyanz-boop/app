export interface UserPreferences {
  categories: string[];
  city: string;
  budget: 'low' | 'medium' | 'high' | 'any';
  preferredDays: ('saturday' | 'sunday')[];
  favoriteArtists: string[];
  interests: string[];
}

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  time: string;
  venue: string;
  city: string;
  price: number;
  priceRange: string;
  description: string;
  image: string;
  tags: string[];
  ticketUrl: string;
  matchScore: number;
  reminder?: Reminder;
}

export interface Reminder {
  eventId: string;
  remindAt: string;
  type: 'ticket_sale' | 'event_day' | 'custom';
  notified: boolean;
}

export type EventCategory =
  | 'concert'
  | 'comedy'
  | 'movie'
  | 'exhibition'
  | 'sports'
  | 'food'
  | 'outdoor'
  | 'workshop'
  | 'theater'
  | 'other';

export const CATEGORY_INFO: Record<EventCategory, { label: string; icon: string; color: string }> = {
  concert: { label: '演唱会/音乐', icon: '🎵', color: 'bg-purple-100 text-purple-700' },
  comedy: { label: '脱口秀/喜剧', icon: '🎤', color: 'bg-yellow-100 text-yellow-700' },
  movie: { label: '电影', icon: '🎬', color: 'bg-blue-100 text-blue-700' },
  exhibition: { label: '展览/博物馆', icon: '🎨', color: 'bg-pink-100 text-pink-700' },
  sports: { label: '体育赛事', icon: '⚽', color: 'bg-green-100 text-green-700' },
  food: { label: '美食/市集', icon: '🍜', color: 'bg-orange-100 text-orange-700' },
  outdoor: { label: '户外活动', icon: '🏕️', color: 'bg-emerald-100 text-emerald-700' },
  workshop: { label: '工作坊/课程', icon: '📚', color: 'bg-indigo-100 text-indigo-700' },
  theater: { label: '话剧/舞台剧', icon: '🎭', color: 'bg-red-100 text-red-700' },
  other: { label: '其他', icon: '✨', color: 'bg-gray-100 text-gray-700' },
};

export type AppPage = 'discover' | 'preferences' | 'reminders' | 'tracked';
