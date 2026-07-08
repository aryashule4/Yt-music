export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  duration: number; // in seconds
  lyrics: string;
  genre: string;
  mood: string;
  color: string; // Tailwind glow or hex color for dynamic theme background (e.g., 'rgba(59, 130, 246, 0.4)')
  youtubeId?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  songs: Song[];
  coverUrl: string;
  isAICreated?: boolean;
  prompt?: string;
  createdAt: string;
}

export interface PlaybackState {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  progress: number; // current time in seconds
  queue: Song[];
  currentQueueIndex: number;
  isShuffle: boolean;
  isRepeat: 'none' | 'all' | 'one';
}

export type ActiveTab = 'home' | 'explore' | 'library' | 'upgrade';
