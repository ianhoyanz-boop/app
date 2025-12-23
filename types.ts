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
  NOTEBOOK = 'NOTEBOOK'
}

export type StudyMode = 'standard' | 'practice';
