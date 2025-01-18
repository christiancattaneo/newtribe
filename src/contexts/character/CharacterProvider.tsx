import React, { useState, useCallback } from 'react';
import { Character, CHARACTERS } from '../../types/character';
import { CharacterAIService } from '../../services/characterAI';
import { useToast } from '../useToast';
import { CharacterContext } from './context';

export function CharacterProvider({ children }: { children: React.ReactNode }) {
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const characterService = React.useMemo(() => new CharacterAIService(), []);

  const loadCharacter = useCallback(async (characterId: string) => {
    setIsLoading(true);
    try {
      const character = CHARACTERS[characterId];
      if (!character) {
        showToast('Character not found', 'error');
        return false;
      }

      const success = await characterService.loadCharacterDialogues(characterId);
      if (success) {
        setCurrentCharacter(character);
        return true;
      } else {
        showToast('Failed to load character dialogues', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error loading character:', error);
      showToast('Error loading character', 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [characterService, showToast]);

  const generateResponse = useCallback(async (query: string) => {
    if (!currentCharacter) {
      throw new Error('No character selected');
    }
    return characterService.generateResponse(currentCharacter, query);
  }, [currentCharacter, characterService]);

  const value = {
    characters: CHARACTERS,
    currentCharacter,
    isLoading,
    loadCharacter,
    generateResponse
  };

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  );
} 