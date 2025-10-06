import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface UIState {
  currentThought: string | undefined;
  elapsedTime: number | undefined;
  showAuthDialog: boolean;
  isAuthenticated: boolean;
}

interface UIStateContextValue {
  state: UIState;
  setThought: (thought: string | undefined) => void;
  setElapsedTime: (time: number | undefined) => void;
  setShowAuthDialog: (show: boolean) => void;
  setIsAuthenticated: (auth: boolean) => void;
}

const UIStateContext = createContext<UIStateContextValue | undefined>(undefined);

interface UIStateProviderProps {
  children: ReactNode;
}

export const UIStateProvider: React.FC<UIStateProviderProps> = ({ children }) => {
  const [state, setState] = useState<UIState>({
    currentThought: undefined,
    elapsedTime: undefined,
    showAuthDialog: false,
    isAuthenticated: false,
  });

  const setThought = (thought: string | undefined) => {
    setState(prev => ({ ...prev, currentThought: thought }));
  };

  const setElapsedTime = (time: number | undefined) => {
    setState(prev => ({ ...prev, elapsedTime: time }));
  };

  const setShowAuthDialog = (show: boolean) => {
    setState(prev => ({ ...prev, showAuthDialog: show }));
  };

  const setIsAuthenticated = (auth: boolean) => {
    setState(prev => ({ ...prev, isAuthenticated: auth }));
  };

  return (
    <UIStateContext.Provider value={{
      state,
      setThought,
      setElapsedTime,
      setShowAuthDialog,
      setIsAuthenticated,
    }}>
      {children}
    </UIStateContext.Provider>
  );
};

export const useUIState = (): UIStateContextValue => {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within UIStateProvider');
  }
  return context;
};
