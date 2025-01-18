import { createContext } from 'react';
import { Character, CHARACTERS } from '../../types/character';

export interface CharacterContextType {
  characters: typeof CHARACTERS;
  currentCharacter: Character | null;
  isLoading: boolean;
  loadCharacter: (characterId: string) => Promise<boolean>;
  generateResponse: (query: string) => Promise<string>;
}

export const CharacterContext = createContext<CharacterContextType | null>(null); 