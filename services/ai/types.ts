export type AIProvider = "OpenAI" | "Gemini" | "Flux";

export interface AIRequest {
  prompt: string;
  style: string;
  aspectRatio: string;
}

export interface AIResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}
