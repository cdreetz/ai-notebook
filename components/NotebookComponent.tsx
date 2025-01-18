'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Cell, CellType, NotebookState } from '@/types/notebook';
import { NotebookService } from '@/services/notebookService';
import CellComponent from '@/components/CellComponent';
import Toolbar from '@/components/Toolbar';
import ChatComponent from '@/components/ChatComponent';
import { useTheme } from '@/contexts/ThemeContext';

const NotebookComponent: React.FC = () => {
  const { theme } = useTheme();
  const [cells, setCells] = useState<Cell[]>([]);
  const [notebooks, setNotebooks] = useState<string[]>([]);
  const [currentNotebook, setCurrentNotebook] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [chatContext, setChatContext] = useState<string | null>(null);
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [notebookId] = useState(() => uuidv4());
  const [notebookState, setNotebookState] = useState<NotebookState>({
    variables: {},
    methods: [],
    imports: []
  });
  const [showEnvDialog, setShowEnvDialog] = useState(false);

  useEffect(() => {
    fetchNotebooks();
    const savedCells = localStorage.getItem('notebookCells');
    if (savedCells) {
      setCells(JSON.parse(savedCells));
    } else {
      setCells([{ id: uuidv4(), type: 'code', content: '', output: '' }]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('notebookCells', JSON.stringify(cells));
  }, [cells]);

  const fetchNotebooks = async () => {
    try {
      const response = await fetch('/api/filesystem');
      if (response.ok) {
        const notebookList = await response.json();
        setNotebooks(notebookList);
      } else {
        console.error('Failed to fetch notebooks');
      }
    } catch (error) {
      console.error('Error fetching notebooks:', error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeCellId) return;

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'b') {
        e.preventDefault();
        addCell('code');
      }
      
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 't') {
        e.preventDefault();
        addCell('markdown');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeCellId, cells]);

  const saveNotebook = async () => {
    if (newNotebookName) {
      try {
        const response = await fetch('/api/filesystem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            filename: newNotebookName, 
            content: {
              cells,
              state: notebookState,
              metadata: {
                id: notebookId,
                name: newNotebookName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            }
          }),
        });
        if (response.ok) {
          setCurrentNotebook(newNotebookName);
          fetchNotebooks();
          setShowSaveDialog(false);
          setNewNotebookName('');
        } else {
          console.error('Failed to save notebook');
        }
      } catch (error) {
        console.error('Error saving notebook:', error);
      }
    }
  };

  const loadNotebook = async (filename: string) => {
    try {
      const response = await fetch(`/api/filesystem?filename=${filename}`);
      if (response.ok) {
        const notebook = await response.json();
        setCells(notebook.cells);
        setNotebookState(notebook.state);
        setCurrentNotebook(filename);
      } else {
        console.error('Failed to load notebook');
      }
    } catch (error) {
      console.error('Error loading notebook:', error);
    }
  };

  const addCell = (type: CellType) => {
    const newCellId = uuidv4();
    setCells(prevCells => {
      const activeIndex = prevCells.findIndex(cell => cell.id === activeCellId);
      const insertIndex = activeIndex !== -1 ? activeIndex + 1 : prevCells.length;
      
      return [
        ...prevCells.slice(0, insertIndex),
        { id: newCellId, type, content: '', output: '', hasBeenExecuted: false },
        ...prevCells.slice(insertIndex)
      ];
    });
    
    setActiveCellId(newCellId);
    
    setTimeout(() => {
      const element = document.getElementById(`cell-${newCellId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const updateCellContent = (id: string, content: string, clearOutput?: boolean) => {
    setCells(prevCells => 
      prevCells.map(cell => cell.id === id ? { 
        ...cell, 
        content,
        output: clearOutput ? '' : cell.output 
      } : cell)
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
        // Set executing state
        setCells(prevCells => 
          prevCells.map(c => c.id === id ? { 
            ...c, 
            isExecuting: true
          } : c)
        );

        // Execute cell using notebook service
        const { result } = await NotebookService.executeCell(cell, notebookState);

        // Update cell state
        setCells(prevCells => 
          prevCells.map(c => c.id === id ? { 
            ...c, 
            output: result.output,
            rawOutput: result.rawOutput,
            hasBeenExecuted: true,
            isExecuting: false,
            error: result.error
          } : c)
        );
      } catch (error) {
        console.error('Error executing cell:', error);
        setCells(prevCells => 
          prevCells.map(c => c.id === id ? { 
            ...c, 
            output: '',
            error: error instanceof Error ? error.message : 'Error executing cell',
            hasBeenExecuted: true,
            isExecuting: false
          } : c)
        );
      }
    }
  };

  const addContextToChat = (content: string, type: 'code' | 'output') => {
    const contextPrefix = type === 'code' ? 'Code:\n' : 'Output:\n';
    setChatContext(`${contextPrefix}${content}`);
  };

  const clearChatContext = () => {
    setChatContext(null);
  };

  const handleSetActiveCell = (id: string) => {
    setActiveCellId(id);
  };

  const moveToCell = (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < cells.length) {
      const targetCell = cells[targetIndex];
      setActiveCellId(targetCell.id);
    }
  };

  // Group variables by type for better organization
  const groupVariables = () => {
    const groups: { [key: string]: { [key: string]: string } } = {
      numbers: {},
      strings: {},
      arrays: {},
      other: {}
    };

    Object.entries(notebookState.variables).forEach(([key, value]) => {
      if (value.startsWith('[') && value.endsWith(']')) {
        groups.arrays[key] = value;
      } else if (value.match(/^-?\d*\.?\d+$/)) {
        groups.numbers[key] = value;
      } else if (value.startsWith("'") || value.startsWith('"')) {
        groups.strings[key] = value;
      } else {
        groups.other[key] = value;
      }
    });

    return groups;
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'} ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
      <nav className={`border-b p-4 z-10 ${theme === 'dark' ? 'bg-[#242424] border-[#333333]' : 'bg-gray-100 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">AI Notebook</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowEnvDialog(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              title="View current environment variables and methods"
            >
              View Environment
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
            >
              Save Notebook
            </button>
            <select
              onChange={(e) => loadNotebook(e.target.value)}
              value={currentNotebook}
              className={`px-4 py-2 border rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-[#333333]' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <option value="">Select a notebook</option>
              {notebooks.map((notebook) => (
                <option key={notebook} value={notebook}>
                  {notebook}
                </option>
              ))}
            </select>
          </div>
        </div>
      </nav>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[70%] p-6 overflow-y-auto">
          <Toolbar onAddCell={addCell} />
          <div className="space-y-4">
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
                addContextToChat={addContextToChat}
                isActive={cell.id === activeCellId}
                setActiveCell={handleSetActiveCell}
              />
            ))}
          </div>
        </div>
        <div className="w-[30%] border-gray-200">
          <ChatComponent contextToAdd={chatContext} clearContext={clearChatContext} />
        </div>
      </div>
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="bg-[#242424] p-6 rounded-lg border border-[#333333] shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-white">Save Notebook</h2>
            <input
              type="text"
              value={newNotebookName}
              onChange={(e) => setNewNotebookName(e.target.value)}
              placeholder="Enter notebook name"
              className="w-full p-2 bg-[#1a1a1a] border border-[#333333] rounded mb-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveNotebook}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {showEnvDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className={`${theme === 'dark' ? 'bg-[#242424]' : 'bg-gray-50'} p-6 rounded-lg border ${theme === 'dark' ? 'border-[#333333]' : 'border-gray-200'} shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Current Environment</h2>
              <button
                onClick={() => setShowEnvDialog(false)}
                className="p-2 hover:bg-opacity-80 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Methods Section */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-blue-500">Methods</h3>
                <div className="grid grid-cols-2 gap-2">
                  {notebookState.methods.map(method => (
                    <div 
                      key={method}
                      className="p-2 bg-opacity-10 bg-blue-500 rounded"
                    >
                      {method}()
                    </div>
                  ))}
                </div>
              </div>

              {/* Variables Sections */}
              {Object.entries(groupVariables()).map(([groupName, variables]) => {
                if (Object.keys(variables).length === 0) return null;
                
                return (
                  <div key={groupName}>
                    <h3 className="text-lg font-semibold mb-2 capitalize text-emerald-500">
                      {groupName}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(variables).map(([key, value]) => (
                        <div 
                          key={key}
                          className="p-2 bg-opacity-10 bg-emerald-500 rounded flex justify-between"
                        >
                          <span className="font-medium">{key}</span>
                          <span className="text-gray-400">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotebookComponent;

