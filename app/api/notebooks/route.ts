import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { Notebook } from '@/types/notebook';

const NOTEBOOKS_DIR = path.join(process.cwd(), 'notebooks');

// Ensure notebooks directory exists
async function ensureNotebooksDir() {
  try {
    await fs.access(NOTEBOOKS_DIR);
  } catch {
    await fs.mkdir(NOTEBOOKS_DIR, { recursive: true });
  }
}

// GET /api/notebooks
export async function GET() {
  try {
    await ensureNotebooksDir();
    const files = await fs.readdir(NOTEBOOKS_DIR);
    const notebooks = files.filter(file => file.endsWith('.json'));
    return NextResponse.json({ notebooks });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list notebooks' }, { status: 500 });
  }
}

// POST /api/notebooks
export async function POST(request: Request) {
  try {
    const notebook: Notebook = await request.json();
    await ensureNotebooksDir();
    
    // Ensure filename has .json extension
    const filename = notebook.name.endsWith('.json') 
      ? notebook.name 
      : `${notebook.name}.json`;
      
    const filepath = path.join(NOTEBOOKS_DIR, filename);
    
    // Save the notebook
    await fs.writeFile(filepath, JSON.stringify(notebook, null, 2));
    
    return NextResponse.json({ message: 'Notebook saved successfully', filename });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save notebook' }, { status: 500 });
  }
} 