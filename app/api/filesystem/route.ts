import { NextRequest, NextResponse } from 'next/server';

// Define interface for notebook content
interface NotebookContent {
  content: string;
}

// In-memory storage for notebooks with specific type
const notebooks: Record<string, NotebookContent> = {};

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
    console.error('Error saving notebook:', error);
    let errorMessage = 'Error saving notebook';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
