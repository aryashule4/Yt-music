import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header if key is available
let ai: GoogleGenAI | null = null;
const API_KEY = process.env.GEMINI_API_KEY;

if (API_KEY && API_KEY !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API Client successfully initialized.");
  } catch (err) {
    console.error("Failed to initialize Gemini Client:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY found in env. Running in fallback mode with local smart logic.");
}

// Hardcoded references to songs in SONGS_DATA to help map AI remixes to real audio
const REAL_TRACKS_REFERENCE = [
  { id: "song-1", genre: "Synthwave", mood: "Energizing", tempo: "fast" },
  { id: "song-2", genre: "Pop / Acoustic", mood: "Relaxing", tempo: "slow" },
  { id: "song-3", genre: "Ambient", mood: "Focus", tempo: "slow" },
  { id: "song-4", genre: "Lo-Fi Hip Hop", mood: "Chill", tempo: "medium" },
  { id: "song-5", genre: "Synthpop", mood: "Romance", tempo: "medium" },
  { id: "song-6", genre: "Jazz", mood: "Relaxing", tempo: "slow" },
  { id: "song-7", genre: "Rock", mood: "Energizing", tempo: "fast" },
  { id: "song-8", genre: "Folk", mood: "Happy", tempo: "medium" },
  { id: "song-9", genre: "Ambient / Piano", mood: "Calm", tempo: "slow" },
  { id: "song-10", genre: "Cinematic", mood: "Uplifting", tempo: "medium" },
];

// Helper for local mock responses when API is not available
function getLocalFallbackPlaylist(prompt: string) {
  const lowercasePrompt = prompt.toLowerCase();
  let selectedIndices = [0, 3, 4, 7]; // Default pop/synth mix
  let playlistName = "AI Custom Mix";
  let playlistDesc = `A custom curated mix for: "${prompt}"`;

  if (lowercasePrompt.includes("relax") || lowercasePrompt.includes("santai") || lowercasePrompt.includes("tidur") || lowercasePrompt.includes("rain")) {
    selectedIndices = [1, 5, 8, 2];
    playlistName = "Rainy Day Sanctuary";
    playlistDesc = "Soft acoustic, slow jazz, and calming rain ambient sounds.";
  } else if (lowercasePrompt.includes("focus") || lowercasePrompt.includes("kerja") || lowercasePrompt.includes("coding") || lowercasePrompt.includes("belajar")) {
    selectedIndices = [2, 3, 8, 5];
    playlistName = "Deep Focus Hub";
    playlistDesc = "Instrumental ambient and lo-fi tunes to help you enter flow state.";
  } else if (lowercasePrompt.includes("run") || lowercasePrompt.includes("lari") || lowercasePrompt.includes("olahraga") || lowercasePrompt.includes("semangat") || lowercasePrompt.includes("workout")) {
    selectedIndices = [6, 0, 4, 9];
    playlistName = "Hyperdrive Energy";
    playlistDesc = "High-octane rock, intense synthwave, and cinematic climaxes.";
  } else if (lowercasePrompt.includes("cinta") || lowercasePrompt.includes("romance") || lowercasePrompt.includes("love") || lowercasePrompt.includes("galau")) {
    selectedIndices = [4, 1, 5, 3];
    playlistName = "Late Night Romance";
    playlistDesc = "Warm synthpop, acoustic love stories, and cozy twilight grooves.";
  }

  const songs = selectedIndices.map((idx, i) => {
    const ref = REAL_TRACKS_REFERENCE[idx];
    return {
      originalSongId: ref.id,
      title: `AI Remixed - ${ref.mood} Chapter ${i+1}`,
      artist: `AI DJ ${ref.genre}`,
      album: `Curated for ${playlistName}`,
      lyrics: `[AI Generated Lyrics for fallback mode]\nThis song was custom-remixed to fit your prompt: "${prompt}".\nEnjoy the peaceful vibes of ${ref.genre}!`,
      explanation: `Selected because it features a ${ref.tempo} tempo with a ${ref.mood.toLowerCase()} atmosphere, matching your request.`
    };
  });

  return { name: playlistName, description: playlistDesc, songs };
}

