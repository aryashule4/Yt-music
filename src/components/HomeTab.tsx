import React, { useState } from 'react';
import { Play, SkipForward, Radio, Sparkles, Heart, Clock, Music } from 'lucide-react';
import { Song, ActiveTab } from '../types';
import { motion } from 'framer-motion'; // PERBAIKAN: Menggunakan library standar

interface HomeTabProps {
  songs: Song[];
  history: Song[];
  likedSongs: string[];
  currentSong: Song | null;
  onPlaySong: (song: Song) => void;
  onPlayQueue: (songs: Song[], startIndex: number) => void;
  onToggleLike: (songId: string) => void;
  onStartAIDJ: (mood: string) => void;
  isPremium: boolean;
  onNavigate: (tab: ActiveTab) => void;
}

export default function HomeTab({
  songs = [], // Amankan dengan default value array kosong
  history = [],
  likedSongs = [],
  currentSong,
  onPlaySong,
  onPlayQueue,
  onToggleLike,
  onStartAIDJ,
  isPremium,
  onNavigate,
}: HomeTabProps) {
  const [activeMood, setActiveMood] = useState<string>('All');
  const [djLoading, setDjLoading] = useState(false);

  const moodPills = ['All', 'Relax', 'Energize', 'Focus', 'Chill', 'Romance'];

  const filteredSongs = activeMood === 'All' 
    ? songs 
    : songs.filter(s => s.mood?.toLowerCase() === activeMood.toLowerCase() || s.genre?.toLowerCase().includes(activeMood.toLowerCase()));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat pagi';
    if (hour < 17) return 'Selamat siang';
    if (hour < 21) return 'Selamat sore';
    return 'Selamat malam';
  };

  const handleDjClick = () => {
    setDjLoading(true);
    setTimeout(() => {
      onStartAIDJ(activeMood === 'All' ? 'personalized' : activeMood);
      setDjLoading(false);
    }, 1200);
  };

  return (
    <div id="home-tab-container" className="space-y-8 pb-32 pt-2">
      {/* Mood Filters */}
      <div id="mood-filters-scroller" className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none' }}>
        {moodPills.map((mood) => (
          <button
            key={mood}
            id={`mood-pill-${mood.toLowerCase()}`}
            onClick={() => setActiveMood(mood)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
              activeMood === mood
                ? 'bg-white text-black font-bold shadow-md'
                : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80'
            }`}
          >
            {mood === 'All' ? 'Semua' : mood}
          </button>
        ))}
      </div>

      {/* Greeting Banner & Profile */}
      <div id="home-greeting-header" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            {getGreeting()}
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-sans">Selamat datang di YouTube Music Premium Clone</p>
        </div>
        <div 
          onClick={() => onNavigate('upgrade')}
          className="flex items-center gap-2 px-3 py-1 bg-zinc-800/80 rounded-full border border-zinc-700/50 cursor-pointer hover:bg-zinc-700 transition"
        >
          <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center font-bold text-[10px] text-white">
            {isPremium ? '★' : 'P'}
          </div>
          <span className="text-xs font-bold text-zinc-200">{isPremium ? 'Premium' : 'Free User'}</span>
        </div>
      </div>

      {/* AI DJ Assistant Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        id="ai-dj-banner"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-900/90 via-zinc-900 to-black p-5 sm:p-6 border border-red-500/30 shadow-xl shadow-red-950/10"
      >
        <div className="absolute right-0 top-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-600 text-[10px] font-extrabold text-white rounded-md tracking-wider uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Feature
              </span>
              <span className="text-xs text-zinc-400 font-mono font-bold">ACTIVE ASSISTANT</span>
            </div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-500 animate-pulse" /> AI DJ Radio
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Minta AI DJ menganalisis mood dan sejarah putarmu untuk membawakan radio show pribadi, lengkap dengan narasi intro audio-tekstual dari AI!
            </p>
          </div>
          <button
            id="start-ai-dj-button"
            onClick={handleDjClick}
            disabled={djLoading}
            className="w-full md:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white rounded-full font-bold text-xs shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 transition duration-300 cursor-pointer"
          >
            {djLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
                <span>Putar AI DJ Radio</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Grid Quick Picks */}
      <div id="quick-picks-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-red-600" /> Pilihan Cepat untuk Anda
          </h2>
          <span className="text-xs text-zinc-400 hover:text-white cursor-pointer transition">Lihat semua</span>
        </div>

        <div id="quick-picks-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSongs.slice(0, 6).map((song) => {
            const isLiked = likedSongs.includes(song.id);
            const isCurrent = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                id={`quick-pick-item-${song.id}`}
                className={`group flex items-center justify-between p-2 rounded-lg bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/30 transition-all duration-300 ${
                  isCurrent ? 'bg-zinc-800/80 border-red-500/40' : ''
                }`}
              >
                <div 
                  onClick={() => onPlaySong(song)}
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                >
                  <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 shadow-md">
                    <img
                      src={song.coverUrl}
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className={`text-xs font-bold truncate ${isCurrent ? 'text-red-500' : 'text-zinc-100'}`}>
                      {song.title}
                    </h4>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">{song.artist} • {song.genre}</p>
                    <span className="inline-block px-1.5 py-0.5 bg-zinc-800 text-[8px] font-semibold text-zinc-300 rounded mt-1 font-mono">
                      {song.mood}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleLike(song.id)}
                    className="p-1.5 hover:bg-zinc-700/50 rounded-full transition text-zinc-400 hover:text-red-500"
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
                  </button>
                  <span className="text-[10px] text-zinc-500 font-mono pr-2">
                    {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Listen Again / Listening History */}
      {history.length > 0 && (
        <div id="listening-history-section" className="space-y-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-400" /> Putar Lagi
          </h2>
          <div id="history-row-scroller" className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none' }}>
            {history.slice(0, 5).map((song) => (
              <div
                key={song.id}
                id={`history-item-${song.id}`}
                onClick={() => onPlaySong(song)}
                className="w-28 sm:w-32 flex-shrink-0 space-y-2 cursor-pointer group"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden shadow-lg border border-zinc-800">
                  <img
                    src={song.coverUrl}
                    alt={song.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>
                <div className="text-left min-w-0">
                  <h4 className="text-[11px] font-bold text-zinc-100 truncate group-hover:text-red-500 transition">
                    {song.title}
                  </h4>
                  <p className="text-[9px] text-zinc-400 truncate mt-0.5">{song.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Albums / Recommended Playlists */}
      <div id="featured-albums-section" className="space-y-4">
        <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
          <Radio className="w-5 h-5 text-red-600" /> Rekomendasi Campuran
        </h2>
        <div id="featured-row-scroller" className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none' }}>
          {[
            { id: 'mix-1', title: 'My Supermix', desc: 'Campuran lagu favorit & baru', gradient: 'from-blue-600 to-indigo-900', songsSlice: [0, 1, 2, 3] },
            { id: 'mix-2', title: 'Relaxing Lo-Fi Chill', desc: 'Sempurna untuk fokus & santai', gradient: 'from-purple-600 to-pink-900', songsSlice: [3, 5, 8, 2] },
            { id: 'mix-3', title: 'Energy Hyperdrive', desc: 'Semangat tinggi rock & synth', gradient: 'from-red-600 to-orange-950', songsSlice: [6, 0, 4, 9] },
          ].map((mix) => (
            <div
              key={mix.id}
              id={`featured-mix-${mix.id}`}
              onClick={() => {
                // PERBAIKAN: Filter indeks yang undefined agar aman dari crash
                const mixSongs = mix.songsSlice
                  .map(idx => songs[idx])
                  .filter(song => song !== undefined);
                if (mixSongs.length > 0) onPlayQueue(mixSongs, 0);
              }}
              className="w-40 sm:w-44 flex-shrink-0 space-y-2 cursor-pointer group text-left"
            >
              <div className={`relative aspect-square rounded-xl overflow-hidden shadow-lg bg-gradient-to-br ${mix.gradient} p-4 flex flex-col justify-between border border-zinc-700/30`}>
                <div className="flex justify-between items-start">
                  <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-[10px] text-white">
                    YTM
                  </span>
                  <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center shadow">
                    <Play className="w-3 h-3 text-white fill-white translate-x-[1px]" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-black text-white leading-tight tracking-tight uppercase">
                    {mix.title}
                  </h4>
                  <span className="text-[9px] text-white/70 font-mono">Mixed for you</span>
                </div>
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-zinc-200 group-hover:text-red-500 transition truncate">
                  {mix.title}
                </h4>
                <p className="text-[9px] text-zinc-500 line-clamp-1">{mix.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
