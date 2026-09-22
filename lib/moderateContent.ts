import OpenAI from 'openai';

export async function moderateContent(text: string): Promise<{ flagged: boolean; reason?: string }> {
  if (!text || !text.trim()) return { flagged: false };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Missing OPENAI_API_KEY for moderation');
    return { flagged: false };
  }

  try {
    const openai = new OpenAI({ apiKey });
    const result = await openai.moderations.create({
      model: 'omni-moderation-latest',
      input: text,
    });

    const output = result.results[0];
    if (output.flagged) {
      const categories = Object.entries(output.categories)
        .filter(([, isFlagged]) => isFlagged)
        .map(([category]) => category);
      return { flagged: true, reason: categories.join(', ') };
    }

    return { flagged: false };
  } catch (err) {
    console.error('Moderation check failed:', err);
    return { flagged: false };
  }
}