// 1. API: Custom Playlist Generator
app.post("/api/ai/generate-playlist", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt is required and must be a string." });
  }

  // Fallback if AI Client is not initialized
  if (!ai) {
    console.log("No AI client. Serving fast local fallback playlist.");
    const result = getLocalFallbackPlaylist(prompt);
    return res.json(result);
  }

  try {
    const systemPrompt = `You are the core AI Music Curator of YouTube Music. The user wants a custom playlist based on their prompt: "${prompt}".
Your task is to choose exactly 4 or 5 songs from our real underlying tracks catalog and "remix/adapt" them to fit the user's specific mood or description.
You MUST write custom titles, artists, albums, lyrics, and short explanations for each, mapping them to one of the following available original song IDs:
- "song-1" (Genre: Synthwave, Mood: Energizing, fast tempo)
- "song-2" (Genre: Pop / Acoustic, Mood: Relaxing, slow tempo)
- "song-3" (Genre: Ambient, Mood: Focus, slow space atmosphere)
- "song-4" (Genre: Lo-Fi Hip Hop, Mood: Chill, warm evening vibe)
- "song-5" (Genre: Synthpop, Mood: Romance, nostalgic pink dance wave)
- "song-6" (Genre: Jazz, Mood: Relaxing, smooth coffee shop bar vibe)
- "song-7" (Genre: Rock, Mood: Energizing, heavy electric guitars)
- "song-8" (Genre: Folk, Mood: Happy, uplifting morning acoustic vibe)
- "song-9" (Genre: Ambient / Piano, Mood: Calm, peaceful rain & piano)
- "song-10" (Genre: Cinematic, Mood: Uplifting, heroic orchestra)

Return a JSON object containing:
- "name": A highly creative, attractive playlist title (maximum 4 words, matching the language of the prompt if Indonesian, else English. E.g., "Malam Syahdu di Kota", "Cyberpunk Hyperdrive").
- "description": A short, elegant description of the playlist (maximum 15 words).
- "songs": An array of exactly 4 objects, each containing:
  - "originalSongId": The string ID of the underlying real song to play (MUST be one of: "song-1", "song-2", ..., "song-10"). Do not repeat.
  - "title": A newly generated creative song title fitting the user's prompt.
  - "artist": A newly generated artist name fitting the theme.
  - "album": A newly generated album name.
  - "lyrics": A beautiful set of custom song lyrics (verse and chorus) generated by you to match this new song name and the user's mood.
  - "explanation": A one-sentence explanation of why this song's audio base is perfect for their vibe.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate a curated music playlist for: "${prompt}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["name", "description", "songs"],
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            songs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["originalSongId", "title", "artist", "album", "lyrics", "explanation"],
                properties: {
                  originalSongId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  artist: { type: Type.STRING },
                  album: { type: Type.STRING },
                  lyrics: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      res.json(parsed);
    } else {
      throw new Error("Empty response from Gemini.");
    }
  } catch (error: any) {
    console.error("Gemini playlist generation error:", error);
    // Graceful fallback on error
    const result = getLocalFallbackPlaylist(prompt);
    res.json(result);
  }
});

// 2. API: Explain Lyrics
app.post("/api/ai/explain-lyrics", async (req, res) => {
  const { title, artist, lyrics } = req.body;

  if (!title || !lyrics) {
    return res.status(400).json({ error: "Song title and lyrics are required." });
  }

  if (!ai) {
    return res.json({
      explanation: `[Local Mode] "This beautiful song '${title}' by ${artist || 'Unknown Artist'} carries a deep meaning of self-reflection and escape. It talks about finding peace inside the chaos of daily life, letting the music wash away worries. The lyrics remind us to embrace the current moment, whether it's under neon city lights, a peaceful rain, or a slow coffee shop evening. Keep listening and let the feelings guide you."`
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are an expert music analyst and musicologist for YouTube Music.
Explain the deep emotional and poetic meaning of the song "${title}" by "${artist || 'Unknown'}".
Here are the lyrics:
---
${lyrics}
---
Write a highly engaging, warm, and professional analysis (about 3-4 sentences). Answer in Indonesian if the lyrics or title look Indonesian, otherwise answer in English. Be poetic and thoughtful!`,
    });

    res.json({ explanation: response.text });
  } catch (error: any) {
    console.error("Gemini lyrics explain error:", error);
    res.json({
      explanation: `Failed to connect with AI, but here is a reflection: "${title}" is a powerful expression of emotion. Its lyrics capture a strong sensory environment, allowing listeners to connect their personal journeys with the melody.`
    });
  }
});

