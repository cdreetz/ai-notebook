'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Cell, CellType } from '@/types/notebook';
import CellComponent from '@/components/CellComponent';
import Toolbar from '@/components/Toolbar';
import ChatComponent from '@/components/ChatComponent';
import { executePythonInBrowser } from '@/utils/pyodideWorker';
import { useTheme } from '@/contexts/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { NotebookWebSocket } from '@/app/lib/websocket';
import PackageManager from '@/components/PackageManager';

const NotebookComponent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [cells, setCells] = useState<Cell[]>([]);
  const [notebooks, setNotebooks] = useState<string[]>([]);
  const [currentNotebook, setCurrentNotebook] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [chatContext, setChatContext] = useState<string | null>(null);
  const [wsClient, setWsClient] = useState<NotebookWebSocket | null>(null);
  const [executingCellId, setExecutingCellId] = useState<string | null>(null);
  const [packageManagerOpen, setPackageManagerOpen] = useState(false);
  const [showPackageManager, setShowPackageManager] = useState(false);

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

  useEffect(() => {
    const loadPyodideScript = () => {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
      script.async = true;
      document.body.appendChild(script);
    };

    loadPyodideScript();
  }, []);

  useEffect(() => {
    const client = new NotebookWebSocket();
    
    client.onExecutionResult((result) => {
      setCells(prevCells => 
        prevCells.map(cell => {
          if (cell.id === executingCellId) {
            return {
              ...cell,
              output: result.status === 'success' ? result.output : result.error
            };
          }
          return cell;
        })
      );
    });
    
    setWsClient(client);
    
    return () => {
      if (client) {
        client.close();
      }
    };
  }, []);

  useEffect(() => {
    if (wsClient && executingCellId) {
      wsClient.onExecutionResult((result) => {
        setCells(prevCells => 
          prevCells.map(cell => {
            if (cell.id === executingCellId) {
              return {
                ...cell,
                output: result.status === 'success' ? result.output : result.error
              };
            }
            return cell;
          })
        );
      });
    }
  }, [executingCellId]);

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

  const saveNotebook = async () => {
    if (newNotebookName) {
      try {
        const response = await fetch('/api/filesystem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: newNotebookName, content: cells }),
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
        const loadedCells = await response.json();
        setCells(loadedCells);
        setCurrentNotebook(filename);
      } else {
        console.error('Failed to load notebook');
      }
    } catch (error) {
      console.error('Error loading notebook:', error);
    }
  };

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
    if (cell && cell.type === 'code' && wsClient) {
      setExecutingCellId(id);
      
      setCells(prevCells =>
        prevCells.map(c => c.id === id ? { ...c, output: 'Executing...' } : c)
      );
      
      wsClient.executeCode(cell.content);
    }
  };

  const addContextToChat = (content: string, type: 'code' | 'output') => {
    const contextPrefix = type === 'code' ? 'Code:\n' : 'Output:\n';
    setChatContext(`${contextPrefix}${content}`);
  };

  const clearChatContext = () => {
    setChatContext(null);
  };

  const themeStyles = {
    background: theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white',
    nav: theme === 'dark' ? 'bg-[#242424] border-[#333333]' : 'bg-gray-100 border-gray-200',
    text: theme === 'dark' ? 'text-gray-100' : 'text-gray-900',
    border: theme === 'dark' ? 'border-[#333333]' : 'border-gray-200',
    input: theme === 'dark' ? 'bg-[#1a1a1a] border-[#333333]' : 'bg-white border-gray-200',
    cell: theme === 'dark' ? 'bg-[#242424]' : 'bg-gray-50',
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${themeStyles.background} ${themeStyles.text}`}>
      <nav className={`border-b p-4 z-10 ${themeStyles.nav}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">AI Notebook</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowPackageManager(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Manage Packages
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg hover:bg-opacity-80 transition-colors ${
                theme === 'dark' ? 'bg-[#333333]' : 'bg-gray-200'
              }`}
            >
              {theme === 'dark' ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
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
      {showPackageManager && (
        <PackageManager
          onClose={() => setShowPackageManager(false)}
          wsClient={wsClient}
        />
      )}
    </div>
  );
};

export default NotebookComponent;

