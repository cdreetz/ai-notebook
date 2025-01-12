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
import NotebookContext from '@/components/NotebookContext';

const NotebookComponent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [cells, setCells] = useState<Cell[]>([{ 
    id: uuidv4(), 
    type: 'code', 
    content: '', 
    output: '' 
  }]);
  const [notebooks, setNotebooks] = useState<string[]>([]);
  const [currentNotebook, setCurrentNotebook] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [chatContext, setChatContext] = useState<string | null>(null);
  const [wsClient, setWsClient] = useState<NotebookWebSocket | null>(null);
  const [executingCellId, setExecutingCellId] = useState<string | null>(null);
  const [packageManagerOpen, setPackageManagerOpen] = useState(false);
  const [showPackageManager, setShowPackageManager] = useState(false);
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [notebookContext, setNotebookContext] = useState<{
    methods: {
      name: string;
      inputs: string[];
      output: string;
      description: string;
    }[];
    variables: { [key: string]: string };
  }>({
    methods: [],
    variables: {}
  });
  const [showContextDialog, setShowContextDialog] = useState(false);

  const fetchNotebooks = async () => {
    try {
      const response = await fetch('/api/notebooks');
      if (!response.ok) throw new Error('Failed to fetch notebooks');
      
      const data = await response.json();
      setNotebooks(data.notebooks);
    } catch (error) {
      console.error('Error fetching notebooks:', error);
    }
  };

  useEffect(() => {
    fetchNotebooks();
  }, []);

  useEffect(() => {
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
            if (result.status === 'success' && !result.output && result.display_data) {
              return {
                ...cell,
                output: result.display_data
              };
            }
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
              if (result.status === 'success') {
                let formattedOutput = result.output;
                
                // Handle matplotlib display_data
                if (result.display_data) {
                  return {
                    ...cell,
                    output: result.display_data
                  };
                }

                // Only try to format if output is a string
                if (typeof result.output === 'string') {
                  formattedOutput = result.output
                    .replace(/\\n/g, '\n')
                    .replace(/\\t/g, '\t')
                    .replace(/\\'/g, "'")
                    .replace(/\\"/g, '"');
                }
                
                return {
                  ...cell,
                  output: formattedOutput
                };
              } else {
                return {
                  ...cell,
                  output: result.error || 'Error executing cell'
                };
              }
            }
            return cell;
          })
        );
      });
    }
  }, [executingCellId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (activeCellId) {
          const cell = cells.find(c => c.id === activeCellId);
          if (cell && cell.type === 'code' && cell.content.trim()) {
            executeCell(activeCellId);
            event.stopPropagation();
            return false;
          }
        }
      }
      
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'b') {
        event.preventDefault();
        addCell('code');
      }
      
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 't') {
        event.preventDefault();
        addCell('markdown');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeCellId, cells]);

  const saveNotebook = async () => {
    if (!newNotebookName.trim()) {
      alert('Please enter a notebook name');
      return;
    }

    const notebook = {
      id: uuidv4(),
      name: newNotebookName,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      cells: cells,
      metadata: {
        context: notebookContext
      }
    };

    try {
      const response = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notebook),
      });
      if (response.ok) {
        setCurrentNotebook(newNotebookName);
        fetchNotebooks();
        setShowSaveDialog(false);
        setNewNotebookName('');
      } else {
        alert('Failed to save notebook');
      }
    } catch (error) {
      console.error('Error saving notebook:', error);
      alert('Error saving notebook');
    }
  };

  const loadNotebook = async (filename: string) => {
    try {
      const response = await fetch(`/api/notebooks/${filename}`);
      if (response.ok) {
        const notebook = await response.json();
        setCells(notebook.cells);
        setCurrentNotebook(notebook.name);
        if (notebook.metadata?.context) {
          setNotebookContext(notebook.metadata.context);
        } else {
          setNotebookContext({
            methods: [],
            variables: {}
          });
        }
      } else {
        alert('Failed to load notebook');
      }
    } catch (error) {
      console.error('Error loading notebook:', error);
      alert('Error loading notebook');
    }
  };

  const addCell = (type: CellType) => {
    const newCellId = uuidv4();
    setCells(prevCells => {
      const activeIndex = prevCells.findIndex(cell => cell.id === activeCellId);
      
      const insertIndex = activeIndex !== -1 ? activeIndex + 1 : prevCells.length;
      
      const newCells = [
        ...prevCells.slice(0, insertIndex),
        { id: newCellId, type, content: '', output: '' },
        ...prevCells.slice(insertIndex)
      ];
      
      return newCells;
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
    if (cell && cell.type === 'code' && wsClient) {
      setExecutingCellId(id);
      
      setCells(prevCells =>
        prevCells.map(c => c.id === id ? { ...c, output: 'Executing...' } : c)
      );
      
      const codeToExecute = cell.content.trimEnd();
      wsClient.executeCode(codeToExecute);
      
      // Match function definitions with docstrings
      const functionRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)(?:\s*->\s*([^:]+))?\s*:(?:\s*['"]{3}([\s\S]*?)['"]{3})?/g;
      const matches = Array.from(cell.content.matchAll(functionRegex));
      
      if (matches.length > 0) {
        const newMethods = matches.map(match => ({
          name: match[1],
          inputs: match[2].split(',').map(param => param.trim()).filter(Boolean),
          output: match[3]?.trim() || '',
          description: match[4]?.trim() || ''
        }));
        
        // Update context, replacing existing methods with same name
        setNotebookContext(prev => {
          const updatedMethods = [...prev.methods];
          newMethods.forEach(newMethod => {
            const existingIndex = updatedMethods.findIndex(m => m.name === newMethod.name);
            if (existingIndex !== -1) {
              updatedMethods[existingIndex] = newMethod;
            } else {
              updatedMethods.push(newMethod);
            }
          });
          return {
            ...prev,
            methods: updatedMethods
          };
        });
      }
      
      // Track only module-level variables (not inside functions)
      const moduleVars: { [key: string]: string } = {};
      
      // Split into lines and process each line
      const lines = cell.content.split('\n');
      let insideFunction = false;
      
      for (const line of lines) {
        // Check if we're entering a function definition
        if (line.trim().startsWith('def ')) {
          insideFunction = true;
          continue;
        }
        
        // Check if we're exiting a function (line with no indentation)
        if (insideFunction && !line.startsWith(' ') && !line.startsWith('\t') && line.trim() !== '') {
          insideFunction = false;
        }
        
        // Only process unindented variable assignments outside of functions
        if (!insideFunction && !line.startsWith(' ') && !line.startsWith('\t')) {
          const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
          if (match) {
            const [_, name, value] = match;
            moduleVars[name.trim()] = value.trim();
          }
        }
      }
      
      if (Object.keys(moduleVars).length > 0) {
        setNotebookContext(prev => ({
          ...prev,
          variables: { ...prev.variables, ...moduleVars }
        }));
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

  const themeStyles = {
    background: theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white',
    nav: theme === 'dark' ? 'bg-[#242424] border-[#333333]' : 'bg-gray-100 border-gray-200',
    text: theme === 'dark' ? 'text-gray-100' : 'text-gray-900',
    border: theme === 'dark' ? 'border-[#333333]' : 'border-gray-200',
    input: theme === 'dark' ? 'bg-[#1a1a1a] border-[#333333]' : 'bg-white border-gray-200',
    cell: theme === 'dark' ? 'bg-[#242424]' : 'bg-gray-50',
    toolbar: theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-gray-50',
  };

  const setActiveCell = (id: string) => {
    setActiveCellId(id);
  };

  const moveToCell = (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < cells.length) {
      const targetCell = cells[targetIndex];
      setActiveCellId(targetCell.id);
    }
  };

  const handleAutoSave = () => {
    if (currentNotebook) {
      const notebook = {
        id: currentNotebook,
        name: currentNotebook,
        lastModified: new Date().toISOString(),
        cells: cells,
        metadata: {
          context: notebookContext
        }
      };
      fetch(`/api/notebooks/${currentNotebook}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notebook),
      });
    }
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${themeStyles.background} ${themeStyles.text}`}>
      <nav className={`border-b p-4 z-10 ${themeStyles.nav}`}>
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold">AI Notebook</h1>
        </div>
      </nav>
      
      <div className={`border-b border-gray-400`}>
        <div className="px-4 py-2">
          <Toolbar
            onAddCell={addCell}
            onSaveNotebook={() => {
              if (!currentNotebook) {
                setShowSaveDialog(true);
              } else {
                const notebook = {
                  id: currentNotebook,
                  name: currentNotebook,
                  lastModified: new Date().toISOString(),
                  cells: cells,
                  metadata: {
                    context: notebookContext
                  }
                };
                fetch(`/api/notebooks/${currentNotebook}.json`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(notebook),
                }).then(response => {
                  if (response.ok) {
                    fetchNotebooks();
                  } else {
                    alert('Failed to save notebook');
                  }
                }).catch(error => {
                  console.error('Error saving notebook:', error);
                  alert('Error saving notebook');
                });
              }
            }}
            onCreateNewNotebook={() => {
              setCells([{ id: uuidv4(), type: 'code', content: '', output: '' }]);
              setCurrentNotebook('');
              setNotebookContext({ methods: [], variables: {} });
            }}
            onSelectNotebook={loadNotebook}
            onManagePackages={() => setShowPackageManager(true)}
            notebooks={notebooks}
            currentNotebook={currentNotebook}
            setShowContextDialog={setShowContextDialog}
            notebook={{
              id: currentNotebook,
              name: currentNotebook,
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              cells: cells
            }}
            setShowSaveDialog={setShowSaveDialog}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[70%] p-6 overflow-y-auto">
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
                setActiveCell={setActiveCell}
                moveToPreviousCell={() => moveToCell(index, 'up')}
                moveToNextCell={() => moveToCell(index, 'down')}
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
      {showContextDialog && (
        <NotebookContext
          context={notebookContext}
          onClose={() => setShowContextDialog(false)}
        />
      )}
    </div>
  );
};

export default NotebookComponent;

