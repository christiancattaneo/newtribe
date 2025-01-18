import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../config/firebase';

interface SpeechResponse {
  audioUrl: string;
}

export class AudioService {
  private audio: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;

  async generateSpeech(text: string, characterId: string): Promise<string> {
    try {
      console.log('[AudioService] Generating speech:', { text: text.substring(0, 50), characterId });
      const functions = getFunctions(app);
      
      const generateSpeechFn = httpsCallable<{
        text: string;
        characterId: string;
      }, SpeechResponse>(functions, 'generateSpeech');
      
      const result = await generateSpeechFn({ text, characterId });
      const audioUrl = result.data.audioUrl;
      
      console.log('[AudioService] Audio URL received:', audioUrl);
      this.currentAudioUrl = audioUrl;
      return audioUrl;
    } catch (error) {
      console.error('[AudioService] Error generating speech:', error);
      throw error;
    }
  }

  playAudio(audioUrl: string) {
    if (this.audio) {
      this.audio.pause();
    }
    this.audio = new Audio(audioUrl);
    this.currentAudioUrl = audioUrl;
    this.audio.play().catch(error => {
      console.error('Error playing audio:', error);
    });
  }

  stopAudio() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
      this.currentAudioUrl = null;
    }
  }

  getCurrentAudioUrl(): string | null {
    return this.currentAudioUrl;
  }
}

export const audioService = new AudioService(); 