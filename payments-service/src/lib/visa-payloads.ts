/**
 * Visa API Payload Builders
 * References:
 * - PAAI: https://developer.visa.com/capabilities/paai/docs-how-to
 * - Visa Direct: https://developer.visa.com/capabilities/visa_direct/docs-how-to
 */

import { nanoid } from 'nanoid';

/**
 * Generates a unique 6-digit systems trace audit number
 */
function generateSTAN(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a unique 12-digit retrieval reference number
 */
function generateRRN(): string {
  return Math.floor(100000000000 + Math.random() * 900000000000).toString();
}

/**
 * Formats datetime for Visa API (yyyy-MM-ddTHH:mm:ss)
 */
function formatVisaDateTime(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19);
}

/**
 * Standard card acceptor object for FlowSync
 */
function getCardAcceptor() {
  return {
    name: "FlowSync Demo",
    terminalId: "FLOWSYNC1",
    idCode: "FLOWSYNC001",
    address: {
      county: "CA",
      country: "USA",
      state: "CA",
      zipCode: "94404"
    }
  };
}

/**
 * Builds PAAI request payload
 * Reference: https://developer.visa.com/capabilities/paai/docs-how-to
 */
export function buildPAAIPayload(recipientPAN: string) {
  return {
    primaryAccountNumber: recipientPAN,
    systemsTraceAuditNumber: generateSTAN(),
    retrievalReferenceNumber: generateRRN(),
    cardAcceptor: getCardAcceptor()
  };
}

/**
 * Builds Push Funds request payload
 * Reference: https://developer.visa.com/capabilities/visa_direct/docs-how-to
 */
export interface PushFundsParams {
  senderPAN: string;
  senderExpiry: string;
  recipientPAN: string;
  amount: number;
  transactionId?: string;
}

export function buildPushFundsPayload(params: PushFundsParams) {
  const { senderPAN, senderExpiry, recipientPAN, amount, transactionId } = params;
  
  return {
    systemsTraceAuditNumber: generateSTAN(),
    retrievalReferenceNumber: generateRRN(),
    localTransactionDateTime: formatVisaDateTime(),
    acquiringBin: "408999",
    acquirerCountryCode: "840",
    senderAccountNumber: senderPAN,
    senderCardExpiryDate: senderExpiry,
    senderCurrencyCode: "USD",
    amount: amount.toFixed(2),
    transactionCurrencyCode: "USD",
    recipientPrimaryAccountNumber: recipientPAN,
    recipientName: "FlowSync User",
    transactionIdentifier: transactionId || nanoid(16),
    merchantCategoryCode: "6012",
    cardAcceptor: {
      name: "FlowSync",
      terminalId: "FLOWSYNC1",
      idCode: "FLOWSYNC001",
      address: {
        county: "San Mateo",
        country: "USA",
        state: "CA",
        zipCode: "94404"
      }
    },
    businessApplicationId: "AA", // Account-to-Account
    sourceOfFundsCode: "05" // Debit account
  };
}

/**
 * Builds Pull Funds request payload (for staking)
 * Reference: https://developer.visa.com/capabilities/visa_direct/docs-how-to
 */
export interface PullFundsParams {
  senderPAN: string;
  senderExpiry: string;
  recipientPAN: string;
  amount: number;
  transactionId?: string;
}

export function buildPullFundsPayload(params: PullFundsParams) {
  const { senderPAN, senderExpiry, recipientPAN, amount, transactionId } = params;
  
  return {
    systemsTraceAuditNumber: generateSTAN(),
    retrievalReferenceNumber: generateRRN(),
    localTransactionDateTime: formatVisaDateTime(),
    acquiringBin: "408999",
    acquirerCountryCode: "840",
    senderAccountNumber: senderPAN,
    senderCardExpiryDate: senderExpiry,
    senderCurrencyCode: "USD",
    amount: amount.toFixed(2),
    transactionCurrencyCode: "USD",
    recipientPrimaryAccountNumber: recipientPAN,
    recipientName: "FlowSync Project",
    transactionIdentifier: transactionId || nanoid(16),
    merchantCategoryCode: "6012",
    cardAcceptor: getCardAcceptor(),
    businessApplicationId: "AA",
    sourceOfFundsCode: "05"
  };
}


