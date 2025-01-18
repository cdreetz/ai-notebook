import { NextResponse } from 'next/server';
import { PythonService } from '@/services/pythonService';

export async function POST(req: Request) {
  const { code } = await req.json();

  try {
    const result = await PythonService.executeCode(code);
    
    if (result.error) {
      return NextResponse.json(result, { status: 500 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      traceback: []
    }, { status: 500 });
  }
}
