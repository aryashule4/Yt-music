import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Home, Compass, FolderHeart, Sparkles, Search, Play, Pause, X, Music, Radio, Mic } from 'lucide-react';
import { Song, Playlist, PlaybackState, ActiveTab } from './types';
import { SONGS_DATA } from './songsData';
import HomeTab from './components/HomeTab';
import ExploreTab from './components/ExploreTab';
import LibraryTab from './components/LibraryTab';
import UpgradeTab from './components/UpgradeTab';
import BottomPlayer from './components/BottomPlayer';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Navigation & User State
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [isPremium, setIsPremium] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // YouTube Live Search State
  const [youtubeSearchResults, setYoutubeSearchResults] = useState<Song[]>([]);
  const [isSearchingYoutube, setIsSearchingYoutube] = useState(false);

  // Debounced search trigger for YouTube proxy
  useEffect(() => {
    if (!searchQuery.trim()) {
      setYoutubeSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingYoutube(true);
      try {
        const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.results && Array.isArray(data.results)) {
            setYoutubeSearchResults(data.results);
          } else if (data.isMockFallback) {
            setYoutubeSearchResults([]);
          }
        }
      } catch (err) {
        console.error("YouTube Live search proxy failed:", err);
      } finally {
        setIsSearchingYoutube(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Global Audio Library State
  const [songs, setSongs] = useState<Song[]>(SONGS_DATA);
  const [likedSongs, setLikedSongs] = useState<string[]>([]);
  const [history, setHistory] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistName, setActivePlaylistName] = useState('Daftar Lagu Pokok');

  // Core Playback State
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [queue, setQueue] = useState<Song[]>(SONGS_DATA);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState<'none' | 'all' | 'one'>('all');

  // AI DJ On-The-Air overlay State
  const [aiDjSpeech, setAiDjSpeech] = useState<string | null>(null);
  const [aiDjSpeechTyped, setAiDjSpeechTyped] = useState('');
  const [showAiDjOverlay, setShowAiDjOverlay] = useState(false);

  // Global Ambient Song Detector States
  const [showDetector, setShowDetector] = useState(false);
  const [detectorStatus, setDetectorStatus] = useState<'idle' | 'listening' | 'analyzing' | 'success' | 'error'>('idle');
  const [detectedSongResult, setDetectedSongResult] = useState<{ song: Song; confidence: number; analysis: string } | null>(null);
  const [hummingDesc, setHummingDesc] = useState('');
  const [micActive, setMicActive] = useState(false);
  const [micAmplitude, setMicAmplitude] = useState<number[]>(new Array(20).fill(4));

  // Local Device Storage Songs
  const [localSongs, setLocalSongs] = useState<Song[]>([]);

  // Audio & Mic Context References
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startListeningMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicActive(true);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAmplitude = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          // Convert standard spectrum 0-255 into visual blocks of height between 4 and 60
          const values = Array.from(dataArray).slice(0, 20).map((v) => Math.max(4, Math.floor((v / 255) * 60)));
          setMicAmplitude(values.length > 0 ? values : new Array(20).fill(4));
          animationFrameRef.current = requestAnimationFrame(updateAmplitude);
        }
      };
      updateAmplitude();
    } catch (err) {
      console.warn('Microphone access not available/granted. Emulating visual sound signature.', err);
      setMicActive(false);
      // Fallback: update smooth simulated waveforms in active listening state
      let step = 0;
      const interval = setInterval(() => {
        setMicAmplitude((prev) => {
          if (!showDetector) {
            clearInterval(interval);
            return prev;
          }
          step += 0.4;
          return Array.from({ length: 20 }, (_, i) => {
            return Math.max(4, Math.floor(Math.sin(step + i * 0.5) * 20 + 32 + Math.random() * 10));
          });
        });
      }, 100);
    }
  };

  const stopListeningMicrophone = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicActive(false);
  };

  const handleDetectSong = async () => {
    setDetectorStatus('listening');
    setDetectedSongResult(null);

    // Pause audio to prevent interference
    pauseAudio();

    // Begin microphone stream
    await startListeningMicrophone();

    // Listen for 4 seconds
    setTimeout(async () => {
      setDetectorStatus('analyzing');
      
      try {
        const response = await fetch('/api/ai/identify-song', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hummingDescription: hummingDesc,
          }),
        });
        const data = await response.json();
        
        if (data.success && data.songId) {
          const matchedSong = songs.find((s) => s.id === data.songId);
          if (matchedSong) {
            setDetectedSongResult({
              song: matchedSong,
              confidence: data.confidence,
              analysis: data.analysis,
            });
            setDetectorStatus('success');
            // Autoplay identified song after matching
            handlePlaySong(matchedSong);
          } else {
            setDetectorStatus('error');
          }
        } else {
          setDetectorStatus('error');
        }
      } catch (err) {
        console.error('Failed to recognize song:', err);
        setDetectorStatus('error');
      } finally {
        stopListeningMicrophone();
      }
    }, 4000);
  };

  // Clean up mic on unmount
  useEffect(() => {
    return () => {
      stopListeningMicrophone();
    };
  }, []);

  // HTML5 Audio Reference
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio Element once on mount
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    // Connect standard HTML5 listeners
    const onTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const onDurationChange = () => {
      setDuration(audio.duration || 0);
    };

    const onEnded = () => {
      handleEnded();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    // Load initial songs or state from localStorage if available
    const savedLikes = localStorage.getItem('ytm_liked_songs');
    if (savedLikes) setLikedSongs(JSON.parse(savedLikes));

    const savedPlaylists = localStorage.getItem('ytm_playlists');
    if (savedPlaylists) setPlaylists(JSON.parse(savedPlaylists));

    const savedPremium = localStorage.getItem('ytm_premium') || localStorage.getItem('music_app_premium_status');
    if (savedPremium) setIsPremium(savedPremium === 'true');

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // Sync volume level to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle source changes on currentSong
  useEffect(() => {
    if (audioRef.current && currentSong) {
      const isYt = currentSong.genre === 'YouTube' || currentSong.id.startsWith('yt-');

      if (isYt) {
        setDuration(currentSong.duration || 210);
        setProgress(0);
      }
    }
  }, [currentSong?.id]);

  // Removed manual timeline ticks; now handled natively by ReactPlayer in BottomPlayer.

  // Helper to start playback synchronously if possible
  const applySyncPlay = (song: Song, forcePlay: boolean) => {
    const isYt = song.genre === 'YouTube' || song.id.startsWith('yt-');
    if (!isYt && audioRef.current) {
      if (audioRef.current.src !== song.audioUrl) {
        audioRef.current.src = song.audioUrl;
        audioRef.current.load();
      }
      if (forcePlay || isPlaying) {
        audioRef.current.play().catch(e => {
          console.warn('Sync play failed:', e);
          setIsPlaying(false);
        });
      }
    } else if (isYt && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  // Core helper to start playing safely catching browser blockades
  const playAudio = async () => {
    const isYt = currentSong && (currentSong.genre === 'YouTube' || currentSong.id.startsWith('yt-'));
    if (isYt) {
      setIsPlaying(true);
      return;
    }

    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Playback interrupted or blocked by autoplay restrictions:', err);
        setIsPlaying(false);
      }
    }
  };

  const pauseAudio = () => {
    const isYt = currentSong && (currentSong.genre === 'YouTube' || currentSong.id.startsWith('yt-'));
    if (isYt) {
      setIsPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Toggle Play / Pause
  const handlePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      if (!currentSong && songs.length > 0) {
        // Set first song if none active
        setCurrentSong(songs[0]);
        setCurrentQueueIndex(0);
        applySyncPlay(songs[0], true);
      } else {
        playAudio();
      }
    }
  };

  // Skip to Next song
  const handleNext = useCallback(() => {
    if (queue.length === 0) return;
    
    let nextIndex = currentQueueIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentQueueIndex + 1;
      if (nextIndex >= queue.length) {
        nextIndex = isRepeat === 'all' ? 0 : currentQueueIndex;
        if (isRepeat === 'none' && nextIndex === 0) {
          pauseAudio();
          return;
        }
      }
    }

    setCurrentQueueIndex(nextIndex);
    const nextSong = queue[nextIndex];
    applySyncPlay(nextSong, true);
    setCurrentSong(nextSong);
    addToHistory(nextSong);
  }, [queue, currentQueueIndex, isShuffle, isRepeat]);

  // Skip to Previous song
  const handlePrev = useCallback(() => {
    if (queue.length === 0) return;

    let prevIndex = currentQueueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = isRepeat === 'all' ? queue.length - 1 : 0;
    }

    setCurrentQueueIndex(prevIndex);
    const prevSong = queue[prevIndex];
    applySyncPlay(prevSong, true);
    setCurrentSong(prevSong);
    addToHistory(prevSong);
  }, [queue, currentQueueIndex, isRepeat]);

  // Handle playback completion
  const handleEnded = () => {
    if (isRepeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        playAudio();
      }
    } else {
      handleNext();
    }
  };

  const handleSeek = (time: number) => {
    const isYt = currentSong && (currentSong.genre === 'YouTube' || currentSong.id.startsWith('yt-'));
    if (isYt) {
      setProgress(time);
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  // Triggered when selecting a song from standard rows
  const handlePlaySong = (song: Song) => {
    // Ensure the played song exists in the global pool so other lists can display it
    setSongs((prev) => {
      if (!prev.some((s) => s.id === song.id)) {
        return [song, ...prev];
      }
      return prev;
    });

    // Setup active playback queue with this song included
    setQueue((prevQueue) => {
      if (!prevQueue.some((s) => s.id === song.id)) {
        return [song, ...prevQueue];
      }
      return prevQueue;
    });

    applySyncPlay(song, true);
    setCurrentSong(song);
    setIsPlaying(true);
    addToHistory(song);
    
    const isYt = song.genre === 'YouTube' || song.id.startsWith('yt-');
    setActivePlaylistName(isYt ? 'Hasil Cari YouTube Live' : 'Daftar Lagu Pokok');
  };

  // Triggered when launching a full queue (AI playlists or Custom lists)
  const handlePlayQueue = (songsList: Song[], startIndex: number = 0, playlistName?: string) => {
    if (songsList.length === 0) return;
    setQueue(songsList);
    setCurrentQueueIndex(startIndex);
    const startSong = songsList[startIndex];
    applySyncPlay(startSong, true);
    setCurrentSong(startSong);
    setIsPlaying(true);
    addToHistory(startSong);
    setActivePlaylistName(playlistName || 'Antrean Kustom');
  };

  // Triggered when clicking items in the "Up Next" list
  const handlePlaySongFromQueue = (index: number) => {
    if (index < 0 || index >= queue.length) return;
    setCurrentQueueIndex(index);
    const queuedSong = queue[index];
    applySyncPlay(queuedSong, true);
    setCurrentSong(queuedSong);
    setIsPlaying(true);
    addToHistory(queuedSong);
  };

  // Sync queue index when currentSong changes
  useEffect(() => {
    if (currentSong && queue.length > 0) {
      const idx = queue.findIndex((s) => s.id === currentSong.id);
      if (idx !== -1 && idx !== currentQueueIndex) {
        setCurrentQueueIndex(idx);
      }
    }
  }, [currentSong?.id, queue, currentQueueIndex]);

  // Toggles for Shuffle & Repeat
  const handleToggleShuffle = () => setIsShuffle(!isShuffle);
  const handleToggleRepeat = () => {
    setIsRepeat((prev) => {
      if (prev === 'all') return 'one';
      if (prev === 'one') return 'none';
      return 'all';
    });
  };

  // Toggle Liked status and persist in localstorage
  const handleToggleLike = (songId: string) => {
    setLikedSongs((prev) => {
      const isLiked = prev.includes(songId);
      const updated = isLiked ? prev.filter((id) => id !== songId) : [...prev, songId];
      localStorage.setItem('ytm_liked_songs', JSON.stringify(updated));
      return updated;
    });
  };

  // Add played tracks to history row dynamically
  const addToHistory = (song: Song) => {
    setHistory((prev) => {
      // Exclude duplicate adjacent histories
      const filtered = prev.filter((s) => s.id !== song.id);
      return [song, ...filtered].slice(0, 20); // Hold maximum 20 histories
    });
  };

  // Save new Playlists
  const handleSavePlaylist = (newPl: Playlist) => {
    setPlaylists((prev) => {
      const updated = [newPl, ...prev];
      localStorage.setItem('ytm_playlists', JSON.stringify(updated));
      return updated;
    });
  };

  // Delete saved Playlists
  const handleDeletePlaylist = (id: string) => {
    setPlaylists((prev) => {
      const updated = prev.filter((pl) => pl.id !== id);
      localStorage.setItem('ytm_playlists', JSON.stringify(updated));
      return updated;
    });
  };

  // Add imported local songs
  const handleAddLocalSongs = (newSongs: Song[]) => {
    setSongs((prev) => {
      const filtered = prev.filter((s) => !newSongs.some((ns) => ns.id === s.id));
      return [...filtered, ...newSongs];
    });
    setLocalSongs((prev) => {
      const filtered = prev.filter((s) => !newSongs.some((ns) => ns.id === s.id));
      return [...filtered, ...newSongs];
    });
  };

  // Delete/Remove imported local song
  const handleDeleteLocalSong = (songId: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== songId));
    setLocalSongs((prev) => prev.filter((s) => s.id !== songId));
    setLikedSongs((prev) => prev.filter((id) => id !== songId));
    setHistory((prev) => prev.filter((s) => s.id !== songId));
  };

  // Save Premium status
  const handleUpgrade = (status: boolean) => {
    setIsPremium(status);
    localStorage.setItem('ytm_premium', String(status));
    localStorage.setItem('music_app_premium_status', String(status));
  };

  // Start AI DJ Radio Show (Gemini integration)
  const handleStartAIDJ = async (mood: string) => {
    // Pick recommended next song based on mood/genre or random
    let matchingSongs = songs;
    if (mood !== 'personalized') {
      matchingSongs = songs.filter(
        (s) => s.mood.toLowerCase() === mood.toLowerCase() || s.genre.toLowerCase().includes(mood.toLowerCase())
      );
    }
    if (matchingSongs.length === 0) matchingSongs = songs;
    
    // Pick a song to transition into
    const nextRecommended = matchingSongs[Math.floor(Math.random() * matchingSongs.length)];

    // Fetch radio DJ intro scripts from the backend
    try {
      const response = await fetch('/api/ai/dj-radio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSong: nextRecommended,
          historyTitles: history.slice(0, 3).map((s) => s.title),
          mood: mood,
        }),
      });
      const data = await response.json();
      
      // Setup speech and activate the animated Radio Overlay
      setAiDjSpeech(data.speech);
      setAiDjSpeechTyped('');
      setShowAiDjOverlay(true);
      pauseAudio();

      // Trigger typewriter effect for the intro script
      let currentLength = 0;
      const fullSpeech = data.speech;
      const speechInterval = setInterval(() => {
        if (currentLength <= fullSpeech.length) {
          setAiDjSpeechTyped(fullSpeech.slice(0, currentLength));
          currentLength += 2;
        } else {
          clearInterval(speechInterval);
          // Auto transition and play after DJ finishes
          setTimeout(() => {
            setShowAiDjOverlay(false);
            setAiDjSpeech(null);
            handlePlaySong(nextRecommended);
            setActivePlaylistName('AI DJ Radio Show');
          }, 4000);
        }
      }, 35);
    } catch (err) {
      console.error('Failed to launch AI DJ Radio show:', err);
    }
  };

  // Filter songs by search query if showSearch is true
  const filteredSearchSongs = songs.filter((s) => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="yt-music-app-shell" className="h-screen bg-[#030303] text-zinc-100 flex flex-col font-sans select-none overflow-hidden">
      
      {/* MAIN FLEX WRAPPER */}
      <div className="flex flex-1 overflow-hidden pb-[120px] md:pb-[90px]">
        
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex flex-col w-[240px] flex-shrink-0 border-r border-zinc-900/60 bg-[#030303] z-20">
          {/* Logo */}
          <div className="px-6 py-5 flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('home'); setShowSearch(false); }}>
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white shadow shadow-red-950">
              <Play className="w-4 h-4 fill-white text-white translate-x-[0.5px]" />
            </div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-1">
              <span>YouTube</span>
              <span className="text-zinc-400 font-normal">Musik</span>
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1 px-3 mt-2">
            {[
              { id: 'home', label: 'Beranda', icon: <Home className="w-5 h-5" /> },
              { id: 'explore', label: 'Jelajahi', icon: <Compass className="w-5 h-5" /> },
              { id: 'library', label: 'Koleksi', icon: <FolderHeart className="w-5 h-5" /> },
              { id: 'upgrade', label: 'Upgrade', icon: <Sparkles className="w-5 h-5" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition text-sm ${
                  activeTab === tab.id ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 font-medium'
                }`}
              >
                {tab.icon}
                <span className="tracking-wide">{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#030303]">
          
          {/* APP TOP NAVIGATION BAR */}
          <header id="app-header-nav" className="sticky top-0 z-30 bg-[#030303]/95 backdrop-blur-md px-4 py-3 md:px-8 md:py-4 border-b border-zinc-900/60 flex items-center justify-between md:justify-end">
            {/* Mobile Logo (hidden on desktop) */}
            <div className="md:hidden flex items-center gap-2" onClick={() => { setActiveTab('home'); setShowSearch(false); }}>
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white shadow shadow-red-950">
                <Play className="w-4 h-4 fill-white text-white translate-x-[0.5px]" />
              </div>
              <h1 className="text-base font-black tracking-tight flex items-center gap-1">
                <span>YouTube</span>
                <span className="text-zinc-400 font-normal">Musik</span>
              </h1>
            </div>

            {/* Header Options / Search */}
            <div className="flex items-center gap-3">
          {showSearch ? (
            <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
              <input
                id="search-input"
                type="text"
                placeholder="Cari lagu, artis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-xs outline-none text-white placeholder-zinc-500 w-32 sm:w-48"
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setShowDetector(true);
                  handleDetectSong();
                }}
                className="p-2 bg-red-950/25 hover:bg-red-900/40 rounded-full border border-red-900/40 text-red-500 hover:text-red-400 flex items-center gap-1 cursor-pointer transition text-xs font-bold px-3 shadow-sm shadow-red-950/40"
                title="Deteksi Lagu di Perangkat Global"
                id="btn-detect-song"
              >
                <Mic className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden xs:inline text-[10px]">Deteksi Lagu</span>
              </button>

              <button
                onClick={() => setShowSearch(true)}
                className="p-2 bg-zinc-900/60 hover:bg-zinc-800 rounded-full border border-zinc-800 transition text-zinc-300 hover:text-white"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}

          <div
            onClick={() => setActiveTab('upgrade')}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center font-black text-xs text-white shadow shadow-red-900/25 cursor-pointer border border-zinc-800"
          >
            ★
          </div>
        </div>
      </header>

      {/* SEARCH LISTINGS VIEW OVERLAY */}
      {showSearch && searchQuery.trim().length > 0 && (
        <div id="search-listings-overlay" className="px-4 py-4 bg-[#090909]/95 backdrop-blur-md border-b border-zinc-900 absolute top-14 left-0 right-0 z-30 max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl">
          
          {/* Section 1: Local / Memory / App Songs */}
          <div>
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider block mb-2 pl-1">Lagu Offline & Pokok ({filteredSearchSongs.length})</span>
            {filteredSearchSongs.length === 0 ? (
              <div className="py-2 pl-1 text-zinc-600 text-[11px]">Tidak ada lagu pokok yang cocok.</div>
            ) : (
              <div className="space-y-1.5">
                {filteredSearchSongs.map((song) => (
                  <div
                    key={song.id}
                    onClick={() => {
                      handlePlaySong(song);
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-850/40 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={song.coverUrl} alt={song.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      <div className="text-left min-w-0">
                        <h4 className="text-xs font-bold text-zinc-200 truncate">{song.title}</h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{song.artist} • <span className="text-zinc-500 font-mono">{song.genre}</span></p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-widest mr-1">
                      HP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Live YouTube Streaming Search API */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-red-500 font-black uppercase tracking-wider block pl-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-650 animate-pulse inline-block" />
                Hasil Live YouTube (Streaming)
              </span>
              {isSearchingYoutube && (
                <span className="text-[9px] text-zinc-500 font-mono animate-pulse">Menghubungkan API...</span>
              )}
            </div>

            {isSearchingYoutube ? (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/20 animate-pulse">
                    <div className="w-10 h-10 bg-zinc-800 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="w-3/4 h-3 bg-zinc-800 rounded" />
                      <div className="w-1/2 h-2.5 bg-zinc-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : youtubeSearchResults.length === 0 ? (
              <div className="py-6 text-center text-zinc-650 text-xs border border-dashed border-zinc-900 rounded-xl">
                {searchQuery.trim().length > 1 ? "Tidak ada hasil pencarian video YouTube. Coba kata kunci lainnya." : "Tulis kata kunci untuk menjelajah video musik YouTube."}
              </div>
            ) : (
              <div className="space-y-1.5">
                {youtubeSearchResults.map((song) => (
                  <div
                    key={song.id}
                    onClick={() => {
                      handlePlaySong(song);
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                    className="flex items-center justify-between p-2 rounded-xl bg-red-950/5 hover:bg-red-950/15 border border-red-950/20 hover:border-red-900/35 cursor-pointer transition-all shadow-sm animate-fade-in"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img src={song.coverUrl} alt={song.title} className="w-10 h-10 rounded-lg object-cover" />
                        <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition rounded-lg" />
                      </div>
                      <div className="text-left min-w-0">
                        <h4 className="text-xs font-bold text-zinc-100 truncate">{song.title}</h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5 truncate max-w-[200px] sm:max-w-xs">{song.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pr-1">
                      <span className="text-[8px] font-black tracking-widest bg-red-600/15 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded">
                        YOUTUBE
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* CORE VIEWPORT */}
      <div id="app-viewport" className="flex-1 overflow-y-auto relative w-full scroll-smooth">
        <div className="px-4 sm:px-6 py-4 md:py-8 max-w-5xl mx-auto w-full pb-32">
          {activeTab === 'home' && (
            <HomeTab
              songs={songs}
              history={history}
              likedSongs={likedSongs}
              currentSong={currentSong}
              onPlaySong={handlePlaySong}
              onPlayQueue={handlePlayQueue}
              onToggleLike={handleToggleLike}
              onStartAIDJ={handleStartAIDJ}
              isPremium={isPremium}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'explore' && (
            <ExploreTab
              songs={songs}
              onPlayQueue={handlePlayQueue}
              onSavePlaylist={handleSavePlaylist}
            />
          )}

          {activeTab === 'library' && (
            <LibraryTab
              songs={songs}
              playlists={playlists}
              likedSongs={likedSongs}
              history={history}
              localSongs={localSongs}
              onPlaySong={handlePlaySong}
              onPlayQueue={handlePlayQueue}
              onToggleLike={handleToggleLike}
              onDeletePlaylist={handleDeletePlaylist}
              onAddLocalSongs={handleAddLocalSongs}
              onDeleteLocalSong={handleDeleteLocalSong}
            />
          )}

          {activeTab === 'upgrade' && (
            <UpgradeTab
              isPremium={isPremium}
              onUpgrade={handleUpgrade}
            />
          )}
        </div>
      </div>
      </main> {/* End of Desktop Main Content Area */}
      </div> {/* End of Desktop Flex Wrapper */}

      {/* PERSISTENT BOTTOM AUDIO COMPONENT */}
      <BottomPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        volume={volume}
        isShuffle={isShuffle}
        isRepeat={isRepeat}
        queue={queue}
        currentQueueIndex={currentQueueIndex}
        likedSongs={likedSongs}
        isPremium={isPremium}
        activePlaylistName={activePlaylistName}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrev={handlePrev}
        onSeek={handleSeek}
        onVolumeChange={setVolume}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={handleToggleLike}
        onPlaySongFromQueue={handlePlaySongFromQueue}
        onYtProgress={(seconds) => setProgress(seconds)}
        onYtDuration={(dur) => setDuration(dur)}
        onYtEnded={handleEnded}
      />

      {/* PERSISTENT TAB BAR FOOTER (MOBILE ONLY) */}
      <footer id="app-footer-nav" className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#030303]/95 backdrop-blur-md border-t border-zinc-900/80 px-2 flex items-center justify-around z-30 pb-safe">
        {[
          { id: 'home', label: 'Beranda', icon: <Home className="w-5 h-5" /> },
          { id: 'explore', label: 'Jelajahi', icon: <Compass className="w-5 h-5" /> },
          { id: 'library', label: 'Koleksi', icon: <FolderHeart className="w-5 h-5" /> },
          { id: 'upgrade', label: 'Upgrade', icon: <Sparkles className="w-5 h-5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-btn-${tab.id}`}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 cursor-pointer transition ${
              activeTab === tab.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.icon}
            <span className="text-[9px] font-bold tracking-wider">{tab.label}</span>
          </button>
        ))}
      </footer>

      {/* AI DJ RADIO SHOW AUDIO-VISUAL OVERLAY SCREEN */}
      <AnimatePresence>
        {showAiDjOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            id="ai-dj-radio-show-overlay"
            className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 space-y-8"
          >
            {/* Spinning Neon Sonic Waveform / Visualizer */}
            <div className="relative flex items-center justify-center w-40 h-40">
              <div className="absolute w-36 h-36 bg-red-600/10 rounded-full animate-ping pointer-events-none" />
              <div className="absolute w-28 h-28 bg-purple-600/15 rounded-full animate-pulse pointer-events-none" />
              <div className="w-20 h-20 bg-gradient-to-tr from-red-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl border border-red-500/20 z-10">
                <Radio className="w-8 h-8 text-white animate-bounce" />
              </div>

              {/* Graphic active spectrum waves */}
              <div className="absolute bottom-0 flex gap-1 h-6 items-end">
                {[2, 5, 4, 1, 6, 3, 5, 2, 4, 6].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-red-600 rounded-full animate-pulse"
                    style={{
                      height: `${h * 4}px`,
                      animationDelay: `${i * 100}ms`
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="text-center space-y-2 max-w-md">
              <div className="flex items-center justify-center gap-2">
                <span className="px-2 py-0.5 bg-red-600 text-[9px] font-black tracking-widest text-white rounded uppercase">
                  AI DJ On Air
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">BROADCASTING LIVE</span>
              </div>
              <h3 className="text-lg font-black text-white">YTM Radio Assistant</h3>
              
              {/* Typewritten DJ Speech Block */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 min-h-[90px] flex items-center justify-center">
                <p className="text-xs text-red-100 font-mono leading-relaxed italic text-center max-w-sm">
                  "{aiDjSpeechTyped || 'DJ sedang mencocokkan musik...'}"
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowAiDjOverlay(false);
                setAiDjSpeech(null);
                // Unmute or start play manually if skipped
                if (queue.length > 0) {
                  playAudio();
                }
              }}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full text-xs font-bold border border-zinc-700 transition"
            >
              Lewati Intro (Skip DJ)
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* GLOBAL AMBIENT AI SONG DETECTOR OVERLAY */}
      <AnimatePresence>
        {showDetector && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            id="ai-song-detector-overlay"
            className="fixed inset-0 bg-black/98 z-50 flex flex-col items-center justify-center p-6 space-y-6 overflow-y-auto"
          >
            {/* Header section of Detector */}
            <div className="w-full max-w-md flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-red-500">
                <Mic className="w-5 h-5 animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-wider">AI Song Detector</h3>
              </div>
              <button
                onClick={() => {
                  stopListeningMicrophone();
                  setShowDetector(false);
                }}
                className="p-1.5 hover:bg-zinc-950 rounded-full text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main scanner core visualizer */}
            <div className="w-full max-w-md flex flex-col items-center justify-center space-y-8 py-4 text-center">
              {/* Spinning / Pulsing state circle */}
              <div className="relative flex items-center justify-center w-48 h-48">
                {detectorStatus === 'listening' && (
                  <>
                    <div className="absolute w-44 h-44 bg-red-600/10 rounded-full animate-ping pointer-events-none" />
                    <div className="absolute w-36 h-36 bg-red-500/15 rounded-full animate-pulse pointer-events-none" />
                  </>
                )}
                {detectorStatus === 'analyzing' && (
                  <div className="absolute w-40 h-40 border-4 border-dashed border-red-600 rounded-full animate-spin-slow" />
                )}

                {/* Cover view or big dynamic pulse mic */}
                <div className="w-28 h-28 bg-gradient-to-tr from-zinc-900 to-black rounded-full flex flex-col items-center justify-center shadow-2xl border border-zinc-800 z-10 overflow-hidden">
                  {detectorStatus === 'success' && detectedSongResult ? (
                    <img
                      src={detectedSongResult.song.coverUrl}
                      alt={detectedSongResult.song.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Mic className={`w-10 h-10 ${detectorStatus === 'listening' ? 'text-red-500 animate-bounce' : 'text-zinc-500'}`} />
                  )}
                </div>

                {/* Spectrum Analyzer Graph (Standard HTML5 Microphone Input Bars) */}
                {(detectorStatus === 'listening' || detectorStatus === 'analyzing') && (
                  <div className="absolute inset-x-0 bottom-0 flex justify-center items-end gap-1.5 h-12">
                    {micAmplitude.map((val, idx) => (
                      <span
                        key={idx}
                        className="w-1 rounded-t-sm bg-red-600 transition-all duration-75"
                        style={{
                          height: `${val}px`,
                          opacity: 0.3 + (val / 60) * 0.7,
                          animationDelay: `${idx * 40}ms`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Information description blocks */}
              <div className="space-y-3 px-2">
                {detectorStatus === 'listening' && (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span className="text-xs font-bold text-red-400 tracking-wider uppercase">MENDENGARKAN AUDIO SEKITAR</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
                      Mainkan lagu dari perangkat lain, dekatkan speaker ke mikrofon, atau bersenandunglah (humming) sekarang!
                    </p>
                  </>
                )}

                {detectorStatus === 'analyzing' && (
                  <>
                    <span className="text-xs font-bold text-amber-500 tracking-wider uppercase animate-pulse">MEMPROSES SIDIK JARI AKUSTIK...</span>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
                      Mengekstrak frekuensi amplitudo dan menganalisis polanya menggunakan Gemini AI untuk mencocokkan lagu terdaftar...
                    </p>
                  </>
                )}

                {detectorStatus === 'success' && detectedSongResult && (
                  <div className="space-y-4">
                    <div>
                      <span className="px-2 py-0.5 bg-green-600/20 text-green-400 border border-green-500/20 text-[10px] font-black rounded uppercase tracking-widest inline-block">
                        Cocok Terdeteksi ({detectedSongResult.confidence}% Akurasi)
                      </span>
                      <h4 className="text-lg font-black text-white mt-2 leading-tight">
                        {detectedSongResult.song.title}
                      </h4>
                      <p className="text-xs text-zinc-400 font-medium mt-0.5">
                        {detectedSongResult.song.artist} • {detectedSongResult.song.genre}
                      </p>
                    </div>

                    <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 text-left">
                      <p className="text-[11px] text-zinc-300 leading-relaxed italic font-mono">
                        "{detectedSongResult.analysis}"
                      </p>
                    </div>

                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          setShowDetector(false);
                        }}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-black shadow shadow-red-950 transition cursor-pointer"
                      >
                        Tutup & Dengarkan
                      </button>
                      <button
                        onClick={() => {
                          handleDetectSong();
                        }}
                        className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-full text-xs font-bold border border-zinc-800 transition cursor-pointer"
                      >
                        Pindai Ulang
                      </button>
                    </div>
                  </div>
                )}

                {detectorStatus === 'error' && (
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-red-500 tracking-wider uppercase">GAGAL MENCOCOKKAN</span>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
                      Maaf, kami tidak dapat mengenali lagu tersebut. Coba bernyanyi lebih dekat atau gunakan bantuan asisten humming di bawah.
                    </p>
                    <button
                      onClick={handleDetectSong}
                      className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full text-xs font-bold border border-zinc-800 transition cursor-pointer"
                    >
                      Coba Lagi
                    </button>
                  </div>
                )}
              </div>

              {/* Optional Humming Assistant section */}
              {detectorStatus === 'listening' && (
                <div className="w-full pt-4 border-t border-zinc-900 flex flex-col gap-2">
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
                      Bantuan Humming (Humming / Lyrics Clues)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: lofi tenang, rock cepat penuh gitar, atau bersenandung dsb..."
                      value={hummingDesc}
                      onChange={(e) => setHummingDesc(e.target.value)}
                      className="w-full mt-1.5 px-3.5 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-white outline-none focus:border-red-600/40 transition placeholder-zinc-600"
                    />
                  </div>
                  <span className="text-[9px] text-zinc-600 italic text-left">
                    *Tulis kata kunci untuk membantu model AI mengenali kecocokan getaran lagu yang lebih presisi.
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
