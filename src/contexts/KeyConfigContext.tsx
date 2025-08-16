import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { KeyConfig, KeyMapping, GamepadMapping } from '../lib/keyconfig/types';
import { DEFAULT_KEY_CONFIG } from '../lib/keyconfig/types';

interface KeyConfigContextValue {
  config: KeyConfig;
  updateKeyboardMapping: (action: keyof KeyMapping, keys: string[]) => void;
  updateGamepadMapping: (action: keyof GamepadMapping, buttons: number[]) => void;
  updateDAS: (value: number) => void;
  updateARR: (value: number) => void;
  updateSoftDropSpeed: (value: number) => void;
  resetToDefaults: () => void;
  saveConfig: () => void;
}

const KeyConfigContext = createContext<KeyConfigContextValue | null>(null);

const STORAGE_KEY = 'tetris-key-config';

export const KeyConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<KeyConfig>(() => {
    // Load from localStorage on initial mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all keys exist
        return {
          ...DEFAULT_KEY_CONFIG,
          ...parsed,
          keyboard: { ...DEFAULT_KEY_CONFIG.keyboard, ...parsed.keyboard },
          gamepad: { ...DEFAULT_KEY_CONFIG.gamepad, ...parsed.gamepad },
        };
      }
    } catch (error) {
      console.error('Failed to load key config:', error);
    }
    return DEFAULT_KEY_CONFIG;
  });

  // Auto-save when config changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save key config:', error);
    }
  }, [config]);

  const updateKeyboardMapping = useCallback((action: keyof KeyMapping, keys: string[]) => {
    setConfig(prev => ({
      ...prev,
      keyboard: {
        ...prev.keyboard,
        [action]: keys,
      },
    }));
  }, []);

  const updateGamepadMapping = useCallback((action: keyof GamepadMapping, buttons: number[]) => {
    if (action === 'useLeftStick' || action === 'useRightStick') {
      // Handle boolean flags separately
      return;
    }
    setConfig(prev => ({
      ...prev,
      gamepad: {
        ...prev.gamepad,
        [action]: buttons,
      },
    }));
  }, []);

  const updateDAS = useCallback((value: number) => {
    setConfig(prev => ({
      ...prev,
      das: Math.max(0, Math.min(30, value)), // Clamp between 0-30 frames
    }));
  }, []);

  const updateARR = useCallback((value: number) => {
    setConfig(prev => ({
      ...prev,
      arr: Math.max(0, Math.min(10, value)), // Clamp between 0-10 frames
    }));
  }, []);

  const updateSoftDropSpeed = useCallback((value: number) => {
    setConfig(prev => ({
      ...prev,
      softDropSpeed: Math.max(1, Math.min(60, value)), // Clamp between 1-60 cells/sec
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULT_KEY_CONFIG);
  }, []);

  const saveConfig = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save key config:', error);
    }
  }, [config]);

  const value: KeyConfigContextValue = {
    config,
    updateKeyboardMapping,
    updateGamepadMapping,
    updateDAS,
    updateARR,
    updateSoftDropSpeed,
    resetToDefaults,
    saveConfig,
  };

  return (
    <KeyConfigContext.Provider value={value}>
      {children}
    </KeyConfigContext.Provider>
  );
};

export const useKeyConfig = (): KeyConfigContextValue => {
  const context = useContext(KeyConfigContext);
  if (!context) {
    throw new Error('useKeyConfig must be used within a KeyConfigProvider');
  }
  return context;
};