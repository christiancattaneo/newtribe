import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

interface ProcessedDialogue {
  text: string;
  context?: string;
  metadata: {
    character_id: string;
    source?: string;
    date?: string;
    type: 'speech' | 'tweet' | 'dialogue';
    topics?: string[];
  };
}

interface TweetRecord {
  text: string;
  created_at: string;
}

// Helper function to clean and truncate text
function preprocessText(text: string): string {
  // Remove URLs
  text = text.replace(/https?:\/\/\S+/g, '');
  
  // Remove special characters and extra whitespace
  text = text.replace(/[^\w\s.,!?'"]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Truncate to ~1000 characters to keep token count manageable
  return text.slice(0, 1000);
}

// Process Trump's speeches
async function processTrumpSpeeches(filePath: string): Promise<ProcessedDialogue[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const speeches = content.split('SPEECH').filter(s => s.trim());
  
  return speeches.map(speech => ({
    text: preprocessText(speech.trim()),
    metadata: {
      character_id: 'donald_trump',
      type: 'speech',
      topics: extractTopics(speech)
    }
  }));
}

// Process Elon's tweets
async function processElonTweets(filePath: string): Promise<ProcessedDialogue[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true
  }) as TweetRecord[];

  return records.map(record => ({
    text: preprocessText(record.text.replace(/^b'|'$/g, '').replace(/\\xe2\\x80\\x99/g, "'")),
    metadata: {
      character_id: 'elon_musk',
      type: 'tweet',
      date: record.created_at,
      source: 'Twitter'
    }
  }));
}

// Process Biden's tweets
async function processBidenTweets(filePath: string): Promise<ProcessedDialogue[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const tweets = content.split('\n\n').filter(t => t.trim());
  
  return tweets.map(tweet => ({
    text: preprocessText(tweet.trim()),
    metadata: {
      character_id: 'joe_biden',
      type: 'tweet',
      source: 'Twitter'
    }
  }));
}

// Process Spongebob's dialogue
async function processSpongebobDialogue(filePath: string): Promise<ProcessedDialogue[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Remove RTF formatting
  const cleanContent = content.replace(/\{\*?\\[^{}]+\}|[{}]|\\[A-Za-z]+\s?/g, '');
  const dialogues = cleanContent.split('\n').filter(d => d.trim());
  
  return dialogues.map(dialogue => ({
    text: preprocessText(dialogue.trim()),
    metadata: {
      character_id: 'spongebob',
      type: 'dialogue',
      source: 'SpongeBob SquarePants'
    }
  }));
}

// Helper function to extract topics from text
function extractTopics(text: string): string[] {
  const commonTopics = [
    'economy', 'jobs', 'healthcare', 'immigration', 'foreign policy',
    'technology', 'climate', 'education', 'taxes', 'military'
  ];
  
  return commonTopics.filter(topic => 
    text.toLowerCase().includes(topic.toLowerCase())
  );
}

// Generate embeddings for the processed dialogues
async function generateEmbeddings(dialogues: ProcessedDialogue[]) {
  const index = pinecone.Index('character-chat-index');
  const batchSize = 20; // Reduced batch size to avoid token limit
  
  for (let i = 0; i < dialogues.length; i += batchSize) {
    const batch = dialogues.slice(i, i + batchSize);
    const batchIds = batch.map((dialogue, j) => `${dialogue.metadata.character_id}-${i + j}`);
    
    // Check which vectors already exist
    const existingVectors = await index.fetch(batchIds);
    const existingIds = batchIds.filter(id => existingVectors.records[id]);
    
    // Filter out dialogues that already have embeddings
    const newBatch = batch.filter((dialogue, j) => !existingIds.includes(batchIds[j]));
    
    if (newBatch.length === 0) {
      console.log(`Skipping batch ${Math.floor(i/batchSize) + 1} - all embeddings exist`);
      continue;
    }
    
    // Ensure texts are non-empty strings and properly formatted
    const validTexts = newBatch
      .map(d => d.text)
      .filter(text => text && typeof text === 'string' && text.trim().length > 0)
      .map(text => {
        // Clean the text to ensure it's a valid string
        const cleaned = text.trim()
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\s+/g, ' '); // Normalize whitespace
        return cleaned;
      });
    
    if (validTexts.length === 0) {
      console.log(`Skipping batch ${Math.floor(i/batchSize) + 1} - no valid texts`);
      continue;
    }
    
    console.log(`Generating embeddings for ${validTexts.length} new texts in batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(dialogues.length/batchSize)}...`);
    console.log('Sample text from batch:', validTexts[0].substring(0, 100));
    
    try {
      const embeddings = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: validTexts
      });
      
      const vectors = newBatch.filter((_, j) => j < validTexts.length).map((dialogue, j) => ({
        id: `${dialogue.metadata.character_id}-${i + j}`,
        values: embeddings.data[j].embedding,
        metadata: {
          ...dialogue.metadata,
          text: dialogue.text
        }
      }));
      
      await index.upsert(vectors);
      console.log(`Successfully uploaded ${vectors.length} new vectors in batch ${Math.floor(i/batchSize) + 1}`);
    } catch (error) {
      console.error(`Error processing batch ${Math.floor(i/batchSize) + 1}:`, error);
      // Continue with next batch
      continue;
    }
  }
}

async function main() {
  try {
    console.log('Processing character data...');
    
    const trumpDialogues = await processTrumpSpeeches(
      path.join(__dirname, '../../../src/data/raw/new_avatars/trump.txt')
    );
    console.log(`Processed ${trumpDialogues.length} Trump speeches`);
    
    const elonDialogues = await processElonTweets(
      path.join(__dirname, '../../../src/data/raw/new_avatars/ElonMusk.csv')
    );
    console.log(`Processed ${elonDialogues.length} Elon tweets`);
    
    const bidenDialogues = await processBidenTweets(
      path.join(__dirname, '../../../src/data/raw/new_avatars/JoeBidenTweets.txt')
    );
    console.log(`Processed ${bidenDialogues.length} Biden tweets`);
    
    const spongebobDialogues = await processSpongebobDialogue(
      path.join(__dirname, '../../../src/data/raw/new_avatars/spongebob.rtf')
    );
    console.log(`Processed ${spongebobDialogues.length} Spongebob dialogues`);
    
    const allDialogues = [
      ...trumpDialogues,
      ...elonDialogues,
      ...bidenDialogues,
      ...spongebobDialogues
    ];
    
    console.log('Generating embeddings and uploading to Pinecone...');
    await generateEmbeddings(allDialogues);
    
    console.log('Successfully processed all character data!');
  } catch (error) {
    console.error('Error processing character data:', error);
  }
}

main(); 