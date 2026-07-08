import React, { useState, useRef } from 'react';
import { Play, Heart, Trash2, Clock, Sparkles, FolderHeart, Music, Upload, FolderOpen, Loader2, Globe } from 'lucide-react';
import { Song, Playlist } from '../types';

interface LibraryTabProps {
  songs: Song[];
  playlists: Playlist[];
  likedSongs: string[];
  history: Song[];
  localSongs: Song[];
  onPlaySong: (song: Song) => void;
  onPlayQueue: (songs: Song[], startIndex: number, playlistName?: string) => void;
  onToggleLike: (songId: string) => void;
  onDeletePlaylist: (id: string) => void;
  onAddLocalSongs: (songs: Song[]) => void;
  onDeleteLocalSong: (songId: string) => void;
}

type SubTab = 'playlists' | 'liked' | 'history' | 'local';

export default function LibraryTab({
  songs,
  playlists,
  likedSongs,
  history,
  localSongs = [],
  onPlaySong,
  onPlayQueue,
  onToggleLike,
  onDeletePlaylist,
  onAddLocalSongs,
  onDeleteLocalSong,
}: LibraryTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('playlists');
  const [isDragging, setIsDragging] = useState(false);
  const [isSearchingCovers, setIsSearchingCovers] = useState(false);
  const [currentScanningName, setCurrentScanningName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const likedTracks = songs.filter((s) => likedSongs.includes(s.id));

  // Curated list of gorgeous music/audio-themed cover designs from Unsplash
  const COVER_PRESETS = [
    'https://images.unsplash.com/photo-1487180142328-054b783fc471?w=400&q=80', // Vinyl spinning closeup
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', // Stage spotlights
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80', // Sound control board
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80', // Gold vintage microphone
    'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&q=80', // Sound waves abstract art
    'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&q=80', // Retro cassettes neon
    'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80', // Vintage mic & stage lights
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80', // Music festival crowd
    'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80', // Golden radio knobs
    'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80'  // Neon digital track artwork
  ];

  // Handle local file uploads
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await processFiles(files);
  };

  const processFiles = async (files: FileList) => {
    const newSongs: Song[] = [];
    setIsSearchingCovers(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Only process audio files
      if (!file.type.startsWith('audio/')) continue;

      const objectUrl = URL.createObjectURL(file);
      const cleanTitle = file.name.replace(/\.[^/.]+$/, ""); // strip extension
      setCurrentScanningName(cleanTitle);

      // Pick a unique beautiful cover based on the title's hash so it is consistent & diversified
      const titleHash = Math.abs(cleanTitle.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
      let coverUrl = COVER_PRESETS[titleHash % COVER_PRESETS.length];
      let artist = 'Berkas Lokal HP';
      let album = 'Memori Perangkat';

      // Dynamically search real metadata & high quality album cover from the internet automatically!
      try {
        const response = await fetch(`/api/music/cover-search?q=${encodeURIComponent(cleanTitle)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            if (data.coverUrl) coverUrl = data.coverUrl;
            if (data.artist) artist = data.artist;
            if (data.album) album = data.album;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch internet cover art for", cleanTitle, err);
      }

      // Create a pristine Song object
      const newSong: Song = {
        id: `local-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 9)}`,
        title: cleanTitle,
        artist: artist,
        album: album,
        coverUrl: coverUrl,
        audioUrl: objectUrl,
        duration: 180, // Default duration fallback in seconds
        lyrics: `[Memutar Lagu Lokal]\nJudul: ${cleanTitle}\nArtis: ${artist}\nAlbum: ${album}\nSumber: Memori HP Anda (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
        genre: 'Lokal',
        mood: 'Santai',
        color: 'rgba(239, 68, 68, 0.4)', // Warm red ambient glow
      };

      // Try to extract actual metadata duration using Audio element
      try {
        const tempAudio = new Audio(objectUrl);
        await new Promise<void>((resolve) => {
          tempAudio.addEventListener('loadedmetadata', () => {
            newSong.duration = Math.round(tempAudio.duration) || 180;
            resolve();
          });
          // Timeout after 1.5 seconds if cannot load metadata
          setTimeout(resolve, 1500);
        });
      } catch (err) {
        console.warn('Could not read duration metadata, using default', err);
      }

      newSongs.push(newSong);
    }

    setIsSearchingCovers(false);
    setCurrentScanningName('');

    if (newSongs.length > 0) {
      onAddLocalSongs(newSongs);
      setActiveSubTab('local');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files) {
      await processFiles(files);
    }
  };

  return (
    <div id="library-tab-container" className="space-y-6 pb-32 pt-2 text-left">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <FolderHeart className="w-6 h-6 text-red-600" /> Koleksi Anda
        </h1>
        <p className="text-xs text-zinc-400 mt-1">Kelola musik favorit, riwayat putar, dan playlist kustom AI</p>
      </div>

      {/* Sub-Tabs Selector */}
      <div id="library-sub-tabs" className="flex border-b border-zinc-800 pb-1 overflow-x-auto scrollbar-none gap-2">
        {[
          { id: 'playlists', label: 'Daftar Putar', count: playlists.length },
          { id: 'liked', label: 'Disukai', count: likedTracks.length },
          { id: 'history', label: 'Riwayat', count: history.length },
          { id: 'local', label: 'Lagu HP / Memori', count: localSongs.length },
        ].map((sub) => (
          <button
            key={sub.id}
            id={`library-sub-tab-${sub.id}`}
            onClick={() => setActiveSubTab(sub.id as SubTab)}
            className={`px-3 py-2 text-xs font-bold transition-all border-b-2 -mb-[6px] cursor-pointer whitespace-nowrap ${
              activeSubTab === sub.id
                ? 'border-red-600 text-white font-black'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {sub.label} <span className="text-[9px] font-mono opacity-60 ml-0.5">({sub.count})</span>
          </button>
        ))}
      </div>

      {/* SUB TAB CONTENT: PLAYLISTS */}
      {activeSubTab === 'playlists' && (
        <div id="library-playlists" className="space-y-4">
          {playlists.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Belum ada playlist tersimpan. Buka tab <strong>Jelajahi</strong> untuk membuat playlist kustom dengan AI!
            </div>
          ) : (
            <div id="playlists-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  id={`playlist-item-${pl.id}`}
                  className="group flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/40 border border-zinc-800/30 transition-all duration-300"
                >
                  <div
                    onClick={() => onPlayQueue(pl.songs, 0, pl.name)}
                    className="flex items-center gap-4 cursor-pointer flex-1 min-w-0"
                  >
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                      <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    </div>

                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-zinc-100 group-hover:text-red-400 transition truncate">
                          {pl.name}
                        </h3>
                        {pl.isAICreated && (
                          <span className="px-1.5 py-0.5 bg-red-600/10 text-[8px] font-extrabold text-red-500 rounded flex items-center gap-0.5 font-sans">
                            <Sparkles className="w-2.5 h-2.5" /> AI
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed line-clamp-1">{pl.description}</p>
                      <p className="text-[9px] text-zinc-500 mt-1 font-mono">{pl.songs.length} lagu • Dibuat {pl.createdAt}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeletePlaylist(pl.id)}
                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-800/60 rounded-full transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB TAB CONTENT: LIKED SONGS */}
      {activeSubTab === 'liked' && (
        <div id="library-liked-songs" className="space-y-3">
          {likedTracks.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Belum ada lagu disukai. Suka lagu pilihanmu untuk menambahkannya di sini!
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Koleksi Favorit</span>
                <button
                  onClick={() => onPlayQueue(likedTracks, 0, 'Lagu Disukai')}
                  className="px-3 py-1 bg-red-600/15 border border-red-500/20 text-red-500 rounded-full text-xs font-bold hover:bg-red-600 hover:text-white transition cursor-pointer"
                >
                  Putar Semua Favorit
                </button>
              </div>

              {likedTracks.map((song) => (
                <div
                  key={song.id}
                  id={`liked-track-${song.id}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/20 hover:bg-zinc-800/40 border border-zinc-800/20 transition group"
                >
                  <div
                    onClick={() => onPlaySong(song)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow">
                      <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 text-left">
                      <h4 className="text-xs font-bold text-zinc-100 group-hover:text-red-400 transition truncate">
                        {song.title}
                      </h4>
                      <p className="text-[9px] text-zinc-400 truncate mt-0.5">{song.artist} • {song.genre}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleLike(song.id)}
                      className="text-red-500 p-1.5 hover:bg-zinc-800 rounded-full transition"
                    >
                      <Heart className="w-4 h-4 fill-red-500" />
                    </button>
                    <span className="text-[10px] text-zinc-500 font-mono pr-2">
                      {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB TAB CONTENT: HISTORY */}
      {activeSubTab === 'history' && (
        <div id="library-history" className="space-y-3">
          {history.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Belum ada riwayat putar. Musik yang Anda putar akan terekam secara otomatis di sini!
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" /> Terakhir Diputar
                </span>
                <button
                  onClick={() => onPlayQueue(history, 0, 'Riwayat Putar')}
                  className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs font-bold hover:bg-zinc-700 transition cursor-pointer"
                >
                  Putar Ulang Semua
                </button>
              </div>

              {history.map((song, idx) => (
                <div
                  key={`${song.id}-${idx}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/20 hover:bg-zinc-800/40 border border-zinc-800/10 transition group"
                >
                  <div
                    onClick={() => onPlaySong(song)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow">
                      <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 text-left">
                      <h4 className="text-xs font-bold text-zinc-100 group-hover:text-red-400 transition truncate">
                        {song.title}
                      </h4>
                      <p className="text-[9px] text-zinc-400 truncate mt-0.5">{song.artist}</p>
                    </div>
                  </div>

                  <span className="text-[10px] text-zinc-500 font-mono pr-2">
                    {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB TAB CONTENT: LOCAL MUSIC FILES FROM STORAGE */}
      {activeSubTab === 'local' && (
        <div id="library-local-songs" className="space-y-5">
          {/* File Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center gap-3 cursor-pointer ${
              isDragging
                ? 'border-red-500 bg-red-950/10'
                : 'border-zinc-800 bg-zinc-900/10 hover:bg-zinc-900/30 hover:border-zinc-700'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              multiple
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center text-red-500">
              <Upload className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-black text-white">Ketuk untuk Memilih Berkas Lagu dari HP / Memori</p>
              <p className="text-[10px] text-zinc-500 mt-1">Mendukung file .mp3, .wav, .m4a, dll. Bisa pilih banyak sekaligus.</p>
            </div>
            <button className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-[10px] font-black shadow transition">
              Cari Berkas Musik
            </button>
          </div>

          {/* Animated Internet Cover Lookup Status Card */}
          {isSearchingCovers && (
            <div className="flex items-center gap-3 p-4 bg-zinc-900/60 border border-red-500/25 rounded-xl text-xs animate-pulse">
              <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
              <div className="flex-1 text-left">
                <p className="font-bold text-zinc-150 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-red-500" />
                  Mengunduh Foto Album & Info Otomatis dari Internet...
                </p>
                <p className="text-[9px] text-zinc-500 truncate mt-0.5">
                  Mencari katalog musik untuk: <span className="text-zinc-300 font-mono italic">{currentScanningName}</span>
                </p>
              </div>
            </div>
          )}

          {/* Local songs list */}
          {localSongs.length === 0 ? (
            <div className="py-6 text-center text-zinc-500 text-xs">
              Belum ada lagu lokal yang dimuat dari perangkat HP Anda. Gunakan pemilih file di atas untuk memulai!
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <div className="text-left">
                  <span className="text-[10px] text-green-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" /> Terhubung Lokal
                  </span>
                  <p className="text-[9px] text-zinc-500">Audio diputar langsung secara offline secara aman dari memori HP</p>
                </div>
                <button
                  onClick={() => onPlayQueue(localSongs, 0, 'Lagu Lokal')}
                  className="px-3 py-1 bg-red-600/20 border border-red-500/35 text-red-400 rounded-full text-xs font-bold hover:bg-red-600 hover:text-white transition cursor-pointer"
                >
                  Putar Semua Lagu HP
                </button>
              </div>

              {localSongs.map((song) => (
                <div
                  key={song.id}
                  id={`local-track-${song.id}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/20 hover:bg-zinc-800/40 border border-zinc-800/10 transition group"
                >
                  <div
                    onClick={() => onPlaySong(song)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900 border border-zinc-800 shadow flex items-center justify-center group/cover">
                      {song.coverUrl ? (
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          className="w-full h-full object-cover group-hover/cover:scale-110 transition duration-300"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&q=80';
                          }}
                        />
                      ) : (
                        <Music className="w-4 h-4 text-red-500" />
                      )}
                      
                      {/* Interactive play action visual indicator */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center">
                        <Play className="w-3.5 h-3.5 fill-white text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 text-left">
                      <h4 className="text-xs font-bold text-zinc-100 group-hover:text-red-400 transition truncate">
                        {song.title}
                      </h4>
                      <p className="text-[9px] text-zinc-400 truncate mt-0.5">
                        {song.artist || 'Berkas Lokal HP'} • {song.album || 'Memori Perangkat'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleLike(song.id)}
                      className="p-1.5 hover:bg-zinc-800 rounded-full transition"
                    >
                      <Heart className={`w-4 h-4 ${likedSongs.includes(song.id) ? 'fill-red-500 text-red-500' : 'text-zinc-500'}`} />
                    </button>
                    <button
                      onClick={() => onDeleteLocalSong(song.id)}
                      className="p-1.5 hover:bg-zinc-850 hover:text-red-500 rounded-full text-zinc-500 transition"
                      title="Hapus dari daftar lokal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-zinc-500 font-mono pr-2">
                      {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
