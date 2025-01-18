import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

interface GenerateResponseResult {
  response: string;
}

export class CharacterDialogueService {
  async loadCharacterDialogues(characterId: string): Promise<boolean> {
    console.debug(`Loading dialogues for ${characterId} is no longer needed with Pinecone`);
    return true;
  }

  async searchSimilarDialogues(query: string, characterId: string): Promise<string> {
    try {
      const generateResponse = httpsCallable<{
        query: string;
        characterId: string;
      }, GenerateResponseResult>(
        functions,
        'generateChatResponse'
      );

      const result = await generateResponse({
        query,
        characterId
      });

      return result.data.response;
    } catch (error) {
      console.error('[CharacterDialogueService] Error searching dialogues:', error);
      throw error;
    }
  }
} 