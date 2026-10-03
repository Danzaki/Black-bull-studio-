export interface GenerateImageOptions {
  prompt: string;
  style: string;
  aspectRatio: string;
}

export interface GenerateImageResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  try {
    const encodedPrompt = encodeURIComponent(`${options.prompt}. The main and only subject is: ${options.prompt}. ${options.style} style, high quality`);

    // Ratios
    let width = 1024;
    let height = 1024;
    if (options.aspectRatio === "16:9") {
      width = 1280;
      height = 720;
    } else if (options.aspectRatio === "9:16") {
      width = 720;
      height = 1280;
    } else if (options.aspectRatio === "4:5") {
      width = 1024;
      height = 1280;
    }

    const seed = Math.floor(Math.random() * 1000000);
    const generatedUrl = `/api/ai/image?prompt=${encodedPrompt}&width=${width}&height=${height}&seed=${seed}`;

    return {
      success: true,
      imageUrl: generatedUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to generate image",
    };
  }
}
