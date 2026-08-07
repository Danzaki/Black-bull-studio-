import type { AIStyle } from "./promptBuilder";

const stylePrompts: Record<AIStyle, string> = {
  Luxury:
    "premium luxury aesthetic, elegant composition, gold accents, cinematic lighting, ultra high-end branding",

  Cyberpunk:
    "futuristic cyberpunk city, neon lights, glowing reflections, sci-fi atmosphere",

  Meme:
    "viral internet meme style, expressive, funny, bold composition",

  Anime:
    "anime illustration, vibrant colors, cel shading, manga-inspired artwork",

  Realistic:
    "photorealistic, DSLR quality, ultra detailed, natural lighting",

  "Pixel Art":
    "retro pixel art, 8-bit style, game-inspired graphics",
};

export function getStylePrompt(style: AIStyle): string {
  return stylePrompts[style];
}

