import React, { createContext, useContext, ReactNode } from 'react';

export interface AppConfig {
  mode: 'mock' | 'gmail' | 'imap';
  modelName: string;
  debug: boolean;
  resetInbox: boolean;
}

const ConfigContext = createContext<AppConfig | undefined>(undefined);

interface ConfigProviderProps {
  config: AppConfig;
  children: ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ config, children }) => {
  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = (): AppConfig => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
};