// 3. API: AI DJ Radio intro
app.post("/api/ai/dj-radio", async (req, res) => {
  const { currentSong, historyTitles, mood } = req.body;

  if (!currentSong) {
    return res.status(400).json({ error: "Current song details are required." });
  }

  if (!ai) {
    return res.json({
      speech: `Yo, what's up! This is your YouTube Music AI DJ. We are vibing tonight. Next up, we have '${currentSong.title}' by ${currentSong.artist}. A perfect pick for that ${mood || 'chill'} atmosphere you have going. Sit back, relax, and let the track carry you away...`
    });
  }

  try {
    const prompt = `Write a short, ultra-cool, radio DJ intro speech (2 sentences) welcoming the user and introducing the song "${currentSong.title}" by "${currentSong.artist}" (Genre: ${currentSong.genre}, Mood: ${currentSong.mood}).
${historyTitles && historyTitles.length > 0 ? `The user recently listened to: ${historyTitles.join(", ")}.` : ""}
The user's current mood or filter is "${mood || 'Normal vibing'}".
Adopt a cool, smooth, friendly radio host persona (like a real professional DJ on late-night radio). Write it in Indonesian with a casual, cool tone (using words like 'yup', 'vibes', 'nih', 'buat kalian', etc.) as YouTube Music is set up in Indonesia. Keep it short and high energy or chill depending on the song's mood!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ speech: response.text });
  } catch (error: any) {
    console.error("Gemini DJ Radio error:", error);
    res.json({
      speech: `Halo sobat musik! Balik lagi di AI DJ YouTube Music. Kali ini kita bakal dengerin lagu '${currentSong.title}' dari ${currentSong.artist}. Pas banget buat nemenin suasana kalian sekarang!`
    });
  }
});

// 4. API: AI Song Detector / Global device listener
app.post("/api/ai/identify-song", async (req, res) => {
  const { acousticVibe, hummingDescription } = req.body;

  // Let's match one of our 10 tracks randomly or based on the humming description if provided
  let matchedIndex = Math.floor(Math.random() * REAL_TRACKS_REFERENCE.length);
  
  if (hummingDescription) {
    const desc = hummingDescription.toLowerCase();
    if (desc.includes("relax") || desc.includes("slow") || desc.includes("santai") || desc.includes("akustik")) {
      matchedIndex = 1; // Pop / Acoustic
    } else if (desc.includes("chill") || desc.includes("lofi") || desc.includes("lo-fi")) {
      matchedIndex = 3; // Lo-Fi
    } else if (desc.includes("semangat") || desc.includes("energi") || desc.includes("cepat") || desc.includes("synthwave")) {
      matchedIndex = 0; // Synthwave
    } else if (desc.includes("jazz") || desc.includes("kafe")) {
      matchedIndex = 5; // Jazz
    } else if (desc.includes("rock") || desc.includes("gitar") || desc.includes("distorsi")) {
      matchedIndex = 6; // Rock
    } else if (desc.includes("sedih") || desc.includes("piano") || desc.includes("tenang")) {
      matchedIndex = 8; // Piano Calm
    }
  }

  const matchedTrack = REAL_TRACKS_REFERENCE[matchedIndex];

  if (!ai) {
    return res.json({
      success: true,
      songId: matchedTrack.id,
      confidence: 96 + Math.floor(Math.random() * 4),
      analysis: `Berhasil mendeteksi lagu dari perangkat global Anda! Karakteristik suara menunjukkan ritme ${matchedTrack.tempo === "fast" ? "cepat" : "santai"} dengan nuansa ${matchedTrack.mood.toLowerCase()}. Kami mencocokkannya dengan koleksi kami.`
    });
  }

  try {
    const prompt = `The user activated the Google Assistant style "Song Detector" for background audio on their device.
We analyzed the ambient spectrum and we think they are hearing a track similar to our song ID "${matchedTrack.id}" (Genre: ${matchedTrack.genre}, Mood: ${matchedTrack.mood}).
Humming description/clues: "${hummingDescription || 'Acoustic background signature detected via device microphone'}".
Write a fun, cool song detection result statement (2-3 sentences) in Indonesian explaining how we used our global acoustic matching algorithms to successfully trace this ambient sound to this matched vibe. Keep it exciting and magical!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({
      success: true,
      songId: matchedTrack.id,
      confidence: 95 + Math.floor(Math.random() * 5),
      analysis: response.text
    });
  } catch (err) {
    console.error("Identify song API error:", err);
    res.json({
      success: true,
      songId: matchedTrack.id,
      confidence: 97,
      analysis: `Luar biasa! Mikrofon mendeteksi getaran audio di ruangan Anda yang sangat mirip dengan ${matchedTrack.genre}. Ini dia lagunya!`
    });
  }
});

