import { Character, CharacterDialogue } from '../types/character';

export function formatDialogueContext(dialogues: CharacterDialogue[]): string {
  return dialogues
    .map(dialogue => {
      let context = `${dialogue.type === 'tweet' ? 'Tweet' : 'Quote'}: "${dialogue.text}"`;
      if (dialogue.context) {
        context += `\nContext: ${dialogue.context}`;
      }
      if (dialogue.date) {
        context += `\nDate: ${dialogue.date}`;
      }
      return context;
    })
    .join('\n\n');
}

export function getCharacterPrompt(character: Character, context: string): string {
  return `You are ${character.name}. ${character.prompt}

Here are some of your relevant past statements for context:
${context}`;
}

export function preprocessText(text: string): string {
  // Remove URLs
  text = text.replace(/https?:\/\/\S+/g, '');
  
  // Remove special characters and extra whitespace
  text = text.replace(/[^\w\s.,!?'"]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Truncate to ~1000 characters to keep token count manageable
  return text.slice(0, 1000);
}

export function extractTopics(text: string): string[] {
  const commonTopics = [
    'economy', 'jobs', 'healthcare', 'immigration', 'foreign policy',
    'technology', 'climate', 'education', 'taxes', 'military'
  ];
  
  return commonTopics.filter(topic => 
    text.toLowerCase().includes(topic.toLowerCase())
  );
} 