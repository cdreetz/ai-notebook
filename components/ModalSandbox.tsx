'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSandbox } from '@/contexts/SandboxContext';

interface PackageManagerProps {
  onClose: () => void;
  onSandboxCreated?: (sandboxId: string) => void;
}

interface EnvInfo {
  venv_path?: string;
  python_version?: string;
  packages?: string;
}

const ModalSandbox: React.FC<PackageManagerProps> = ({ onClose, onSandboxCreated }) => {
  const { theme } = useTheme();
  const { sandboxId, setSandboxId, envInfo, setEnvInfo } = useSandbox();
  const [packageName, setPackageName] = useState('');
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState('');
  const [creatingSandbox, setCreatingSandbox] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const createSandbox = async () => {
    setCreatingSandbox(true);
    setMessage('Creating sandbox...');
    
    try {
      const response = await fetch('/api/modal/sandbox/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_name: 'ai-notebook',
          image: 'debian:bullseye-slim'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSandboxId(data.sandboxId);
        setMessage('Sandbox created successfully!');
        await executeCommand('python3 --version');
        await executeCommand('pip3 list');
        onSandboxCreated?.(data.sandboxId);
      } else {
        setMessage(`Error: ${data.error || 'Failed to create sandbox'}`);
        setSandboxId(null);
      }
    } catch (error) {
      setMessage(`Error creating sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSandboxId(null);
    } finally {
      setCreatingSandbox(false);
    }
  };

  const executeCommand = async (command: string) => {
    if (!sandboxId) return;
    
    setIsLoading(true);
    try {
      console.log('Executing command:', command);
      const response = await fetch('/api/modal/sandbox/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sandbox_id: sandboxId,
          command: command
        }),
      });

      const data = await response.json();
      console.log('Full command execution response:', data);
      
      if (response.ok) {
        if (data.stderr) {
          console.error('Command stderr:', data.stderr);
        }
        if (data.stdout) {
          console.log('Command stdout:', data.stdout);
        }
        if (command.includes('python3 --version')) {
          setEnvInfo({
            ...envInfo,
            python_version: data.stdout?.trim()
          });
        } else if (command.includes('pip3 list')) {
          setEnvInfo({
            ...envInfo,
            packages: data.stdout
          });
        }
      } else {
        console.error('Command execution failed:', data);
        setMessage(`Error executing command: ${data.error || data.stderr || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Command execution error:', error);
      setMessage(`Error executing command: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const installPackage = async () => {
    if (!packageName || !sandboxId) return;
    
    setInstalling(true);
    setMessage('Installing package...');
    
    try {
      const response = await fetch('/api/modal/sandbox/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sandbox_id: sandboxId,
          command: `pip3 install ${packageName}`
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(`Successfully installed ${packageName}`);
        setPackageName('');
        await executeCommand('pip3 list');
      } else {
        setMessage(`Error: ${data.error || 'Failed to install package'}`);
      }
    } catch (error) {
      setMessage(`Error installing package: ${error}`);
    } finally {
      setInstalling(false);
    }
  };

  // Fetch environment info when component mounts or sandboxId changes
  useEffect(() => {
    if (sandboxId) {
      executeCommand('python3 --version && pip3 list');
    }
  }, [sandboxId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center">
      <div className={`${theme === 'dark' ? 'bg-[#242424]' : 'bg-white'} p-6 rounded-lg shadow-xl max-w-2xl w-full`}>
        <h2 className="text-xl font-semibold mb-4">Modal Sandbox</h2>
        
        {!sandboxId ? (
          <>
            {message && (
              <div className={`mb-4 p-3 rounded ${
                message.includes('Error') 
                  ? 'bg-red-900/30 text-red-200' 
                  : 'bg-green-900/30 text-green-200'
              }`}>
                {message}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
              <button
                onClick={createSandbox}
                disabled={creatingSandbox}
                className={`px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 
                  ${creatingSandbox && 'opacity-50 cursor-not-allowed'}`}
              >
                {creatingSandbox ? 'Creating Sandbox...' : 'Create New Sandbox'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`mb-4 p-4 rounded ${
              theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'
            }`}>
              <h3 className="text-sm font-semibold mb-2">Sandbox Information</h3>
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium">Sandbox ID:</span>{' '}
                  <span className="font-mono">{sandboxId}</span>
                </div>
                <div>
                  <span className="font-medium">Base Image:</span>{' '}
                  <span className="font-mono">debian-slim</span>
                </div>
                <div>
                  <span className="font-medium">Python Version:</span>{' '}
                  <span className="font-mono">
                    {isLoading ? 'Loading...' : envInfo.python_version || 'Not available'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Installed Packages:</span>
                  <div className="font-mono mt-1 max-h-32 overflow-y-auto">
                    {isLoading ? (
                      <div className="text-gray-500">Loading...</div>
                    ) : (
                      <pre className="text-xs whitespace-pre-wrap">
                        {envInfo.packages || 'No packages installed'}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2">Package Name</label>
                <input
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="e.g., pandas==2.0.0"
                  className={`w-full p-2 rounded border ${
                    theme === 'dark' 
                      ? 'bg-[#1a1a1a] border-[#333333]' 
                      : 'bg-white border-gray-200'
                  }`}
                />
              </div>

              {message && (
                <div className={`p-3 rounded ${
                  message.includes('Error') 
                    ? 'bg-red-900/30 text-red-200' 
                    : 'bg-green-900/30 text-green-200'
                }`}>
                  {message}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setSandboxId(null);
                    onClose();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete Sandbox
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Close
                </button>
                <button
                  onClick={installPackage}
                  disabled={installing || !packageName}
                  className={`px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 
                    ${(installing || !packageName) && 'opacity-50 cursor-not-allowed'}`}
                >
                  {installing ? 'Installing...' : 'Install Package'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModalSandbox; 