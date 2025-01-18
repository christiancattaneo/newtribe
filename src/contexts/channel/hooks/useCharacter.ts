import { useState, useCallback } from 'react';

interface UseCharacterProps {
  clearCurrentChat: () => void;
}

export function useCharacter({ clearCurrentChat }: UseCharacterProps) {
  const [currentCharacter, setCurrentCharacter] = useState<string | null>(null);

  const handleCharacterSelect = useCallback(async (characterId: string | null) => {
    console.log('[useCharacter] Setting current character:', characterId);
    await clearCurrentChat();
    setCurrentCharacter(characterId);
    return Promise.resolve();
  }, [clearCurrentChat]);

  return {
    currentCharacter,
    setCurrentCharacter: handleCharacterSelect
  };
} 