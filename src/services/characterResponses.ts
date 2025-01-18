import { Character } from '../types/character';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

interface ResponseData {
  response: string;
}

export class CharacterResponseService {
  async generateResponse(character: Character, query: string): Promise<string> {
    console.log('[CharacterResponseService] Generating response:', { character: character.name, query });
    
    try {
      const generateChatResponse = httpsCallable<{
        message: string; 
        characterId: string;
      }, ResponseData>(
        functions, 
        'generateChatResponse'
      );

      const result = await generateChatResponse({
        message: query,
        characterId: character.id
      });

      console.log('[CharacterResponseService] Response generated:', result.data.response);
      return result.data.response;
    } catch (error) {
      console.error('[CharacterResponseService] Error generating response:', error);
      throw error;
    }
  }

  async generateSpeech(text: string, characterId: string): Promise<string> {
    console.log('[CharacterResponseService] Generating speech:', { characterId, text });
    
    try {
      const generateSpeech = httpsCallable<{
        text: string;
        characterId: string;
      }, { audioUrl: string }>(
        functions,
        'generateSpeech'
      );

      const result = await generateSpeech({
        text,
        characterId
      });

      return result.data.audioUrl;
    } catch (error) {
      console.error('[CharacterResponseService] Error generating speech:', error);
      throw error;
    }
  }
} 