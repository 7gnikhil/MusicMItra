// src/app/(app)/karaoke/page.tsx
'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import LyricsDisplay from '@/components/LyricsDisplay';
import { LyricsResponse } from '@/types';
import { generateLyrics } from '@/services/geminiService';

export default function KaraokePage() {
  const [files, setFiles] = useState<{ original: File; instrumental: File } | null>(null);
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = async (selectedFiles: { original: File; instrumental: File }) => {
    setFiles(selectedFiles);
    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting lyrics generation for file:', selectedFiles.original.name);
      console.log('File size:', selectedFiles.original.size);
      console.log('File type:', selectedFiles.original.type);

      let lyricsResponse: LyricsResponse | null = null;
      let lastError: unknown = null;

      for (const candidate of [selectedFiles.original, selectedFiles.instrumental]) {
        try {
          lyricsResponse = await generateLyrics(candidate);
          if (lyricsResponse && Array.isArray(lyricsResponse.lyrics) && lyricsResponse.lyrics.length > 0) {
            break;
          }
        } catch (error) {
          lastError = error;
          console.warn('Lyrics generation failed for candidate file:', candidate.name, error);
        }
      }

      if (!lyricsResponse || !Array.isArray(lyricsResponse.lyrics) || lyricsResponse.lyrics.length === 0) {
        console.error('No lyrics in response:', lyricsResponse);
        setError('No lyrics were generated for this track. Try a shorter or cleaner audio file.');
        return;
      }

      console.log('Raw API Response:', lyricsResponse);
      console.log('Number of lyric lines:', lyricsResponse.lyrics.length);

      const processedLyrics: LyricsResponse = {
        metadata: {
          title: lyricsResponse.metadata?.title || 'Unknown Title',
          artist: lyricsResponse.metadata?.artist || 'Unknown Artist',
          album: lyricsResponse.metadata?.album || '',
          isTelugu: lyricsResponse.metadata?.isTelugu ?? true,
          duration: lyricsResponse.metadata?.duration || 0,
          language: lyricsResponse.metadata?.language || 'te'
        },
        lyrics: (lyricsResponse.lyrics || []).map((line: any, index: number) => {
          console.log(`Processing line ${index}:`, line);
          return {
            telugu: line.telugu || line.text || '',
            transliteration: line.transliteration || '',
            translation: line.translation || '',
            timestamp: line.timestamp || '00:00'
          };
        })
      };

      console.log('Processed Lyrics:', processedLyrics);
      console.log('First lyric line:', processedLyrics.lyrics[0]);

      setLyricsData(processedLyrics);
    } catch (error) {
      console.error('Error processing song:', error);
      setError('Failed to process the song. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Karaoke Player</h1>
        
        {!files ? (
          <FileUpload onFilesSelected={handleFilesSelected}
          isLoading={isLoading} />
        ) : (
          <LyricsDisplay 
            data={lyricsData} 
            originalFile={files.original}
            instrumentalFile={files.instrumental}
            onBack={() => {
              setFiles(null);
              setLyricsData(null);
            }}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}