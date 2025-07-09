import OpenAI from "openai";
import type { Character } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export async function generateAIResponse(userMessage: string, character: Character): Promise<string> {
  try {
    const systemPrompt = `You are ${character.name}, ${character.title}. 

Character Description: ${character.description}

Personality and Background: ${character.personality}

Instructions:
- Stay completely in character at all times
- Respond as ${character.name} would, using their personality, speaking style, and background
- Keep responses conversational and engaging
- Don't break character or mention that you're an AI
- Responses should be 1-3 sentences typically, unless the conversation naturally calls for longer responses
- Match the tone and style described in the character's personality
- Reference the character's background and expertise when relevant
- Be helpful and engaging while maintaining the character's unique voice

Previous context: This is an ongoing conversation where you are ${character.name}.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      max_tokens: 300,
      temperature: 0.8,
    });

    const aiResponse = response.choices[0].message.content;
    
    if (!aiResponse) {
      throw new Error("No response generated from OpenAI");
    }

    return aiResponse.trim();
  } catch (error) {
    console.error("OpenAI API Error:", error);
    // Fallback logic goes here
    throw error;
  }
}
