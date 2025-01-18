import { Character } from '../types/character';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

interface ResponseData {
  response: string;
}

export class CharacterAIService {
  async loadCharacterDialogues(characterId: string): Promise<boolean> {
    console.debug(`Loading dialogues for ${characterId} is no longer needed with Pinecone`);
    return true;
  }

  async generateResponse(character: Character, query: string): Promise<string> {
    console.log('[CharacterAIService] Generating response:', { character: character.name, query });
    
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

      console.log('[CharacterAIService] Response generated:', result.data.response);
      return result.data.response;
    } catch (error) {
      console.error('[CharacterAIService] Error generating response:', error);
      throw error;
    }
  }
} 