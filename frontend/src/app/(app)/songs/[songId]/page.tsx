'use client';

import Image from 'next/image';
import Link from 'next/link';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, Play, Pause, SkipBack, SkipForward, Heart, PlusCircle, ListMusic, User, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAudio } from '@/contexts/audio-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

function getHighResImage(imgArr: any[] | undefined) {
  if (!Array.isArray(imgArr) || !imgArr[0]?.url) return 'https://placehold.co/400x400?text=No+Image';
  return imgArr[0].url.replace(/(50x50|150x150|200x200|250x250)/, '500x500');
}

export default function SongDetailPage({ params }: { params: { songId: string } }) {
  const [song, setSong] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string }>>([]);
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const { playSong, currentSong, isPlaying, pauseSong, resumeSong, playNext, playPrevious, queue, currentIndex, playQueue, seekTo } = useAudio();
  // Progress bar logic (sync with global player)
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchPlaylists = async () => {
    try {
      setIsLoadingPlaylists(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/playlists`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setPlaylists(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch playlists:', err);
      toast.error('Failed to load playlists');
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!song) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songId: song.id,
          name: song.name,
          artist: song.primaryArtists || song.artists?.primary?.[0]?.name || 'Unknown Artist',
          image: song.image,
          downloadUrl: song.downloadUrl,
          duration: song.duration,
          language: song.language || 'Unknown'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Song added to playlist');
        setIsPlaylistDialogOpen(false);
      } else {
        throw new Error(data.message || 'Failed to add song to playlist');
      }
    } catch (err: any) {
      console.error('Error adding to playlist:', err);
      toast.error(err.message || 'Failed to add to playlist');
    }
  };

  useEffect(() => {
    async function fetchSong() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs/${params.songId}`);
        if (!res.ok) throw new Error('Failed to fetch song');
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
          setError('Song not found.');
          setSong(null);
        } else {
          setSong(data.data[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setSong(null);
      } finally {
        setLoading(false);
      }
    }
    fetchSong();
  }, [params.songId]);

  // Sync progress bar with global audio
  const isCurrentlyPlaying = currentSong?.id === song?.id && isPlaying;
  useEffect(() => {
    if (isCurrentlyPlaying && currentSong) {
      const audio = document.querySelector('audio');
      if (!audio) return;
      const update = () => {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration || 0);
      };
      audio.addEventListener('timeupdate', update);
      audio.addEventListener('durationchange', update);
      update();
      return () => {
        audio.removeEventListener('timeupdate', update);
        audio.removeEventListener('durationchange', update);
      };
    }
  }, [isCurrentlyPlaying, currentSong]);

  // Open playlist dialog when clicking add to playlist
  const handlePlaylistDialogOpen = () => {
    setIsPlaylistDialogOpen(true);
    if (playlists.length === 0) {
      fetchPlaylists();
    }
  };

  useEffect(() => {
    // Auto-set queue if albumId or playlistId is present in query params, or if song has album/playlist info
    async function maybeSetQueue() {
      if (!song) return;
      const albumId = searchParams.get('albumId') || song.album?.id || song.albumId || '';
      const playlistId = searchParams.get('playlistId') || song.playlistId || '';
      // Only set queue if queue is not already the full album/playlist
      const isSingleSongQueue = queue.length === 1 && queue[0].id === song.id;
      const isSongInQueue = queue.find((s: any) => s.id === song.id);
      if ((albumId || playlistId) && (queue.length === 0 || isSingleSongQueue || !isSongInQueue)) {
        let songsArr: any[] = [];
        if (albumId) {
          // Fetch album songs
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/albums?id=${albumId}`);
          const data = await res.json();
          songsArr = Array.isArray(data.data?.songs) ? data.data.songs : [];
        } else if (playlistId) {
          // Fetch playlist songs
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/playlists?id=${playlistId}`);
          const data = await res.json();
          songsArr = Array.isArray(data.data?.songs) ? data.data.songs : [];
        }
        if (songsArr.length > 0) {
          const idx = songsArr.findIndex((s) => s.id === song.id);
          if (idx !== -1) {
            playQueue(songsArr, idx);
          }
        }
      }
    }
    maybeSetQueue();
  }, [song, searchParams]);

  useEffect(() => {
    // If queue and index are present in query params, set the queue
    async function maybeSetQueueFromQuery() {
      if (!song) return;
      const queueParam = searchParams.get('queue');
      const indexParam = searchParams.get('index');
      if (queueParam && indexParam) {
        try {
          const songIds = JSON.parse(decodeURIComponent(queueParam));
          if (Array.isArray(songIds) && songIds.length > 0) {
            // Fetch all songs by ID (batch API call or multiple calls)
            const songResults = await Promise.all(songIds.map(async (id: string) => {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs/${id}`);
              const data = await res.json();
              return Array.isArray(data.data) && data.data.length > 0 ? data.data[0] : null;
            }));
            const validSongs = songResults.filter(Boolean);
            const idx = parseInt(indexParam, 10);
            if (validSongs.length > 0 && idx >= 0 && idx < validSongs.length) {
              playQueue(validSongs, idx);
              return;
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    maybeSetQueueFromQuery();
  }, [song, searchParams]);

  // Sync URL with currentSong in context
  useEffect(() => {
    if (currentSong && currentSong.id !== params.songId) {
      // Preserve query params if present
      const query = window.location.search;
      router.push(`/songs/${currentSong.id}${query}`);
    }
  }, [currentSong, params.songId, router]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error || !song) return (
    <div className="p-8 text-center text-red-600">
      <h1>Song not found</h1>
      <p>{error || `No song found for ID: ${params.songId}`}</p>
    </div>
  );

  // Defensive: get image, artists, album
  const imageUrl = getHighResImage(song.image);
  const isPlaceholder = imageUrl.includes('placehold.co');
  const PNG_PLACEHOLDER = 'https://placehold.co/400x400.png?text=No+Image';
  const primaryArtists = Array.isArray(song.artists?.primary)
    ? song.artists.primary.map((a: any) => a.name).join(', ')
    : song.primaryArtists || song.singers || '';
  const albumName = song.album?.name || song.album || '';
  const albumId = song.album?.id || '';

  // Get audio URL (highest quality available)
  const audioUrl = Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0
    ? song.downloadUrl[0].url
    : null;

  const handlePlayPause = () => {
    if (isCurrentlyPlaying) {
      pauseSong();
    } else {
      playSong(song);
    }
  };

  const handleProgressChange = (value: number[]) => {
    if (duration > 0) {
      const newTime = Math.floor((value[0] / 100) * duration);
      seekTo(newTime);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Lyrics: not available in API, so show not available
  // If you add lyrics fetching, update here

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <Link href="/dashboard" className="flex items-center text-muted-foreground hover:text-primary transition-colors font-body mb-4">
        <ChevronLeft className="mr-2 h-5 w-5" /> Back to Discover
      </Link>

      {/* Main Song Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Album Art */}
        <div className="lg:col-span-1">
          <div className="relative aspect-square rounded-xl overflow-hidden shadow-2xl">
            <Image
              src={isPlaceholder ? PNG_PLACEHOLDER : imageUrl}
              alt={song.name || 'Song cover'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </div>

        {/* Song Details */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{song.name}</h1>
            <p className="text-xl text-muted-foreground mb-4">
              by {primaryArtists}
            </p>
            {albumName && (
              <Link 
                href={`/albums/${albumId}`} 
                className="text-lg text-primary hover:underline transition-colors"
              >
                {albumName}
              </Link>
            )}
          </div>

          {/* Audio Controls */}
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <Slider
                value={[progress]}
                onValueChange={handleProgressChange}
                max={100}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => playPrevious()}
                disabled={currentIndex <= 0}
                className="h-12 w-12 rounded-full"
              >
                <SkipBack className="h-6 w-6" />
              </Button>

              <Button
                onClick={handlePlayPause}
                className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90"
              >
                {isCurrentlyPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8 ml-1" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => playNext()}
                disabled={currentIndex >= queue.length - 1}
                className="h-12 w-12 rounded-full"
              >
                <SkipForward className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Heart className="mr-2 h-4 w-4" />
              Like
            </Button>
            <Dialog open={isPlaylistDialogOpen} onOpenChange={setIsPlaylistDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={handlePlaylistDialogOpen}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add to Playlist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Playlist</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  {isLoadingPlaylists ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : playlists.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No playlists found. Create one first.</p>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                      {playlists.map((playlist) => (
                        <div 
                          key={playlist.id} 
                          className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-md cursor-pointer"
                          onClick={() => handleAddToPlaylist(playlist.id)}
                        >
                          <span>{playlist.name}</span>
                          <PlusCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm">
              <ListMusic className="mr-2 h-4 w-4" />
              Queue
            </Button>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Song Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <p>{song.duration ? formatTime(song.duration) : 'Unknown'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Language:</span>
              <p>{song.language || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Year:</span>
              <p>{song.year || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Label:</span>
              <p>{song.label || 'Unknown'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
