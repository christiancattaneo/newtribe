import * as dotenv from 'dotenv';
import { generateResponse } from '../index';

dotenv.config();

async function testChat() {
  const testCases = [
    {
      message: "What do you think about electric cars?",
      characterId: "elon_musk"
    },
    {
      message: "How's the economy doing?",
      characterId: "donald_trump"
    },
    {
      message: "Tell me about your plans for America",
      characterId: "joe_biden"
    },
    {
      message: "Do you like working at the Krusty Krab?",
      characterId: "spongebob"
    }
  ];

  console.log("Starting chat response tests...\n");

  for (const test of testCases) {
    console.log(`Testing with message: "${test.message}" for character: ${test.characterId}`);
    try {
      const response = await generateResponse(test.message, test.characterId);
      console.log("Response:", response);
      console.log("\n---\n");
    } catch (error) {
      console.error(`Error testing ${test.characterId}:`, error);
    }
  }
}

testChat().catch(console.error); 