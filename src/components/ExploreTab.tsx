import React, { useState } from 'react';
import { Sparkles, Play, Flame, Music, ArrowRight, BookOpen, Smile, Info } from 'lucide-react';
import { Song, Playlist } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ExploreTabProps {
  songs: Song[];
  onPlayQueue: (songs: Song[], startIndex: number, customPlaylistName?: string) => void;
  onSavePlaylist: (playlist: Playlist) => void;
}

export default function ExploreTab({ songs, onPlayQueue, onSavePlaylist }: ExploreTabProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [aiPlaylist, setAiPlaylist] = useState<{
    name: string;
    description: string;
    songs: {
      originalSongId: string;
      title: string;
      artist: string;
      album: string;
      lyrics: string;
      explanation: string;
    }[];
  } | null>(null);

  const sampleChips = [
    'Lagu senja syahdu rintik hujan 🌧️',
    'Semangat gym rock membara 🔥',
    'Cyberpunk coding di malam sunyi 💻',
    'Melodi santai penghantar tidur lelap 🌙',
  ];

  const loadingMessages = [
    'Mengkoneksikan ke Google Gemini AI...',
    'Menganalisis frekuensi suara dan mood prompt...',
    'Menyeleksi lagu dasar dari katalog YouTube Music...',
    'Menulis lirik kustom yang puitis dan penuh makna...',
    'Meracik playlist AI kustom Anda siap diputar!',
  ];

  const handleGenerate = async (searchPrompt: string) => {
    if (!searchPrompt.trim()) return;
    setLoading(true);
    setAiPlaylist(null);
    
    // Cycle through loading messages
    const messageInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const response = await fetch('/api/ai/generate-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: searchPrompt }),
      });
      const data = await response.json();
      setAiPlaylist(data);
    } catch (err) {
      console.error('Failed to generate AI playlist:', err);
    } finally {
      clearInterval(messageInterval);
      setLoading(false);
      setLoadingStep(0);
    }
  };

  const handlePlayAiPlaylist = () => {
    if (!aiPlaylist) return;

    // Map AI-generated song metadata to our real playable audio tracks, overriding title/artist/album/lyrics
    const mappedSongs: Song[] = aiPlaylist.songs.map((aiSong) => {
      const originalSong = songs.find((s) => s.id === aiSong.originalSongId) || songs[0];
      return {
        ...originalSong,
        title: aiSong.title,
        artist: aiSong.artist,
        album: aiSong.album,
        lyrics: aiSong.lyrics, // Play with custom AI lyrics!
        explanation: aiSong.explanation,
      };
    });

    // Load into active queue and play
    onPlayQueue(mappedSongs, 0, aiPlaylist.name);

    // Save playlist to user library automatically
    const newPlaylist: Playlist = {
      id: `ai-playlist-${Date.now()}`,
      name: aiPlaylist.name,
      description: aiPlaylist.description,
      songs: mappedSongs,
      coverUrl: mappedSongs[0]?.coverUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
      isAICreated: true,
      prompt: prompt,
      createdAt: new Date().toLocaleDateString('id-ID'),
    };
    onSavePlaylist(newPlaylist);
  };

  return (
    <div id="explore-tab-container" className="space-y-8 pb-32 pt-2">
      {/* Dynamic Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Flame className="w-6 h-6 text-red-600" /> Jelajahi
        </h1>
        <p className="text-xs text-zinc-400 mt-1">Temukan musik baru dan buat playlist kustom dengan AI</p>
      </div>

      {/* Grid of Trending Categories */}
      <div id="explore-categories-grid" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Rilis Baru', color: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' },
          { label: 'Tangga Lagu', color: 'bg-amber-600/20 text-amber-400 border-amber-500/30' },
          { label: 'Mood & Genre', color: 'bg-blue-600/20 text-blue-400 border-blue-500/30' },
          { label: 'Fokus & Santai', color: 'bg-purple-600/20 text-purple-400 border-purple-500/30' },
        ].map((cat, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl border text-center font-bold text-xs cursor-pointer hover:scale-[1.02] transition ${cat.color}`}
          >
            {cat.label}
          </div>
        ))}
      </div>

      {/* AI PLAYLIST GENERATOR CARD */}
      <div
        id="ai-playlist-card"
        className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-5 sm:p-6"
      >
        {/* Colorful glowing background border */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-purple-600 to-blue-500" />
        <div className="absolute right-0 top-0 w-24 h-24 bg-purple-600/10 rounded-full blur-2xl" />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center text-red-500">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                AI Custom Playlist Maker
              </h3>
              <p className="text-[10px] text-zinc-400">Teknologi Google Gemini menciptakan playlist & lirik kustom</p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                id="ai-playlist-prompt-input"
                type="text"
                placeholder="Tuliskan tema, suasana, atau aktivitas Anda... (cth: lagu sedih malam hari)"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                className="flex-1 bg-zinc-950 text-white placeholder-zinc-500 px-4 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-red-500 text-xs transition-all duration-300"
              />
              <button
                id="ai-playlist-generate-button"
                onClick={() => handleGenerate(prompt)}
                disabled={loading || !prompt.trim()}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white rounded-xl font-bold text-xs transition flex items-center justify-center cursor-pointer flex-shrink-0"
              >
                {loading ? 'Sizing...' : 'Buat'}
              </button>
            </div>

            {/* Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-500 block font-semibold">Saran Ide Cepat:</span>
              <div id="prompt-chips-container" className="flex flex-wrap gap-1.5">
                {sampleChips.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPrompt(chip);
                      handleGenerate(chip);
                    }}
                    disabled={loading}
                    className="px-2.5 py-1 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700 rounded-full border border-zinc-800 text-[10px] transition cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* LOADING ANIMATION */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 space-y-4"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-red-500/20 border-t-red-600 animate-spin" />
                <Sparkles className="w-5 h-5 text-amber-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-center space-y-1 max-w-xs">
                <p className="text-xs font-bold text-white tracking-wide">Sedang Meracik Musik...</p>
                <motion.p
                  key={loadingStep}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-red-400 font-mono"
                >
                  {loadingMessages[loadingStep]}
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* GENERATED PLAYLIST PRESENTATION */}
      {aiPlaylist && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          id="generated-playlist-viewer"
          className="bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-2xl border border-red-500/20 p-5 sm:p-6 space-y-5 shadow-xl shadow-red-950/10"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-zinc-800">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-red-500">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="text-[10px] font-black tracking-widest uppercase">AI ALBUM GENERATED</span>
              </div>
              <h3 className="text-lg font-black text-white">{aiPlaylist.name}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-lg">{aiPlaylist.description}</p>
            </div>

            <button
              id="play-generated-playlist-btn"
              onClick={handlePlayAiPlaylist}
              className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 transition cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" /> Putar Semua Kustom
            </button>
          </div>

          <div id="generated-songs-list" className="space-y-3">
            {aiPlaylist.songs.map((aiSong, idx) => {
              const baseSong = songs.find((s) => s.id === aiSong.originalSongId) || songs[0];
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/40 border border-zinc-800/30 group transition"
                >
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow">
                    <img src={baseSong.coverUrl} alt={aiSong.title} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-zinc-100 truncate group-hover:text-red-400 transition">
                        {aiSong.title}
                      </h4>
                      <span className="text-[9px] text-zinc-500 font-mono whitespace-nowrap">
                        Track {idx + 1}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                      {aiSong.artist} • <span className="italic text-zinc-500">{aiSong.album}</span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[9px] text-amber-500/80 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 w-fit">
                      <Info className="w-3 h-3" />
                      <span>{aiSong.explanation}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Static recommendations categories */}
      <div id="moods-genres-section" className="space-y-4">
        <h3 className="text-sm font-extrabold text-zinc-400 tracking-wider uppercase">Vibe Populer Hari Ini</h3>
        <div id="vibe-grid" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { tag: '⚡ Olahraga', gradient: 'from-amber-600 to-red-900', label: 'Workout Melodi' },
            { tag: '☕ Santai Sore', gradient: 'from-teal-600 to-emerald-950', label: 'Chill Acoustic' },
            { tag: '💤 Istirahat', gradient: 'from-sky-700 to-indigo-950', label: 'Night Sleep Music' },
            { tag: '💔 Melankolis', gradient: 'from-violet-800 to-pink-950', label: 'Romantic Melodrama' },
          ].map((vibe, i) => (
            <div
              key={i}
              onClick={() => {
                setPrompt(vibe.label);
                handleGenerate(vibe.label);
              }}
              className={`h-20 rounded-xl bg-gradient-to-br ${vibe.gradient} p-3.5 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition`}
            >
              <span className="text-xs font-black text-white">{vibe.tag}</span>
              <span className="text-[10px] text-white/80 font-semibold flex items-center gap-1">
                Tanya AI <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
