export interface TranscriptSegment {
  id: number;
  startTime: number; // Virtual timestamp for ordering
  endTime: number;   // Virtual timestamp
  textEn: string;
  textZh: string;
  audioUrl?: string; // Cache for the generated TTS audio blob URL
  isLoadingAudio?: boolean;
}

export interface Note {
  id: string;
  original: string; // The word or sentence
  translation?: string;
  context?: string; // The full sentence it came from
  type: 'word' | 'sentence';
  timestamp: number;
}

export interface AudioBlogState {
  status: 'idle' | 'generating_script' | 'generating_audio' | 'playing' | 'error';
  audioData?: AudioBuffer;
  script?: string;
}

export interface Lesson {
  title: string;
  transcript: TranscriptSegment[];
  // Removed videoId as we are no longer using YouTube Player
}

export enum AppView {
  LANDING = 'LANDING',
  PLAYER = 'PLAYER',
  NOTEBOOK = 'NOTEBOOK',
  EVENTS = 'EVENTS'
}

export type StudyMode = 'standard' | 'practice';

// Event Recommendation Types
export type EventCategory = 'concert' | 'comedy' | 'theater' | 'exhibition' | 'sports' | 'festival' | 'movie' | 'workshop' | 'other';

export interface UserPreferences {
  city: string;
  categories: EventCategory[];
  favoriteArtists: string[];
  priceRange: { min: number; max: number };
  preferredDays: ('friday' | 'saturday' | 'sunday')[];
  keywords: string[];
}

export interface EventRecommendation {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  time: string;
  venue: string;
  city: string;
  description: string;
  price: string;
  matchScore: number; // 0-100, how well it matches preferences
  matchReason: string;
  ticketUrl?: string;
  source?: string;
}

export interface EventSearchState {
  status: 'idle' | 'searching' | 'done' | 'error';
  events: EventRecommendation[];
  error?: string;
}

// Reminder urgency levels
export type ReminderLevel = 'urgent' | 'important' | 'watch' | 'bookmark';

export interface EventReminder {
  id: string;
  eventId: string;
  eventTitle: string;
  level: ReminderLevel;
  triggerDate: string; // when to remind
  eventDate: string;
  note: string; // e.g. "开票日" or "演出日"
  ticketUrl?: string;
  dismissed: boolean;
}

// User Persona - learned from interactions and feedback
export interface UserPersona {
  // Explicit info
  name: string;
  bio: string; // free-form self description
  // Learned taste profile
  likedEvents: EventFeedback[];
  dislikedEvents: EventFeedback[];
  // Interaction history for learning
  searchHistory: string[]; // recent search queries/contexts
  // AI-generated persona summary (updated after each feedback)
  aiPersonaSummary: string;
  lastUpdated: number;
}

export interface EventFeedback {
  eventId: string;
  eventTitle: string;
  category: EventCategory;
  reason?: string; // why they liked/disliked
  timestamp: number;
}
