import { Character } from '../types/character';
import { CharacterDialogueService } from './characterDialogues';
import { CharacterResponseService } from './characterResponses';

export class CharacterAIService {
  private dialogueService: CharacterDialogueService;
  private responseService: CharacterResponseService;

  constructor() {
    this.dialogueService = new CharacterDialogueService();
    this.responseService = new CharacterResponseService();
  }

  async loadCharacterDialogues(characterId: string): Promise<boolean> {
    return this.dialogueService.loadCharacterDialogues(characterId);
  }

  async generateResponse(character: Character, query: string): Promise<string> {
    console.log('[CharacterAIService] Generating response:', { character: character.name, query });
    
    try {
      // Get response directly
      const response = await this.dialogueService.searchSimilarDialogues(query, character.id);
      
      console.log('[CharacterAIService] Response generated:', response);
      return response;
    } catch (error) {
      console.error('[CharacterAIService] Error generating response:', error);
      throw error;
    }
  }

  async generateSpeech(text: string, characterId: string): Promise<string> {
    console.log('[CharacterAIService] Generating speech:', { characterId, text });
    return this.responseService.generateSpeech(text, characterId);
  }
} 