'use client';

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, useSearchParams, useRouter } from 'next/navigation';
import { getAlbumById, getSongsByAlbumId, getArtistById, type Album, type Song } from '@/lib/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListMusic, ChevronLeft, PlayCircle, User, CalendarDays, Clock, Music } from 'lucide-react';
import { useAudio } from '@/contexts/audio-context';
import { useEffect, useState } from 'react';
import { usePlayAndNavigate } from '@/hooks/use-play-and-navigate';

async function getAlbum(albumId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/albums?id=${albumId}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default function AlbumPage({ params }: { params: { albumId: string } }) {
  const searchParams = useSearchParams();
  const playSongId = searchParams?.get('play');
  const { playSong } = useAudio();
  const router = useRouter();

  const [album, setAlbum] = useState<any | null>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAlbum() {
      setLoading(true);
      setError('');
      try {
        const response = await getAlbum(params.albumId);
        if (!response || !response.success || !response.data) {
          setError('Album not found');
          setAlbum(null);
          setSongs([]);
        } else {
          setAlbum(response.data);
          setSongs(Array.isArray(response.data.songs) ? response.data.songs : []);
        }
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setAlbum(null);
        setSongs([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAlbum();
  }, [params.albumId]);

  // Auto-play song if play query param is present
  useEffect(() => {
    if (playSongId && songs.length > 0) {
      const songToPlay = songs.find((s: any) => s.id === playSongId);
      if (songToPlay) {
        playSong(songToPlay);
      }
    }
    // Only run when songs or playSongId changes
  }, [playSongId, songs]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error || !album) return (
    <div className="p-8 text-center text-red-600">
      <h1>Album not found</h1>
      <p>{error || `No album found for ID: ${params.albumId}`}</p>
    </div>
  );

  const primaryArtist = Array.isArray(album.artists?.primary) && album.artists.primary.length > 0 ? album.artists.primary[0] : null;
  const imageUrl = (album.image && Array.isArray(album.image) && album.image[0]?.url)
    ? album.image[0].url.replace(/(50x50|150x150|200x200|250x250)/, '500x500')
    : '/musicmitra-logo.svg';
  const isPlaceholder = imageUrl.includes('musicmitra-logo.svg');

  return (
    <div className="container mx-auto py-8 px-4 space-y-12">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center text-muted-foreground hover:text-primary transition-colors font-body mb-6"
      >
        <ChevronLeft className="mr-2 h-5 w-5" /> Back
      </button>

      <section aria-labelledby="album-info" className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
        <Image
          src={imageUrl}
          alt={album.name || 'Album'}
          width={250}
          height={250}
          className="rounded-lg shadow-xl object-cover aspect-square border-4 border-secondary/30"
          priority
          unoptimized={isPlaceholder}
        />
        <div className="text-center md:text-left flex-1">
          <p className="text-sm font-body text-primary uppercase tracking-wider">Album</p>
          <h1 id="album-info" className="text-4xl lg:text-5xl font-bold font-headline text-foreground mt-1 mb-2">{album.name}</h1>
          
          <div className="flex items-center justify-center md:justify-start text-muted-foreground font-body space-x-4 mb-3 text-sm">
            {primaryArtist && (
              <Link href={`/artists/${primaryArtist.id}`} className="flex items-center hover:text-primary">
                <User className="mr-1.5 h-4 w-4" /> {primaryArtist.name}
              </Link>
            )}
            {album.year && (
              <span className="flex items-center">
                <CalendarDays className="mr-1.5 h-4 w-4" /> {album.year}
              </span>
            )}
             <span className="flex items-center">
                <Music className="mr-1.5 h-4 w-4" /> {songs.length} songs
            </span>
          </div>
          
          <PlayAlbumButton songs={songs} />
        </div>
      </section>

      {songs.length > 0 && (
        <section aria-labelledby="album-tracks">
          <h2 id="album-tracks" className="text-2xl font-semibold font-headline text-foreground mb-6 flex items-center">
            <ListMusic className="mr-3 h-6 w-6 text-primary" /> Tracklist
          </h2>
          <Card className="shadow-lg rounded-xl">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {songs.map((song: any, index: number) => (
                  <SongListItem key={song.id} song={song} index={index} imageUrl={imageUrl} songs={songs} />
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
      </div>
  );
}

function PlayAlbumButton({ songs }: { songs: any[] }) {
  const { playSong } = useAudio();
  
  const handlePlayAlbum = () => {
    if (songs.length > 0) {
      playSong(songs[0]);
    }
  };

  return (
    <Button className="mt-4 font-headline text-base px-6 py-3" onClick={handlePlayAlbum}>
      <PlayCircle className="mr-2 h-5 w-5" /> Play Album
    </Button>
  );
}

function SongListItem({ song, index, imageUrl, songs }: { song: any; index: number; imageUrl: string; songs: any[] }) {
  const { playQueue, currentSong, isPlaying, queue } = useAudio();
  const playAndNavigate = usePlayAndNavigate();
  const songImage = imageUrl;
  const songIsPlaceholder = songImage.includes('musicmitra-logo.svg');
  const songPrimaryArtists = Array.isArray(song.artists?.primary)
    ? song.artists.primary.map((a: any) => a.name).join(', ')
    : '';
  const isCurrentlyPlaying = currentSong?.id === song.id && isPlaying;
  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playQueue(songs, index);
    playAndNavigate(song);
  };
  const albumId = song.album?.id || song.albumId || '';
  return (
    <li className="flex items-center p-3 hover:bg-secondary/30 rounded-lg transition-colors group">
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        <span className="text-sm font-body text-muted-foreground w-6 text-center">{index + 1}</span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary"
          onClick={handlePlayClick}
        >
          {isCurrentlyPlaying ? (
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <PlayCircle className="h-6 w-6" />
          )}
        </Button>
        <Image src={songImage} alt={song.name || 'Song'} width={40} height={40} className="rounded-md" unoptimized={songIsPlaceholder} />
        <div className="flex-1 min-w-0">
          <Link href={`/songs/${song.id}${albumId ? `?albumId=${albumId}` : ''}`} className="font-headline text-md text-foreground hover:text-primary truncate font-semibold">
            {song.name}
          </Link>
          <p className="font-body text-xs text-muted-foreground truncate">
            {songPrimaryArtists}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        {song.duration && <span className="text-xs font-mono text-muted-foreground hidden sm:inline-block"><Clock className="inline h-3 w-3 mr-1" />{song.duration}</span>}
      </div>
    </li>
  );
}
