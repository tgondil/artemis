/**
 * Configuration loader for Visa API credentials
 */

import { config } from 'dotenv';

config();

export interface AppConfig {
  visa: {
    apiKey: string;
    sharedSecret: string;
    baseURL: string;
    certPath?: string;
    keyPath?: string;
    mockMode: boolean;
  };
  projectWallet: {
    pan: string;
    expiry: string;
  };
  poolAccount: {
    pan: string;
    expiry: string;
  };
  database: {
    url: string;
  };
  server: {
    port: number;
    nodeEnv: string;
  };
}

function getEnvVar(key: string, required: boolean = true, defaultValue: string = ''): string {
  const value = process.env[key];
  if (required && !value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue;
}

export function loadConfig(): AppConfig {
  return {
    visa: {
      apiKey: getEnvVar('VISA_API_KEY'),
      sharedSecret: getEnvVar('VISA_SHARED_SECRET', false, ''), // Optional for mTLS-only auth
      baseURL: getEnvVar('VISA_BASE_URL'),
      certPath: getEnvVar('VISA_CERT_PATH', false),
      keyPath: getEnvVar('VISA_KEY_PATH', false),
      mockMode: getEnvVar('VISA_MOCK_MODE', false, 'false').toLowerCase() === 'true',
    },
    projectWallet: {
      pan: getEnvVar('PROJECT_WALLET_PAN'),
      expiry: getEnvVar('PROJECT_WALLET_EXPIRY'),
    },
    poolAccount: {
      pan: getEnvVar('POOL_ACCOUNT_PAN'),
      expiry: getEnvVar('POOL_ACCOUNT_EXPIRY'),
    },
    database: {
      url: getEnvVar('DATABASE_URL'),
    },
    server: {
      port: parseInt(getEnvVar('PORT', false) || '3001'),
      nodeEnv: getEnvVar('NODE_ENV', false) || 'development',
    },
  };
}

export const appConfig = loadConfig();

