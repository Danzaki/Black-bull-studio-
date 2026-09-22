import { NextRequest, NextResponse } from 'next/server';
import { moderateContent } from '@/lib/moderateContent';

export async function POST(request: NextRequest) {
  const { text } = await request.json();
  const result = await moderateContent(text);
  return NextResponse.json(result);
}
