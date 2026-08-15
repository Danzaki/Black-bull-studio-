import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const memeTemplates = [
      `🐂 "Nobody believes in $ANSEM until it does 100x." - Legendary Bull ${prompt ? `(${prompt})` : ''} 🚀 #BullRun`,
      `Me explaining to my family why $ANSEM is the future of Web3 memes 📈🔥 ${prompt || ''}`,
      `Bulls don't sleep when $ANSEM is cooking! 🐂💎 Keep holding! ${prompt || ''}`,
      `Paper hands sold, Real Bulls bought the dip! 🐂🚀 ${prompt ? `Topic: ${prompt}` : ''}`,
      `When $ANSEM pumps 50% in 1 hour: "It's just the beginning!" 🔥🐂`,
    ];

    const randomMeme = memeTemplates[Math.floor(Math.random() * memeTemplates.length)];

    return NextResponse.json({ meme: randomMeme });
  } catch (error) {
    return NextResponse.json({ meme: '🐂 $ANSEM to the moon! 🚀' });
  }
}
