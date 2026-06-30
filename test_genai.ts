import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const chat = ai.chats.create({ 
    model: 'gemini-2.5-flash',
    config: {
      tools: [{ functionDeclarations: [{ name: 'test_func', description: 'test' }] }]
    }
  });
  const response = await chat.sendMessage({ message: [{ text: 'Call test_func' }] });
  console.log('Calls:', response.functionCalls);
  
  if (response.functionCalls && response.functionCalls.length > 0) {
    const call = response.functionCalls[0];
    const toolResp = await chat.sendMessage({
      message: [{
        functionResponse: { id: call.id, name: call.name, response: { success: true } }
      }]
    });
    console.log('Tool resp:', toolResp.text);
  }
}
run();
