'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SandboxContextType {
  sandboxId: string | null;
  setSandboxId: (id: string | null) => void;
  envInfo: {
    python_version?: string;
    packages?: string;
  };
  setEnvInfo: (info: { python_version?: string; packages?: string }) => void;
}

const SandboxContext = createContext<SandboxContextType | undefined>(undefined);

export function SandboxProvider({ children }: { children: React.ReactNode }) {
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [envInfo, setEnvInfo] = useState<{ python_version?: string; packages?: string }>({});

  // Load sandbox ID from localStorage on mount
  useEffect(() => {
    const savedSandboxId = localStorage.getItem('sandboxId');
    if (savedSandboxId) {
      setSandboxId(savedSandboxId);
    }
  }, []);

  // Save sandbox ID to localStorage when it changes
  useEffect(() => {
    if (sandboxId) {
      localStorage.setItem('sandboxId', sandboxId);
    } else {
      localStorage.removeItem('sandboxId');
    }
  }, [sandboxId]);

  return (
    <SandboxContext.Provider value={{ sandboxId, setSandboxId, envInfo, setEnvInfo }}>
      {children}
    </SandboxContext.Provider>
  );
}

export function useSandbox() {
  const context = useContext(SandboxContext);
  if (context === undefined) {
    throw new Error('useSandbox must be used within a SandboxProvider');
  }
  return context;
} 