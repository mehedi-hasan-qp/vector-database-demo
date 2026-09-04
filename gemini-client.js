// Shared Gemini setup for the RAG steps (5-8), mirroring chroma-client.js's role.
import { GoogleGenAI } from "@google/genai";

// Hardcoded like the Chroma host/port - the API key is the one thing that
// must not be, since it's a secret. It comes from the environment instead.
export const MODEL_NAME = "gemini-2.5-flash";

export function createGeminiClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export async function generateAnswer(ai, systemPrompt, userMessage) {
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: userMessage,
    config: { systemInstruction: systemPrompt },
  });

  return response.text;
}

// Fails fast with an audience-readable message instead of letting the SDK
// throw a raw auth error mid-demo. Call this before any Gemini request.
export function requireApiKey() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }
}