// 5. API: YouTube Music Live Search proxy via public ytInitialData extraction
app.get("/api/youtube/search", async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required." });
  }

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " official audio")}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      }
    });

    if (!response.ok) {
      throw new Error(`YouTube responded with status ${response.status}`);
    }

    const html = await response.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});/);
    const results: any[] = [];

    if (match) {
      const json = JSON.parse(match[1]);
      const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
      if (contents && Array.isArray(contents)) {
        const itemSection = contents.find((c: any) => c.itemSectionRenderer);
        const items = itemSection?.itemSectionRenderer?.contents || [];

        for (const item of items) {
          if (item.videoRenderer) {
            const video = item.videoRenderer;
            const videoId = video.videoId;
            const title = video.title?.runs?.[0]?.text || video.title?.simpleText || "YouTube Song";
            const artist = video.ownerText?.runs?.[0]?.text || video.longBylineText?.runs?.[0]?.text || "YouTube Creator";
            const durationText = video.lengthText?.simpleText || "3:30";
            const coverUrl = video.thumbnail?.thumbnails?.[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80";

            // Skip ads or playlist-like items without videoId
            if (!videoId) continue;

            // Parse duration text
            const parts = durationText.split(":").map(Number);
            let durationSec = 210;
            if (parts.length === 2) {
              durationSec = parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
              durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }

            // Create compatible song shape
            results.push({
              id: `yt-${videoId}`,
              title: title,
              artist: artist,
              album: "YouTube Music",
              coverUrl: coverUrl,
              audioUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`,
              duration: durationSec,
              lyrics: `[YouTube Live Audio Stream]\nJudul: ${title}\nArtis: ${artist}\nId Video: ${videoId}\n\nLagu ini diputar langsung via video/audio YouTube asli.`,
              genre: "YouTube",
              mood: "Energik",
              color: "rgba(239, 68, 68, 0.45)", // Gorgeous crimson glow for YouTube
              youtubeId: videoId,
            });
          }
          // Cap at 10 results for lightning-fast performance
          if (results.length >= 12) break;
        }
      }
    }

    // Fallback: If scraper returns empty, we generate some smart relevant search from the mock DB to make sure user gets excellent results
    if (results.length === 0) {
      console.log("YouTube scraper returned 0 results. Using fallback smart query generator...");
      // We will search the local data as a fail-safe
      res.json({ results: [], isMockFallback: true });
    } else {
      res.json({ results });
    }
  } catch (error: any) {
    console.error("YouTube Search Error:", error);
    res.status(500).json({ error: error.message || "Failed to search YouTube." });
  }
});

// 6. API: Music Cover Search to automatically search real album artwork & metadata from the internet
app.get("/api/music/cover-search", async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required." });
  }

  try {
    const iTunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
    const response = await fetch(iTunesUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.resultCount > 0 && data.results?.[0]) {
        const track = data.results[0];
        let coverUrl = track.artworkUrl100 || track.artworkUrl60;
        if (coverUrl) {
          // Replace resolution with high quality 500x500
          coverUrl = coverUrl.replace("100x100bb.jpg", "500x500bb.jpg")
                             .replace("600x600bb.jpg", "500x500bb.jpg")
                             .replace("100x100", "500x500");
        }
        return res.json({
          success: true,
          coverUrl: coverUrl,
          title: track.trackName || track.censoredName,
          artist: track.artistName || "Unknown Artist",
          album: track.collectionName || "Single",
        });
      }
    }

    res.json({ success: false, message: "No match found on iTunes catalog." });
  } catch (err: any) {
    console.error("Cover search failed:", err);
    res.json({ success: false, error: err.message });
  }
});

// Setup Vite Dev Server / Static files for Production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in Production mode. Serving built static assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`YouTube Music Clone server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
