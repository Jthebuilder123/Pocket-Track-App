import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
  throw new Error('PLAID_CLIENT_ID and PLAID_SECRET must be set');
}

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export const createLinkToken = async (userId: string) => {
  const response = await plaidClient.linkTokenCreate({
    user: {
      client_user_id: userId,
    },
    client_name: 'SubTracker',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
  });
  
  return response.data.link_token;
};

export const exchangePublicToken = async (publicToken: string) => {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });
  
  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  };
};

export const getTransactions = async (accessToken: string, startDate: string, endDate: string) => {
  const response = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
  });
  
  return response.data;
};

export const getAccounts = async (accessToken: string) => {
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  });
  
  return response.data.accounts;
};

export const getInstitution = async (institutionId: string) => {
  const response = await plaidClient.institutionsGetById({
    institution_id: institutionId,
    country_codes: [CountryCode.Us],
  });
  
  return response.data.institution;
};
