import { AppHeader } from '@/components/app-header';
import { MusicPlayer } from '@/components/music-player';
import { AudioProvider } from '@/contexts/audio-context';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AudioProvider>
      <div className="flex min-h-screen flex-col">
        <Suspense fallback={<div className="h-20" />}>
          <AppHeader />
        </Suspense>
        <main className="flex-1 overflow-y-auto bg-background p-4 pt-8 md:p-8">
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
            {children}
          </Suspense>
        </main>
        <MusicPlayer />
      </div>
    </AudioProvider>
  );
}
