import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Heart, 
  Volume2, VolumeX, ListMusic, ChevronDown, Sparkles, BookOpen, 
  Info, Award, Radio, Tv 
} from 'lucide-react';
import { Song, PlaybackState } from '../types';
import { motion, AnimatePresence } from 'motion/react';

import ReactPlayer from 'react-player';
const Player: any = ReactPlayer;

interface BottomPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  isRepeat: 'none' | 'all' | 'one';
  queue: Song[];
  currentQueueIndex: number;
  likedSongs: string[];
  isPremium: boolean;
  activePlaylistName: string;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: (songId: string) => void;
  onPlaySongFromQueue: (index: number) => void;
  onYtProgress?: (playedSeconds: number) => void;
  onYtDuration?: (duration: number) => void;
  onYtEnded?: () => void;
}

type PlayerDeckTab = 'queue' | 'lyrics' | 'related';

export default function BottomPlayer({
  currentSong,
  isPlaying,
  progress,
  duration,
  volume,
  isShuffle,
  isRepeat,
  queue,
  currentQueueIndex,
  likedSongs,
  isPremium,
  activePlaylistName,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onPlaySongFromQueue,
  onYtProgress,
  onYtDuration,
  onYtEnded,
}: BottomPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deckTab, setDeckTab] = useState<PlayerDeckTab>('queue');
  const [lyricsExplanation, setLyricsExplanation] = useState<string | null>(null);
  const [explainingLyrics, setExplainingLyrics] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);

  const isYouTubeTrack = currentSong ? (currentSong.genre === 'YouTube' || currentSong.id.startsWith('yt-')) : false;
  const [playMode, setPlayMode] = useState<'song' | 'video'>('song');

  const playerRef = useRef<any>(null);

  // Automatically adjust mode when song changes
  useEffect(() => {
    setPlayMode('song');
  }, [currentSong?.id, isYouTubeTrack]);

  // Handle seeking from outside
  useEffect(() => {
    if (isYouTubeTrack && playerRef.current && playerRef.current.getCurrentTime && playerRef.current.seekTo) {
      // If difference is large, it's a manual seek
      if (Math.abs(progress - (playerRef.current.getCurrentTime() || 0)) > 2) {
        playerRef.current.seekTo(progress, 'seconds');
      }
    }
  }, [progress, isYouTubeTrack]);

  const isLiked = currentSong ? likedSongs.includes(currentSong.id) : false;

  // Reset lyrics explanation when song changes
  useEffect(() => {
    setLyricsExplanation(null);
  }, [currentSong?.id]);

  if (!currentSong) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value));
  };

  const handleVolumeToggle = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolume);
    }
  };

  const handleExplainLyrics = async () => {
    if (!currentSong) return;
    setExplainingLyrics(true);
    setLyricsExplanation(null);
    try {
      const response = await fetch('/api/ai/explain-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentSong.title,
          artist: currentSong.artist,
          lyrics: currentSong.lyrics,
        }),
      });
      const data = await response.json();
      setLyricsExplanation(data.explanation);
    } catch (err) {
      console.error('Failed to get lyrics explanation:', err);
      setLyricsExplanation('Terjadi kesalahan saat memproses makna lirik.');
    } finally {
      setExplainingLyrics(false);
    }
  };

  return (
    <>
      {/* DESKTOP PLAYER BAR */}
      <div id="desktop-player-bar" className="hidden md:flex fixed bottom-0 left-0 right-0 h-[90px] bg-[#111111] border-t border-zinc-800/80 px-6 items-center justify-between z-50 shadow-2xl">
        {/* Progress Bar Top Edge */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-zinc-800 cursor-pointer group">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={progress}
            onChange={handleSeekChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div 
            className="h-full bg-red-600 group-hover:h-[4px] transition-all duration-150"
            style={{ width: `${(progress / (duration || 1)) * 100}%` }}
          />
        </div>

        {/* Left: Song Info */}
        <div className="flex items-center gap-4 w-1/4 min-w-0">
          <img src={currentSong.coverUrl} alt={currentSong.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 shadow-lg" />
          <div className="min-w-0 flex flex-col justify-center">
            <h4 className="text-sm font-bold text-white truncate hover:underline cursor-pointer">{currentSong.title}</h4>
            <p className="text-xs text-zinc-400 truncate mt-0.5 hover:underline cursor-pointer">{currentSong.artist}</p>
          </div>
          <button onClick={() => onToggleLike(currentSong.id)} className="p-2 text-zinc-400 hover:text-red-500 rounded-full hover:bg-zinc-800 transition ml-2">
            <Heart className={`w-5 h-5 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
          </button>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-2xl px-4">
          <div className="flex items-center justify-center gap-6">
            <button onClick={onToggleShuffle} className={`p-2 rounded-full transition ${isShuffle ? 'text-red-500' : 'text-zinc-400 hover:text-white'}`}>
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={onPrev} className="p-2 text-zinc-300 hover:text-white transition">
              <SkipBack className="w-6 h-6 fill-current" />
            </button>
            <button onClick={onPlayPause} className="w-12 h-12 bg-white hover:bg-zinc-200 text-black rounded-full flex items-center justify-center transition shadow-lg hover:scale-105 active:scale-95">
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current translate-x-[2px]" />}
            </button>
            <button onClick={onNext} className="p-2 text-zinc-300 hover:text-white transition">
              <SkipForward className="w-6 h-6 fill-current" />
            </button>
            <button onClick={onToggleRepeat} className={`p-2 rounded-full transition ${isRepeat !== 'none' ? 'text-red-500' : 'text-zinc-400 hover:text-white'}`}>
              <Repeat className="w-4 h-4" />
              {isRepeat === 'one' && <span className="absolute text-[8px] font-black -mt-3 ml-2.5">1</span>}
            </button>
          </div>
          <div className="flex items-center gap-3 w-full max-w-md mt-2 text-[10px] text-zinc-400 font-mono">
            <span>{formatTime(progress)}</span>
            <div className="flex-1 h-1 bg-zinc-800 rounded-full relative group">
              <input type="range" min="0" max={duration || 100} value={progress} onChange={handleSeekChange} className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" />
              <div className="h-full bg-zinc-300 group-hover:bg-red-500 transition-colors rounded-full relative" style={{ width: `${(progress / (duration || 1)) * 100}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow" />
              </div>
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Extra Controls */}
        <div className="flex items-center justify-end gap-4 w-1/4 text-zinc-400">
          <div className="flex items-center gap-2 max-w-[150px]">
            <button onClick={handleVolumeToggle} className="p-2 hover:text-white transition">
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-20 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
          <button onClick={() => setIsExpanded(true)} className="p-2 hover:text-white transition bg-zinc-800/50 rounded-full">
            <ListMusic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MOBILE COLLAPSED PLAYER BAR */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            id="collapsed-player-bar-mobile"
            className="md:hidden fixed bottom-14 left-0 right-0 h-14 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800/80 px-4 flex items-center justify-between z-30 cursor-pointer hover:bg-zinc-800/90 transition-colors shadow-lg pb-safe"
            onClick={() => setIsExpanded(true)}
          >
            {/* Progress line indicator on collapsed player top */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-zinc-800">
              <div 
                className="h-full bg-red-600 transition-all duration-300"
                style={{ width: `${(progress / (duration || 1)) * 100}%` }}
              />
            </div>

            <div className="flex items-center gap-3 min-w-0 flex-1">
              <img
                src={currentSong.coverUrl}
                alt={currentSong.title}
                className="w-10 h-10 rounded-md object-cover shadow-md flex-shrink-0"
              />
              <div className="min-w-0 text-left">
                <h4 className="text-xs font-bold text-zinc-100 truncate">{currentSong.title}</h4>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{currentSong.artist}</p>
              </div>
            </div>

            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onToggleLike(currentSong.id)}
                className="p-1.5 text-zinc-400 hover:text-red-500 rounded-full hover:bg-zinc-800 transition"
              >
                <Heart className={`w-4.5 h-4.5 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
              </button>
              
              <button
                onClick={onPlayPause}
                className="p-2 bg-zinc-800/50 hover:bg-zinc-800 text-white rounded-full transition flex items-center justify-center border border-zinc-700/30"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white text-white" /> : <Play className="w-4 h-4 fill-white text-white translate-x-[1px]" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPANDED PLAYER SCREEN */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={isExpanded ? { y: 0, opacity: 1, pointerEvents: 'auto' as const } : { y: '100%', opacity: 0, pointerEvents: 'none' as const }}
        transition={{ type: 'spring', damping: 25, stiffness: 180 }}
        id="expanded-player-screen"
        className="fixed inset-0 bg-[#030303] text-white z-40 flex flex-col overflow-y-auto"
      >
            {/* Dynamic dynamic glowing background art blur */}
            <div 
              className="absolute inset-0 opacity-15 pointer-events-none filter blur-[100px] transition-all duration-1000"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 30%, ${currentSong.color || 'rgba(239, 68, 68, 0.4)'} 0%, transparent 70%)`
              }}
            />

            {/* Top Toolbar */}
            <div id="expanded-player-header" className="flex items-center justify-between px-4 py-3 relative z-10">
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-zinc-800/80 rounded-full transition text-zinc-300 hover:text-white"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
              <div className="text-center min-w-0 max-w-[200px]">
                <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase block">MEMUTAR DARI</span>
                <span className="text-xs font-bold text-zinc-200 truncate block mt-0.5">
                  {activePlaylistName || 'Daftar Lagu Pokok'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-zinc-800/80 rounded-full transition text-zinc-400 hover:text-zinc-200">
                  <Tv className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Layout Wrapper: Left Side (Album Art & Controls) | Right Side (Deck Tabs for PC/Tablet, else standard linear mobile) */}
            <div id="player-body-container" className="flex-1 flex flex-col lg:flex-row px-6 pb-8 gap-8 items-stretch justify-center relative z-10 max-w-5xl mx-auto w-full">
              
              {/* Left Column (Music details and triggers) */}
              <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full space-y-4">
                
                {/* Lagu | Video Switcher Pill */}
                <div className="flex justify-center mb-1">
                  <div className="bg-zinc-900 border border-zinc-850/80 rounded-full p-1 flex items-center gap-1">
                    <button
                      onClick={() => setPlayMode('song')}
                      className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer ${
                        playMode === 'song'
                          ? 'bg-zinc-800 text-white shadow'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      🎵 Lagu
                    </button>
                    <button
                      onClick={() => {
                        if (isYouTubeTrack) {
                          setPlayMode('video');
                        }
                      }}
                      disabled={!isYouTubeTrack}
                      className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full transition-all flex items-center gap-1.5 ${
                        playMode === 'video'
                          ? 'bg-zinc-800 text-red-500 shadow'
                          : isYouTubeTrack
                            ? 'text-zinc-500 hover:text-zinc-350 cursor-pointer'
                            : 'text-zinc-700 cursor-not-allowed opacity-35'
                      }`}
                    >
                      {isYouTubeTrack && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />}
                      📺 Video
                    </button>
                  </div>
                </div>

                {/* Album Cover Art / YouTube Embed Video Player */}
                <div id="album-artwork-frame" className="aspect-square w-full max-w-[320px] mx-auto rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/50 relative group bg-black">
                  {isYouTubeTrack && (
                    <div
                      className={`absolute inset-0 transition-all duration-300 ${
                        playMode === 'video' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
                      }`}
                    >
                      <Player
                        ref={playerRef}
                        src={`https://www.youtube.com/watch?v=${currentSong.youtubeId || currentSong.id.replace('yt-', '')}`}
                        playing={isPlaying}
                        volume={volume}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        controls={playMode === 'video'}
                        onTimeUpdate={(e: any) => {
                          if (onYtProgress && e.target && e.target.currentTime !== undefined) {
                            onYtProgress(e.target.currentTime);
                          }
                        }}
                        onDurationChange={(e: any) => {
                          if (onYtDuration && e.target && e.target.duration !== undefined) {
                            onYtDuration(e.target.duration);
                          }
                        }}
                        onEnded={() => {
                          if (onYtEnded) onYtEnded();
                        }}
                        config={{
                          youtube: {
                            playerVars: { modestbranding: 1, rel: 0 }
                          }
                        } as any}
                      />
                    </div>
                  )}
                  <img
                    src={currentSong.coverUrl}
                    alt={currentSong.title}
                    className={`w-full h-full object-cover transition-transform duration-1000 ${
                      isPlaying ? 'scale-100 rotate-[1deg]' : 'scale-[0.97]'
                    } ${playMode === 'video' && isYouTubeTrack ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                  />
                  {isPremium && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded border border-red-500/30 text-[8px] font-black text-red-500 tracking-widest uppercase flex items-center gap-0.5 shadow pointer-events-none z-10">
                      <Award className="w-3.5 h-3.5 text-amber-400" /> Premium HD
                    </div>
                  )}
                </div>

                {/* Song Info Row */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-xl font-black text-zinc-50 tracking-tight leading-tight truncate">{currentSong.title}</h2>
                      <p className="text-sm font-bold text-zinc-400 truncate mt-0.5">{currentSong.artist}</p>
                    </div>
                    <button
                      onClick={() => onToggleLike(currentSong.id)}
                      className="p-2 bg-zinc-900/60 hover:bg-zinc-800 rounded-full border border-zinc-800 transition text-zinc-400 hover:text-red-500 flex-shrink-0"
                    >
                      <Heart className={`w-5 h-5 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-[9px] font-semibold text-zinc-400 rounded-full font-mono uppercase">
                      {currentSong.genre}
                    </span>
                    <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-[9px] font-semibold text-zinc-400 rounded-full font-mono uppercase">
                      {currentSong.mood}
                    </span>
                    {isPremium && (
                      <span className="px-1.5 py-0.5 bg-red-600/10 border border-red-500/20 text-[9px] font-extrabold text-red-500 rounded">
                        HQ FLAC 320kbps
                      </span>
                    )}
                  </div>
                </div>

                {/* Scrubber Seek Slider */}
                <div className="space-y-2">
                  <input
                    id="player-seek-slider"
                    type="range"
                    min="0"
                    max={duration || 1}
                    value={progress}
                    onChange={handleSeekChange}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600 hover:h-1.5 transition-all"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Control Panel Matrix */}
                <div className="flex items-center justify-between px-2">
                  <button
                    onClick={onToggleShuffle}
                    className={`p-2.5 rounded-full transition ${
                      isShuffle ? 'bg-red-600/15 text-red-500 border border-red-500/20' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Acak Antrean"
                  >
                    <Shuffle className="w-4.5 h-4.5" />
                  </button>

                  <button
                    onClick={onPrev}
                    className="p-3 text-zinc-300 hover:text-white rounded-full hover:bg-zinc-900 transition"
                  >
                    <SkipBack className="w-6 h-6 fill-zinc-300 hover:fill-white" />
                  </button>

                  <button
                    onClick={onPlayPause}
                    className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-lg shadow-red-900/30 transition-all duration-300 transform active:scale-95 flex items-center justify-center border border-red-500/30"
                  >
                    {isPlaying ? <Pause className="w-7 h-7 fill-white text-white" /> : <Play className="w-7 h-7 fill-white text-white translate-x-[2px]" />}
                  </button>

                  <button
                    onClick={onNext}
                    className="p-3 text-zinc-300 hover:text-white rounded-full hover:bg-zinc-900 transition"
                  >
                    <SkipForward className="w-6 h-6 fill-zinc-300 hover:fill-white" />
                  </button>

                  <button
                    onClick={onToggleRepeat}
                    className={`p-2.5 rounded-full transition relative ${
                      isRepeat !== 'none' ? 'bg-red-600/15 text-red-500 border border-red-500/20' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Ulangi Lagu"
                  >
                    <Repeat className="w-4.5 h-4.5" />
                    {isRepeat === 'one' && (
                      <span className="absolute top-1.5 right-1.5 bg-red-600 text-[7px] text-white font-extrabold w-3 h-3 rounded-full flex items-center justify-center">
                        1
                      </span>
                    )}
                  </button>
                </div>

                {/* Volume Slider row */}
                <div className="flex items-center gap-3 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-900">
                  <button onClick={handleVolumeToggle} className="text-zinc-500 hover:text-zinc-300 transition">
                    {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    id="player-volume-slider"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-500"
                  />
                </div>
              </div>

              {/* Right Column / Deck Tabs Component (Responsive) */}
              <div className="flex-1 flex flex-col bg-zinc-950/60 border border-zinc-900 rounded-3xl overflow-hidden min-h-[350px] max-w-md mx-auto w-full">
                
                {/* Deck Tab Header */}
                <div className="flex border-b border-zinc-900 p-1 bg-zinc-950/80">
                  {[
                    { id: 'queue', label: 'Berikutnya', icon: <ListMusic className="w-3.5 h-3.5" /> },
                    { id: 'lyrics', label: 'Lirik', icon: <BookOpen className="w-3.5 h-3.5" /> },
                    { id: 'related', label: 'Terkait', icon: <Info className="w-3.5 h-3.5" /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDeckTab(tab.id as PlayerDeckTab)}
                      className={`flex-1 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 rounded-xl cursor-pointer ${
                        deckTab === tab.id
                          ? 'bg-zinc-900 text-white shadow-inner'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Deck Tab Content Wrapper */}
                <div className="flex-1 overflow-y-auto p-4 text-left">
                  
                  {/* TAB: QUEUE */}
                  {deckTab === 'queue' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-black pl-1 tracking-wider">
                        <span>DAFTAR ANTRIAN ({queue.length} LAGU)</span>
                        {isShuffle && <span className="text-red-500 uppercase">ACAK AKTIF</span>}
                      </div>

                      <div className="space-y-1.5 max-h-[340px] overflow-y-auto scrollbar-thin">
                        {queue.map((song, idx) => {
                          const isActive = idx === currentQueueIndex;
                          return (
                            <div
                              key={`${song.id}-${idx}`}
                              onClick={() => onPlaySongFromQueue(idx)}
                              className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition ${
                                isActive 
                                  ? 'bg-red-600/10 border border-red-500/20' 
                                  : 'hover:bg-zinc-900/60 border border-transparent'
                              }`}
                            >
                              <img src={song.coverUrl} alt={song.title} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <h5 className={`text-xs font-bold truncate ${isActive ? 'text-red-500' : 'text-zinc-200'}`}>
                                  {song.title}
                                </h5>
                                <p className="text-[9px] text-zinc-400 truncate mt-0.5">{song.artist}</p>
                              </div>
                              <span className="text-[10px] text-zinc-500 font-mono pr-1">
                                {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB: LYRICS */}
                  {deckTab === 'lyrics' && (
                    <div className="space-y-5">
                      {/* AI Lyric analysis trigger */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-zinc-950 to-black border border-purple-500/20 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-purple-600/20 text-[8px] font-black text-purple-400 rounded border border-purple-500/20 flex items-center gap-0.5 uppercase">
                            <Sparkles className="w-2.5 h-2.5 animate-spin-slow" /> AI Lyrics Analyst
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">POWERED BY GEMINI</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                          Penasaran dengan makna puitis terdalam di balik lirik lagu ini? Tanya Google Gemini AI untuk mengulas pesannya!
                        </p>
                        <button
                          onClick={handleExplainLyrics}
                          disabled={explainingLyrics}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-900 text-white text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
                        >
                          {explainingLyrics ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>Ulas Makna Lirik Sekarang</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* AI Explanation Area */}
                      {lyricsExplanation && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed italic"
                        >
                          <div className="flex items-center gap-1.5 mb-2 not-italic">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping" />
                            <strong className="text-white text-[11px] font-bold tracking-wide uppercase">Hasil Analisis AI:</strong>
                          </div>
                          {lyricsExplanation}
                        </motion.div>
                      )}

                      {/* Standard Lyrics display */}
                      <div className="space-y-4">
                        <span className="text-[10px] text-zinc-500 font-black pl-1 block uppercase tracking-wider">TEKS LIRIK LAGU</span>
                        <pre className="text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap pl-1 font-medium bg-zinc-900/10 p-2.5 rounded-xl border border-zinc-900/40">
                          {currentSong.lyrics}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* TAB: RELATED */}
                  {deckTab === 'related' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-zinc-900/20 border border-zinc-800/40 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-black text-white border border-zinc-700 shadow">
                            {currentSong.artist[0]}
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-white">{currentSong.artist}</h4>
                            <p className="text-[9px] text-zinc-400">Penyanyi Utama • 12.8M Pendengar Bulanan</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                          Artis ini populer dengan genre <strong>{currentSong.genre}</strong>, menghadirkan nada-nada {currentSong.mood.toLowerCase()} yang orisinal. Seri album terbarunya mendapat sambutan hangat secara global.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] text-zinc-500 font-black tracking-wider pl-1 uppercase block">REKOMENDASI TERKAIT</span>
                        {[
                          { title: 'Cybernetic Echoes', artist: 'Hologram Boy', duration: '3:45' },
                          { title: 'Solitary Moon', artist: 'Zenith Flight', duration: '4:12' },
                        ].map((rel, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-900">
                            <div>
                              <h5 className="text-xs font-bold text-zinc-200">{rel.title}</h5>
                              <p className="text-[9px] text-zinc-400 mt-0.5">{rel.artist}</p>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">{rel.duration}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          </motion.div>
    </>
  );
}
