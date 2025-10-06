import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface FirstRunConfig {
  hasCompletedSetup: boolean;
  setupVersion: string;
  emailMode?: 'mock' | 'imap';
  hasApiKey?: boolean;
}

const CONFIG_DIR = path.join(os.homedir(), '.claude-inbox');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadFirstRunConfig(): FirstRunConfig | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content) as FirstRunConfig;
  } catch (error) {
    console.error('Error loading first-run config:', error);
    return null;
  }
}

export function saveFirstRunConfig(config: FirstRunConfig): void {
  try {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving first-run config:', error);
  }
}

export function isFirstRun(): boolean {
  const config = loadFirstRunConfig();
  return !config || !config.hasCompletedSetup;
}

export function markSetupComplete(emailMode: 'mock' | 'imap', hasApiKey: boolean): void {
  const config: FirstRunConfig = {
    hasCompletedSetup: true,
    setupVersion: '1.0.0',
    emailMode,
    hasApiKey,
  };
  saveFirstRunConfig(config);
}
