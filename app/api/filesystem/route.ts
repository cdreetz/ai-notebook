import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for notebooks
let notebooks: { [key: string]: any } = {};

export async function GET(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get('filename');
  if (filename) {
    return NextResponse.json(notebooks[filename] || null);
  }
  return NextResponse.json(Object.keys(notebooks));
}

export async function POST(request: NextRequest) {
  try {
    const { filename, content } = await request.json();
    if (!filename || !content) {
      return NextResponse.json({ error: 'Filename and content are required' }, { status: 400 });
    }
    notebooks[filename] = content;
    return NextResponse.json({ message: 'Notebook saved successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Error saving notebook' }, { status: 500 });
  }
}
