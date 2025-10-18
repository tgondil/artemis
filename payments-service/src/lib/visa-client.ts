/**
 * Visa API Client with X-Pay-Token and mTLS support
 * References:
 * - X-Pay-Token: https://developer.visa.com/pages/working-with-visa-apis/x-pay-token
 * - Two-Way SSL: https://developer.visa.com/capabilities/vdbp/docs-authentication
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import https from 'https';
import fs from 'fs';
import { generateXPayToken, buildQueryString } from './xpay.js';
import { mockPAAI, mockPushFunds, mockPullFunds, simulateDelay } from './visa-mock.js';

export interface VisaClientConfig {
  apiKey: string;
  sharedSecret: string;
  baseURL: string;
  certPath?: string;
  keyPath?: string;
  mockMode?: boolean;
}

/**
 * Creates Axios client with X-Pay-Token authentication
 * Used for PAAI and other APIs that use X-Pay-Token
 */
export function createXPayClient(config: VisaClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add X-Pay-Token (if shared secret is provided)
  client.interceptors.request.use((requestConfig) => {
    const url = new URL(requestConfig.url || '', config.baseURL);
    const resourcePath = url.pathname;
    const queryString = buildQueryString(config.apiKey);
    
    // Ensure query string is added
    requestConfig.params = { apikey: config.apiKey };
    
    // Only add X-Pay-Token if shared secret is provided
    if (config.sharedSecret) {
      const requestBody = requestConfig.data ? JSON.stringify(requestConfig.data) : '';
      
      const xPayToken = generateXPayToken({
        resourcePath,
        queryString,
        requestBody,
        sharedSecret: config.sharedSecret,
      });
      
      requestConfig.headers['x-pay-token'] = xPayToken;
    }
    
    return requestConfig;
  });

  return client;
}

/**
 * Creates Axios client with mTLS authentication
 * Used for Visa Direct Funds Transfer API
 */
export function createMTLSClient(config: VisaClientConfig): AxiosInstance {
  if (!config.certPath || !config.keyPath) {
    throw new Error('Certificate and key paths required for mTLS client');
  }

  let cert: Buffer;
  let key: Buffer;

  try {
    cert = fs.readFileSync(config.certPath);
    key = fs.readFileSync(config.keyPath);
  } catch (error) {
    throw new Error(`Failed to read certificates: ${error}`);
  }

  const httpsAgent = new https.Agent({
    cert,
    key,
    rejectUnauthorized: true, // Verify Visa's certificate
  });

  const client = axios.create({
    baseURL: config.baseURL,
    httpsAgent,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  return client;
}

/**
 * Unified Visa API Client
 */
export class VisaClient {
  private xpayClient: AxiosInstance;
  private mtlsClient?: AxiosInstance;
  private config: VisaClientConfig;
  private useMTLS: boolean;
  private mockMode: boolean;

  constructor(config: VisaClientConfig) {
    this.config = config;
    this.useMTLS = false;
    this.mockMode = config.mockMode || false;
    
    if (this.mockMode) {
      console.log('🎭 MOCK MODE ENABLED - Using simulated Visa responses');
      console.log('   To use real Visa API, set VISA_MOCK_MODE=false in .env');
    } else {
      // Create mTLS client if certs are provided (preferred for Visa Direct)
      if (config.certPath && config.keyPath) {
        try {
          this.mtlsClient = createMTLSClient(config);
          this.useMTLS = true;
          console.log('✅ mTLS client initialized (Two-Way SSL enabled)');
        } catch (error) {
          console.warn('⚠️  mTLS client creation failed, falling back to X-Pay-Token:', error);
        }
      }
      
      // Create X-Pay-Token client (for PAAI or as fallback)
      this.xpayClient = createXPayClient(config);
    }
  }

  /**
   * Call PAAI (Payment Account Attributes Inquiry)
   * Reference: https://developer.visa.com/capabilities/paai
   */
  async paai(payload: any) {
    if (this.mockMode) {
      await simulateDelay(50);
      return mockPAAI(payload);
    }
    
    try {
      const response = await this.xpayClient.post(
        '/paai/fundstransferattributesinquiry',
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('PAAI Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Call Visa Direct - Push Funds
   * Reference: https://developer.visa.com/capabilities/visa_direct/docs-how-to
   */
  async pushFunds(payload: any) {
    if (this.mockMode) {
      await simulateDelay(100);
      return mockPushFunds(payload);
    }
    
    // Prefer mTLS for Visa Direct, fall back to X-Pay-Token
    const client = this.mtlsClient || this.xpayClient;
    const authMethod = this.mtlsClient ? 'mTLS' : 'X-Pay-Token';
    
    console.log(`🔐 Using ${authMethod} authentication for Visa Direct`);
    
    try {
      const response = await client.post(
        '/visadirect/fundstransfer/v1/pushfunds',
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('Push Funds Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Call Visa Direct - Pull Funds (optional for stake)
   * Reference: https://developer.visa.com/capabilities/visa_direct/docs-how-to
   */
  async pullFunds(payload: any) {
    if (this.mockMode) {
      await simulateDelay(100);
      return mockPullFunds(payload);
    }
    
    const client = this.mtlsClient || this.xpayClient;
    const authMethod = this.mtlsClient ? 'mTLS' : 'X-Pay-Token';
    
    console.log(`🔐 Using ${authMethod} authentication for Visa Direct`);
    
    try {
      const response = await client.post(
        '/visadirect/fundstransfer/v1/pullfunds',
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('Pull Funds Error:', error.response?.data || error.message);
      throw error;
    }
  }
}

