/**
 * Visa API Mock Responses
 * Simulates Visa Direct and PAAI responses for testing/demo
 */

import { nanoid } from 'nanoid';

/**
 * Mock PAAI (Payment Account Attributes Inquiry) response
 * Reference: https://developer.visa.com/capabilities/paai
 */
export function mockPAAI(payload: any) {
  console.log('🎭 MOCK MODE: Simulating PAAI response');
  
  return {
    responseStatus: {
      status: 200,
      code: '0000',
      severity: 'INFO',
      message: 'Success'
    },
    primaryAccountNumber: payload.primaryAccountNumber,
    cardType: 'DEBIT',
    fastFundsIndicator: 'Y',
    pushFundsBlockIndicator: 'N',
    onlineGamblingBlockIndicator: 'N',
    cardCategory: 'CONSUMER',
    issuerName: 'VISA SANDBOX BANK',
    issuerCountryCode: '840',
    accountStatus: 'ACTIVE'
  };
}

/**
 * Mock Visa Direct Push Funds response
 * Reference: https://developer.visa.com/capabilities/visa_direct/docs-how-to
 */
export function mockPushFunds(payload: any) {
  console.log('🎭 MOCK MODE: Simulating Visa Direct push funds');
  
  const timestamp = new Date().toISOString();
  const transactionId = `VD${Date.now()}${nanoid(8).toUpperCase()}`;
  
  return {
    transactionIdentifier: transactionId,
    actionCode: '00',
    approvalCode: nanoid(6).toUpperCase(),
    responseCode: '00',
    transmissionDateTime: timestamp,
    retrievalReferenceNumber: payload.retrievalReferenceNumber || nanoid(12),
    systemsTraceAuditNumber: payload.systemsTraceAuditNumber || '451001',
    settlementFlag: '1',
    cardAcceptor: payload.cardAcceptor,
    feeProgramIndicator: '',
    transactionFeeAmt: '0.00',
    amount: payload.amount,
    transactionCurrencyCode: payload.transactionCurrencyCode || 'USD',
    merchantVerificationValue: nanoid(16),
    responseStatus: {
      status: 200,
      code: '0000',
      severity: 'INFO',
      message: 'Success',
      info: ''
    }
  };
}

/**
 * Mock Visa Direct Pull Funds response
 * Reference: https://developer.visa.com/capabilities/visa_direct/docs-how-to
 */
export function mockPullFunds(payload: any) {
  console.log('🎭 MOCK MODE: Simulating Visa Direct pull funds');
  
  const timestamp = new Date().toISOString();
  const transactionId = `VD${Date.now()}${nanoid(8).toUpperCase()}`;
  
  return {
    transactionIdentifier: transactionId,
    actionCode: '00',
    approvalCode: nanoid(6).toUpperCase(),
    responseCode: '00',
    transmissionDateTime: timestamp,
    retrievalReferenceNumber: payload.retrievalReferenceNumber || nanoid(12),
    systemsTraceAuditNumber: payload.systemsTraceAuditNumber || '451001',
    settlementFlag: '1',
    cardAcceptor: payload.cardAcceptor,
    amount: payload.amount,
    transactionCurrencyCode: payload.transactionCurrencyCode || 'USD',
    responseStatus: {
      status: 200,
      code: '0000',
      severity: 'INFO',
      message: 'Success',
      info: ''
    }
  };
}

/**
 * Simulate network delay (optional, for realism)
 */
export async function simulateDelay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


