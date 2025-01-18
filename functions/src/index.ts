/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { OpenAI } from "openai";
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import { pack } from 'msgpackr';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

async function searchSimilarDialogues(query: string, characterId: string, topK: number = 3) {
  const index = pinecone.Index('character-chat-index');
  
  const queryEmbedding = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query.trim(),
  });

  const results = await index.query({
    vector: queryEmbedding.data[0].embedding,
    topK,
    includeMetadata: true,
    filter: { character_id: { $eq: characterId } }
  });

  return results.matches;
}

async function generateResponse(message: string, characterId: string): Promise<string> {
  // Get relevant past dialogues
  const similarDialogues = await searchSimilarDialogues(message, characterId);
  
  // Format context from similar dialogues
  const context = similarDialogues
    .filter(match => match.score && match.score > 0.75) // Only use relevant matches
    .map(match => {
      const metadata = match.metadata as any;
      return `${metadata.type === 'tweet' ? 'Tweet' : 'Quote'}: "${metadata.text}"`;
    })
    .join('\n');

  // Generate response using context
  const response = await openai.chat.completions.create({
    model: "gpt-4-1106-preview",
    messages: [
      {
        role: "system",
        content: `You are ${characterId.replace('_', ' ')}. Respond in character, using their speaking style and personality.
        Here are some of your relevant past statements for context:
        ${context}`
      },
      { role: "user", content: message }
    ],
    temperature: 0.9,
    max_tokens: 150
  });

  return response.choices[0].message.content || "I'm not sure how to respond to that.";
}

// Export for testing
export { generateResponse };

export const generateChatResponse = onCall<{ message?: string; query?: string; characterId: string }>(
  { 
    cors: ["http://localhost:5173", "https://tribed.web.app"],
    maxInstances: 10 
  },
  async (request) => {
    console.log('[generateChatResponse] Starting with request:', request.data);
    const { message, query, characterId } = request.data;
    const text = message || query;
    
    try {
      if (!text || !characterId) {
        throw new Error('Missing required parameters');
      }

      const response = await generateResponse(text, characterId);
      return { response };
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error('Failed to generate response');
    }
  }
);

export const generateSpeech = onCall<{ text: string; characterId: string }>(
  { 
    cors: ["http://localhost:5173", "https://tribed.web.app"],
    maxInstances: 10 
  },
  async (request) => {
    try {
      const { text, characterId } = request.data;
      if (!text || !characterId) {
        logger.error("Missing required fields", { 
          text: !!text, 
          characterId: !!characterId,
          receivedCharacterId: characterId,
          receivedText: text?.substring(0, 50)
        });
        throw new Error('Text and characterId are required');
      }

      logger.info("Request received", { 
        characterId, 
        textLength: text.length,
        textPreview: text.substring(0, 50)
      });

      // Character to voice mapping using actual Fish Audio model IDs
      const voiceMap: Record<string, string> = {
        'donald_trump': 'e58b0d7efca34eb38d5c4985e378abcb',
        'elon_musk': '03397b4c4be74759b72533b663fbd001',
        'joe_biden': '9b42223616644104a4534968cd612053',
        'spongebob': '54e3a85ac9594ffa83264b8a494b901b',
        'joker': '2aac40139cac47608b0b4a7a77a5799c'
      };

      const voice = voiceMap[characterId];
      if (!voice) {
        logger.error("Invalid character ID", { characterId });
        throw new Error(`Invalid character ID: ${characterId}`);
      }

      // Prepare request body
      const requestBody = {
        text,
        reference_id: voice,
        speed: 1.0,
        pitch: 1.0
      };

      if (!process.env.FISH_API_KEY) {
        logger.error("Missing Fish API key");
        throw new Error('Fish API key not configured');
      }

      // Make request to Fish.audio API
      const fishResponse = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FISH_API_KEY}`,
          'Content-Type': 'application/msgpack'
        },
        body: pack(requestBody)
      });

      if (!fishResponse.ok) {
        const errorText = await fishResponse.text();
        logger.error("Fish.audio API error response", {
          status: fishResponse.status,
          statusText: fishResponse.statusText,
          error: errorText
        });
        throw new Error(`Fish.audio API error: ${fishResponse.status} ${fishResponse.statusText} - ${errorText}`);
      }

      // Get the audio data and return as base64
      const audioBuffer = await fishResponse.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      const audioUrl = `data:audio/mp3;base64,${base64Audio}`;

      logger.info("Successfully generated speech");
      return { audioUrl };
    } catch (error) {
      logger.error("Error in generateSpeech:", error);
      throw error;
    }
  }
);
