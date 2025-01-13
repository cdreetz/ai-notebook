import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface PackageManagerProps {
  onClose: () => void;
  wsClient: any;
}

interface EnvInfo {
  venv_path?: string;
  python_version?: string;
  packages?: string;
}

const PackageManager: React.FC<PackageManagerProps> = ({ onClose, wsClient }) => {
  const { theme } = useTheme();
  const [packageName, setPackageName] = useState('');
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState('');
  const [envInfo, setEnvInfo] = useState<EnvInfo>({});
  const [installProgress, setInstallProgress] = useState<string[]>([]);
  const [installedPackages, setInstalledPackages] = useState<string>('');

  useEffect(() => {
    fetchEnvInfo();

    if (wsClient?.socket) {
      const handleOutput = (data: string) => {
        if (data.includes('PACKAGE_PROGRESS:')) {
          const progressMsg = data.replace('PACKAGE_PROGRESS:', '').trim();
          setInstallProgress(prev => [...prev, progressMsg]);
        } else if (data.includes('PACKAGE_ERROR:')) {
          const errorMsg = data.replace('PACKAGE_ERROR:', '').trim();
          setMessage(`Error: ${errorMsg}`);
          setInstalling(false);
        } else if (data.includes('PACKAGE_SUCCESS:')) {
          const successMsg = data.replace('PACKAGE_SUCCESS:', '').trim();
          setMessage(successMsg);
          setInstalling(false);
          setPackageName('');
          // Refresh package list
          fetchEnvInfo();
        }
      };

      // Listen for kernel messages
      const messageHandler = (msg: any) => {
        if (msg.msg_type === 'stream' && msg.content?.text) {
          handleOutput(msg.content.text);
        }
      };

      wsClient.socket.on('message', messageHandler);

      return () => {
        wsClient.socket.off('message', messageHandler);
      };
    }
  }, [wsClient]);

  const fetchEnvInfo = async () => {
    try {
      const response = await fetch('http://localhost:8000/list-packages');
      const data = await response.json();
      if (response.ok) {
        setEnvInfo(data);
      } else {
        console.error('Failed to fetch environment info:', data);
      }
    } catch (error) {
      console.error('Error fetching environment info:', error);
    }
  };

  // Add polling function to check if package is installed
  const checkPackageInstalled = async (pkgName: string) => {
    try {
      const response = await fetch('http://localhost:8000/list-packages');
      const data = await response.json();
      if (data.packages.includes(pkgName)) {
        setInstalling(false);
        setMessage(`Successfully installed ${pkgName}`);
        setPackageName('');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking package status:', error);
      return false;
    }
  };

  const installPackage = async () => {
    if (!packageName) return;
    
    setInstalling(true);
    setMessage('Installing package...');
    setInstallProgress([]);
    
    try {
      const response = await fetch('http://localhost:8000/install-package', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package_name: packageName,
          session_id: wsClient?.socket?.id
        }),
      });

      // Start polling for package installation
      const pollInterval = setInterval(async () => {
        const isInstalled = await checkPackageInstalled(packageName);
        if (isInstalled) {
          clearInterval(pollInterval);
        }
      }, 2000); // Check every 2 seconds

      // Clear polling after 5 minutes (timeout)
      setTimeout(() => {
        clearInterval(pollInterval);
        if (installing) {
          setInstalling(false);
          setMessage('Installation timed out. Please check the package list to verify installation.');
        }
      }, 300000);

    } catch (error) {
      setMessage(`Error installing package: ${error}`);
      setInstalling(false);
    }
  };

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
              <span className="font-medium">Virtual Environment:</span>{' '}
              <span className="font-mono">{envInfo.venv_path || 'Loading...'}</span>
            </div>
            <div>
              <span className="font-medium">Python Version:</span>{' '}
              <span className="font-mono">{envInfo.python_version || 'Loading...'}</span>
            </div>
            <div>
              <span className="font-medium">Installed Packages:</span>
              <div className="font-mono mt-1 max-h-32 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {envInfo.packages || 'Loading...'}
                </pre>
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

        {/* Add progress messages display */}
        {installing && installProgress.length > 0 && (
          <div className={`mt-4 p-3 rounded ${
            theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'
          }`}>
            <div className="text-sm font-mono max-h-40 overflow-y-auto">
              {installProgress.map((progress, index) => (
                <div key={index} className="py-1">
                  {progress}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackageManager; 