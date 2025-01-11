import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { Notebook } from '@/types/notebook';

const NOTEBOOKS_DIR = path.join(process.cwd(), 'notebooks');

// GET /api/notebooks/[filename]
export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const filepath = path.join(NOTEBOOKS_DIR, params.filename);
    const content = await fs.readFile(filepath, 'utf-8');
    const notebook = JSON.parse(content);
    return NextResponse.json(notebook);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load notebook' }, 
      { status: 500 }
    );
  }
}

// PUT /api/notebooks/[filename]
export async function PUT(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const notebook: Notebook = await request.json();
    const filepath = path.join(NOTEBOOKS_DIR, params.filename);
    await fs.writeFile(filepath, JSON.stringify(notebook, null, 2));
    return NextResponse.json({ message: 'Notebook updated successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update notebook' }, 
      { status: 500 }
    );
  }
} 