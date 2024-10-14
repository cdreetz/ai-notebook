import { NextResponse } from 'next/server';
import { PythonShell } from 'python-shell';

export async function POST(req: Request) {
  const { code } = await req.json();

  try {
    const result = await PythonShell.runString(code, { 
      pythonOptions: ['-u'],
      pythonPath: 'python3', // Specify the Python interpreter
    });
    return NextResponse.json({ output: result.join('\n') });
  } catch (error) {
    console.error('Python execution error:', error);
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
