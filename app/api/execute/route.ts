import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';

const execAsync = promisify(exec);

export async function POST(req: Request) {
  const { code } = await req.json();

  try {
    // Write the Python code to a temporary file
    const tempFile = `/tmp/python_code_${Date.now()}.py`;
    await fs.writeFile(tempFile, code);

    // Execute the Python code
    const { stdout, stderr } = await execAsync(`python3 ${tempFile}`);

    // Clean up the temporary file
    await fs.unlink(tempFile);

    if (stderr) {
      console.error('Python execution error:', stderr);
      return NextResponse.json({ error: stderr }, { status: 500 });
    }

    console.log('Python execution output:', stdout);
    return NextResponse.json({ output: stdout });
  } catch (error) {
    console.error('Execution error:', error);
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
