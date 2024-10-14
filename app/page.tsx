'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Cell, CellType } from '@/types/notebook';
import CellComponent from '@/components/CellComponent';
import Toolbar from '@/components/Toolbar';
import ChatComponent from '@/components/ChatComponent';

const NotebookPage: React.FC = () => {
  const [cells, setCells] = useState<Cell[]>([]);

  useEffect(() => {
    // Load cells from localStorage or start with a default cell
    const savedCells = localStorage.getItem('notebookCells');
    if (savedCells) {
      setCells(JSON.parse(savedCells));
    } else {
      setCells([{ id: uuidv4(), type: 'code', content: '', output: '' }]);
    }
  }, []);

  useEffect(() => {
    // Save cells to localStorage whenever they change
    localStorage.setItem('notebookCells', JSON.stringify(cells));
  }, [cells]);

  const addCell = (type: CellType) => {
    setCells(prevCells => [...prevCells, { id: uuidv4(), type, content: '', output: '' }]);
  };

  const updateCellContent = (id: string, content: string) => {
    setCells(prevCells => 
      prevCells.map(cell => cell.id === id ? { ...cell, content } : cell)
    );
  };

  const deleteCell = (id: string) => {
    setCells(prevCells => prevCells.filter(cell => cell.id !== id));
  };

  const moveCellUp = (index: number) => {
    if (index > 0) {
      setCells(prevCells => {
        const newCells = [...prevCells];
        [newCells[index - 1], newCells[index]] = [newCells[index], newCells[index - 1]];
        return newCells;
      });
    }
  };

  const moveCellDown = (index: number) => {
    if (index < cells.length - 1) {
      setCells(prevCells => {
        const newCells = [...prevCells];
        [newCells[index], newCells[index + 1]] = [newCells[index + 1], newCells[index]];
        return newCells;
      });
    }
  };

  const executeCell = async (id: string) => {
    const cell = cells.find(c => c.id === id);
    if (cell && cell.type === 'code') {
      try {
        const response = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: cell.content }),
        });
        const result = await response.json();
        if (response.ok) {
          setCells(prevCells => 
            prevCells.map(c => c.id === id ? { ...c, output: result.output } : c)
          );
        } else {
          throw new Error(result.error || 'Error executing cell');
        }
      } catch (error) {
        console.error('Error executing cell:', error);
        setCells(prevCells => 
          prevCells.map(c => c.id === id ? { ...c, output: error instanceof Error ? error.message : 'Error executing cell' } : c)
        );
      }
    }
  };

  return (
    <div className="bg-gray-100 text-gray-900 min-h-screen">
      <nav className="bg-white border-b border-gray-300 p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-semibold">AI Notebook</h1>
      </nav>
      <div className="flex">
        <div className="w-[70%] p-6">
          <Toolbar onAddCell={addCell} />
          {cells.map((cell, index) => (
            <CellComponent
              key={cell.id}
              cell={cell}
              index={index}
              updateContent={updateCellContent}
              executeCell={executeCell}
              deleteCell={deleteCell}
              moveCellUp={() => moveCellUp(index)}
              moveCellDown={() => moveCellDown(index)}
            />
          ))}
        </div>
        <div className="w-[30%] border-l border-gray-300 h-[calc(100vh-64px)] overflow-hidden">
          <ChatComponent />
        </div>
      </div>
    </div>
  );
};

export default NotebookPage;
