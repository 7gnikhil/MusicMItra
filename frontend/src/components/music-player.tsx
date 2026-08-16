'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Maximize2, Shuffle, Repeat, ListMusic, Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudio } from '@/contexts/audio-context';

export function MusicPlayer() {
  const { currentSong, isPlaying, playSong, pauseSong, resumeSong, stopSong, playNext, playPrevious, queue, currentIndex, seekTo, audioUrl } = useAudio();
  const [isLiked, setIsLiked] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
  const [showQueue, setShowQueue] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Only set playbackRate, volume, and muted
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = 1.0;
      audioRef.current.volume = volume / 100;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted, currentSong]);

  // Only play/pause when isPlaying changes
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSong]);

  // Only seek when seekTime is set
  useEffect(() => {
    if (seekTime !== null && audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setSeekTime(null);
    }
  }, [seekTime]);

  // Update duration and currentTime from native events only
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) audioRef.current.currentTime = 0;
      if (audioRef.current) audioRef.current.play();
    } else if (repeatMode === 'all' && queue.length > 0) {
      playNext();
    } else {
      playNext();
    }
  };

  const handleProgressChange = (value: number[]) => {
    if (duration > 0) {
      const newTime = Math.floor((value[0] / 100) * duration);
      setSeekTime(newTime);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseSong();
    } else {
      resumeSong();
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      const newVolume = volume > 0 ? volume : 50;
      setVolume(newVolume);
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const toggleShuffle = () => setIsShuffle(!isShuffle);

  const cycleRepeatMode = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const handleSkipForward = () => {
    if (queue.length > 0 && currentIndex < queue.length - 1) {
      playNext();
    }
  };

  const handleSkipBack = () => {
    if (queue.length > 0 && currentIndex > 0) {
      playPrevious();
    }
  };

  // Warn if multiple <audio> elements are present
  useEffect(() => {
    const audios = document.querySelectorAll('audio');
    if (audios.length > 1) {
      console.warn('Multiple <audio> elements detected:', audios);
    }
  });

  if (!currentSong) {
    return null;
  }

  // Get song image
  const songImage = Array.isArray(currentSong.image) && currentSong.image[0]?.url
    ? currentSong.image[0].url.replace(/(50x50|150x150|200x200|250x250)/, '200x200')
    : currentSong.albumArt || 'https://placehold.co/56x56?text=No+Image';

  // Get best audio URL and quality for debug display
  let audioQuality = undefined;
  if (currentSong && Array.isArray(currentSong.downloadUrl) && currentSong.downloadUrl.length > 0) {
    // Prefer 320kbps, then 160kbps, then 96kbps, else last
    const qualities = ['320kbps', '160kbps', '96kbps'];
    let found = null;
    for (const q of qualities) {
      found = currentSong.downloadUrl.find((d: any) => d.quality === q);
      if (found) break;
    }
    if (!found) found = currentSong.downloadUrl[currentSong.downloadUrl.length - 1];
    audioQuality = found?.quality || 'unknown';
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 h-[90px] border-t bg-card/80 backdrop-blur-lg shadow-2xl md:h-[90px] pb-[var(--mobile-nav-height,0px)] md:pb-0" style={{backdropFilter: 'blur(16px) saturate(180%)'}}>
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        hidden
      />
      <div className="container mx-auto flex h-full items-center justify-between px-2 sm:px-4">
        <div className="flex items-center gap-3 w-1/4 md:w-1/3">
          <Link href={`/songs/${currentSong.id}`} passHref>
            <Image
              src={songImage}
              alt={currentSong.albumName || 'Album'}
              width={56}
              height={56}
              className="rounded-md shadow-md object-cover hover:opacity-80 transition-opacity cursor-pointer"
            />
          </Link>
          <div className="hidden sm:block overflow-hidden">
            <Link href={`/songs/${currentSong.id}`} className="truncate text-sm font-semibold font-headline text-foreground hover:text-primary transition-colors cursor-pointer">
                {currentSong.name}
            </Link>
            <p className="truncate text-xs text-muted-foreground font-body">
              {currentSong.primaryArtistName || 'Unknown Artist'}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={() => setIsLiked(!isLiked)}>
            <Heart className={cn("h-4 w-4", isLiked && "fill-primary text-primary")}/>
          </Button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-2 w-1/2 md:w-1/3 px-1">
          <div className="flex items-center gap-1 sm:gap-3">
            <Button variant="ghost" size="icon" className={cn("h-9 w-9 text-muted-foreground hover:text-primary", isShuffle && "text-primary")} onClick={toggleShuffle} aria-label={isShuffle ? "Disable Shuffle" : "Enable Shuffle"}>
              <Shuffle className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={handleSkipBack} aria-label="Previous Song" disabled={queue.length === 0 || currentIndex <= 0}>
              <SkipBack className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button variant="default" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-transform duration-200 active:scale-95" onClick={togglePlayPause} aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" /> : <Play className="h-5 w-5 sm:h-6 sm:w-6" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={handleSkipForward} aria-label="Next Song" disabled={queue.length === 0 || currentIndex >= queue.length - 1}>
              <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button variant="ghost" size="icon" className={cn("h-9 w-9 text-muted-foreground hover:text-primary relative", repeatMode !== 'off' && "text-primary")} onClick={cycleRepeatMode} aria-label={`Repeat: ${repeatMode}`}>
              <Repeat className="h-4 w-4 sm:h-5 sm:w-5" />
              {repeatMode === 'one' && <span className="absolute text-[0.6rem] bottom-0 right-0 bg-primary text-primary-foreground rounded-full w-3 h-3 flex items-center justify-center font-bold">1</span>}
            </Button>
          </div>
          <div className="flex w-full max-w-xs items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono w-9 text-center">{formatTime(currentTime)}</span>
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              className="w-full h-2 [&>span:first-child]:h-2 [&>span:first-child>span]:bg-primary cursor-pointer"
              onValueChange={handleProgressChange}
              aria-label="Song progress"
            />
            <span className="text-xs text-muted-foreground font-mono w-9 text-center">{formatTime(duration)}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-1 sm:gap-2 w-1/4 md:w-1/3">
           <Button variant="ghost" size="icon" className="hidden lg:inline-flex h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Queue" onClick={() => setShowQueue(true)}>
             <ListMusic className="h-4 w-4" />
           </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={toggleMute} aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}>
            {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={100}
            step={1}
            className="w-12 sm:w-16 h-2 hidden md:flex [&>span:first-child]:h-2 [&>span:first-child>span]:bg-primary cursor-pointer"
            onValueChange={handleVolumeChange}
            aria-label="Volume control"
          />
           <Button variant="ghost" size="icon" className="hidden lg:inline-flex h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Full screen player" onClick={() => setShowFullScreen(true)}>
             <Maximize2 className="h-4 w-4" />
           </Button>
        </div>
      </div>
      {showQueue && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowQueue(false)}>
          <div className="bg-card rounded-t-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline text-lg mb-4">Up Next</h3>
            <ul className="divide-y divide-border max-h-60 overflow-y-auto">
              {queue.map((song, idx) => (
                <li key={song.id} className={cn("flex items-center gap-3 py-2", idx === currentIndex && "bg-primary/10")}> 
                  <Image src={Array.isArray(song.image) && song.image[0]?.url ? song.image[0].url : song.albumArt || 'https://placehold.co/40x40?text=No+Image'} alt={song.name} width={40} height={40} className="rounded" />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold truncate block">{song.name}</span>
                    <span className="text-xs text-muted-foreground truncate block">{song.primaryArtistName}</span>
                  </div>
                  {idx === currentIndex ? <span className="text-primary font-bold text-xs">Now</span> : null}
                </li>
              ))}
            </ul>
            <Button className="mt-4 w-full" onClick={() => setShowQueue(false)}>Close</Button>
          </div>
        </div>
      )}
      {showFullScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowFullScreen(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl p-8 flex flex-col items-center relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-muted-foreground hover:text-primary" onClick={() => setShowFullScreen(false)}>&times;</button>
            <Image src={songImage} alt={currentSong.albumName || 'Album'} width={300} height={300} className="rounded-xl shadow-lg mb-6" />
            <h2 className="text-3xl font-bold font-headline mb-2">{currentSong.name}</h2>
            <p className="text-lg text-muted-foreground mb-4">{currentSong.primaryArtistName}</p>
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" className={cn("h-12 w-12 text-muted-foreground hover:text-primary", isShuffle && "text-primary")} onClick={toggleShuffle} aria-label={isShuffle ? "Disable Shuffle" : "Enable Shuffle"}>
                <Shuffle className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="h-12 w-12 text-muted-foreground hover:text-primary" onClick={handleSkipBack} aria-label="Previous Song" disabled={queue.length === 0 || currentIndex <= 0}>
                <SkipBack className="h-6 w-6" />
              </Button>
              <Button variant="default" size="icon" className="h-16 w-16 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-transform duration-200 active:scale-95" onClick={togglePlayPause} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause className="h-8 w-8 animate-pulse" /> : <Play className="h-8 w-8" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-12 w-12 text-muted-foreground hover:text-primary" onClick={handleSkipForward} aria-label="Next Song" disabled={queue.length === 0 || currentIndex >= queue.length - 1}>
                <SkipForward className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className={cn("h-12 w-12 text-muted-foreground hover:text-primary relative", repeatMode !== 'off' && "text-primary")} onClick={cycleRepeatMode} aria-label={`Repeat: ${repeatMode}`}>
                <Repeat className="h-6 w-6" />
                {repeatMode === 'one' && <span className="absolute text-[0.7rem] bottom-1 right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center font-bold">1</span>}
              </Button>
            </div>
            <div className="flex w-full max-w-lg items-center gap-2 mb-6">
              <span className="text-sm text-muted-foreground font-mono w-12 text-center">{formatTime(currentTime)}</span>
              <Slider
                value={[progress]}
                max={100}
                step={0.1}
                className="w-full h-3 [&>span:first-child]:h-3 [&>span:first-child>span]:bg-primary cursor-pointer"
                onValueChange={handleProgressChange}
                aria-label="Song progress"
              />
              <span className="text-sm text-muted-foreground font-mono w-12 text-center">{formatTime(duration)}</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary" onClick={toggleMute} aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}>
                {isMuted || volume === 0 ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                className="w-24 h-3 [&>span:first-child]:h-3 [&>span:first-child>span]:bg-primary cursor-pointer"
                onValueChange={handleVolumeChange}
                aria-label="Volume control"
              />
            </div>
          </div>
        </div>
      )}
      {/* Debug: show audio URL and quality */}
      <div className="text-xs text-muted-foreground mt-1 px-2 truncate" style={{maxWidth: '100vw'}}>
        <span>Now playing: <b>{audioQuality}</b> | <span title={audioUrl ?? undefined}>{audioUrl?.slice(0, 60)}{audioUrl && audioUrl.length > 60 ? '...' : ''}</span></span>
        {audioUrl && (
          <button
            className="ml-2 underline text-primary hover:text-primary/80"
            onClick={() => window.open(audioUrl, '_blank')}
            type="button"
          >
            Open in new tab
          </button>
        )}
      </div>
    </footer>
  );
}
