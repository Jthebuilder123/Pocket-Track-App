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

export const createLinkToken = async (
  userId: string, 
  options?: { 
    redirectUri?: string;
    isMobileWebView?: boolean;
    completionRedirectUri?: string;
  }
) => {
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
  
  // Hosted Link for mobile WebViews (React Native, Cordova, etc.)
  // Opens in native browser (ASWebAuthenticationSession/Custom Tabs)
  // IMPORTANT: Plaid requires BOTH redirect_uri and hosted_link.completion_redirect_uri
  if (options?.isMobileWebView && options?.completionRedirectUri) {
    // Set redirect_uri to the base URL (required by Plaid)
    const baseUrl = options.completionRedirectUri.split('/plaid/callback')[0] + '/';
    config.redirect_uri = baseUrl;
    config.hosted_link = {
      is_mobile_app: true,
      completion_redirect_uri: options.completionRedirectUri,
    };
    logger.info('[PLAID] Creating Hosted Link token for mobile WebView', { 
      environment: PLAID_ENV,
      redirectUri: baseUrl.substring(0, 50) + '...',
      completionRedirectUri: options.completionRedirectUri.substring(0, 50) + '...'
    });
  }
  // Standard OAuth redirect for mobile browsers
  else if (options?.redirectUri) {
    config.redirect_uri = options.redirectUri;
    logger.info('[PLAID] Creating link token with redirect URI for mobile OAuth', { 
      environment: PLAID_ENV,
      redirectUri: options.redirectUri.substring(0, 50) + '...' 
    });
  } 
  // Modal flow for desktop browsers
  else {
    logger.info('[PLAID] Creating link token for modal flow (no redirect URI)', {
      environment: PLAID_ENV
    });
  }
  
  try {
    const response = await plaidClient.linkTokenCreate(config);
    return response.data.link_token;
  } catch (error: any) {
    logger.error('[PLAID] Failed to create link token', {
      error: error.message,
      response: error.response?.data,
      hasRedirectUri: !!options?.redirectUri,
      isMobileWebView: !!options?.isMobileWebView,
      environment: PLAID_ENV
    });
    throw error;
  }
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
