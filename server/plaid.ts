import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import logger from './logger';

// FIX: Don't crash server if Plaid credentials are missing - instead provide clear error messages
const PLAID_CONFIGURED = !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);

// FIX: Support both sandbox (testing) and production environments
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';
const plaidEnvironment = PLAID_ENV === 'production' 
  ? PlaidEnvironments.production 
  : PlaidEnvironments.sandbox;

if (!PLAID_CONFIGURED) {
  logger.warn('Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET environment variables to enable bank connections.');
} else {
  logger.info(`Plaid configured for ${PLAID_ENV} environment`);
}

const configuration = new Configuration({
  basePath: plaidEnvironment,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': process.env.PLAID_SECRET || '',
      'Plaid-Version': '2020-09-14',
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// Helper to check if Plaid is configured
function ensurePlaidConfigured() {
  if (!PLAID_CONFIGURED) {
    throw new Error('Plaid is not configured. Please set PLAID_CLIENT_ID and PLAID_SECRET environment variables in your deployment settings.');
  }
}

export const createLinkToken = async (userId: string, redirectUri?: string) => {
  ensurePlaidConfigured();
  
  const config: any = {
    user: {
      client_user_id: userId,
    },
    client_name: 'PocketTrack',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
  };
  
  // Add redirect_uri for mobile OAuth flow
  if (redirectUri) {
    config.redirect_uri = redirectUri;
    logger.info('[PLAID] Creating link token with redirect URI for mobile OAuth', { 
      redirectUri: redirectUri.substring(0, 50) + '...' 
    });
  }
  
  const response = await plaidClient.linkTokenCreate(config);
  
  return response.data.link_token;
};

export const exchangePublicToken = async (publicToken: string) => {
  ensurePlaidConfigured();
  
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });
  
  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  };
};

export const getTransactions = async (accessToken: string, startDate: string, endDate: string) => {
  ensurePlaidConfigured();
  
  const response = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
  });
  
  return response.data;
};

export const getAccounts = async (accessToken: string) => {
  ensurePlaidConfigured();
  
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  });
  
  return response.data.accounts;
};

export const getInstitution = async (institutionId: string) => {
  ensurePlaidConfigured();
  
  const response = await plaidClient.institutionsGetById({
    institution_id: institutionId,
    country_codes: [CountryCode.Us],
  });
  
  return response.data.institution;
};
