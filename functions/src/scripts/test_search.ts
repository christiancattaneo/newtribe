import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

async function searchSimilarDialogues(query: string, characterId?: string, topK: number = 5) {
  const index = pinecone.Index('character-chat-index');
  
  // Generate embedding for the query
  const queryEmbedding = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query.trim(),
  });

  // Search Pinecone with optional character filter
  const searchRequest = {
    vector: queryEmbedding.data[0].embedding,
    topK,
    includeMetadata: true,
    filter: characterId ? {
      character_id: { $eq: characterId }
    } : undefined
  };

  const results = await index.query(searchRequest);
  return results.matches;
}

async function main() {
  // Test queries for different characters
  const queries = [
    { text: "What do you think about Tesla cars?", character: "elon_musk" },
    { text: "Tell me about the economy", character: "donald_trump" },
    { text: "How do you feel about SpaceX?", character: "elon_musk" },
    { text: "What's your favorite thing about Krusty Krab?", character: "spongebob" }
  ];

  for (const query of queries) {
    console.log(`\nQuery: "${query.text}" (Character: ${query.character})`);
    const results = await searchSimilarDialogues(query.text, query.character);
    
    console.log("Top similar dialogues:");
    results.forEach((match, i) => {
      const metadata = match.metadata as any;
      console.log(`\n${i + 1}. Score: ${match.score?.toFixed(4)}`);
      console.log(`Text: ${metadata.text}`);
      console.log(`Type: ${metadata.type}`);
      if (metadata.date) console.log(`Date: ${metadata.date}`);
    });
  }
}

main().catch(console.error); 