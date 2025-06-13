'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSandbox } from '@/contexts/SandboxContext';

interface PackageManagerProps {
  onClose: () => void;
}

const PackageManager: React.FC<PackageManagerProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const { sandboxId, envInfo, setEnvInfo } = useSandbox();
  const [packageName, setPackageName] = useState('');
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchEnvInfo = async () => {
    if (!sandboxId) {
      console.log("[DEBUG] fetchEnvInfo: No sandboxId available");
      return;
    }
    
    console.log("[DEBUG] fetchEnvInfo: Starting with sandboxId:", sandboxId);
    setIsLoading(true);
    try {
      console.log("[DEBUG] fetchEnvInfo: Sending request to execute endpoint");
      const response = await fetch('/api/modal/sandbox/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sandbox_id: sandboxId,
          command: `python --version && pip list`
        }),
      });

      console.log("[DEBUG] fetchEnvInfo: Response status:", response.status);
      const data = await response.json();
      console.log("[DEBUG] fetchEnvInfo: Response data:", {
        stdout: data.stdout?.substring(0, 100) + (data.stdout?.length > 100 ? '...' : ''),
        stderr: data.stderr?.substring(0, 100) + (data.stderr?.length > 100 ? '...' : ''),
        exitCode: data.exitCode
      });
      
      if (response.ok) {
        console.log("[DEBUG] fetchEnvInfo: Parsing Python version and packages");
        const pythonVersion = data.stdout.split('\n')[0];
        const packages = data.stdout;
        console.log("[DEBUG] fetchEnvInfo: Parsed data:", {
          pythonVersion,
          packagesLength: packages?.length
        });
        
        setEnvInfo({
          python_version: pythonVersion,
          packages: packages
        });
        console.log("[DEBUG] fetchEnvInfo: Environment info updated");
      } else {
        console.error('[DEBUG] fetchEnvInfo: Failed to fetch environment info:', data);
        setMessage('Failed to fetch environment information');
      }
    } catch (error) {
      console.error('[DEBUG] fetchEnvInfo: Error:', error);
      setMessage('Error fetching environment information');
    } finally {
      setIsLoading(false);
      console.log("[DEBUG] fetchEnvInfo: Completed");
    }
  };

  const installPackage = async () => {
    if (!packageName || !sandboxId) {
      console.log("[DEBUG] installPackage: Missing packageName or sandboxId", { packageName, sandboxId });
      return;
    }
    
    console.log("[DEBUG] installPackage: Starting installation of", packageName);
    setInstalling(true);
    setMessage('Installing package...');
    
    try {
      console.log("[DEBUG] installPackage: Sending request to execute endpoint");
      const response = await fetch('/api/modal/sandbox/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sandbox_id: sandboxId,
          command: `pip install ${packageName}`
        }),
      });

      console.log("[DEBUG] installPackage: Response status:", response.status);
      const data = await response.json();
      console.log("[DEBUG] installPackage: Response data:", {
        stdout: data.stdout?.substring(0, 100) + (data.stdout?.length > 100 ? '...' : ''),
        stderr: data.stderr?.substring(0, 100) + (data.stderr?.length > 100 ? '...' : ''),
        exitCode: data.exitCode
      });
      
      if (response.ok) {
        console.log("[DEBUG] installPackage: Package installed successfully");
        setMessage(`Successfully installed ${packageName}`);
        setPackageName('');
        console.log("[DEBUG] installPackage: Refreshing package list");
        await fetchEnvInfo();
      } else {
        console.error('[DEBUG] installPackage: Failed to install package:', data);
        setMessage(`Error: ${data.error || 'Failed to install package'}`);
      }
    } catch (error) {
      console.error('[DEBUG] installPackage: Error:', error);
      setMessage(`Error installing package: ${error}`);
    } finally {
      setInstalling(false);
      console.log("[DEBUG] installPackage: Completed");
    }
  };

  // Fetch environment info when component mounts and when sandboxId changes
  useEffect(() => {
    console.log("[DEBUG] useEffect: sandboxId changed to:", sandboxId);
    if (sandboxId) {
      console.log("[DEBUG] useEffect: Calling fetchEnvInfo");
      fetchEnvInfo();
    }
  }, [sandboxId]);

  if (!sandboxId) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center">
        <div className={`${theme === 'dark' ? 'bg-[#242424]' : 'bg-white'} p-6 rounded-lg shadow-xl max-w-2xl w-full`}>
          <h2 className="text-xl font-semibold mb-4">Package Manager</h2>
          <p className="mb-4">No sandbox is currently active. Please create a sandbox first.</p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center">
      <div className={`${theme === 'dark' ? 'bg-[#242424]' : 'bg-white'} p-6 rounded-lg shadow-xl max-w-2xl w-full`}>
        <h2 className="text-xl font-semibold mb-4">Package Manager</h2>
        
        {/* Environment Info Section */}
        <div className={`mb-6 p-4 rounded ${
          theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'
        }`}>
          <h3 className="text-sm font-semibold mb-2">Environment Information</h3>
          <div className="text-sm space-y-1">
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
      </div>
    </div>
  );
};

export default PackageManager; 