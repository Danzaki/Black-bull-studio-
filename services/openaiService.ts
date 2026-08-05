import OpenAI from 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  throw new Error('Missing OPENAI_API_KEY environment variable.');
}

export const openai = new OpenAI({ apiKey: openaiApiKey });

export async function createCompletion(prompt: string) {
  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
  });

  return response.output_text ?? '';
}
