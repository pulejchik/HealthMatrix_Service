export const YCLIENTS_API_CONFIG = {
  BASE_URL: 'https://api.yclients.com',
  API_VERSION: 'application/vnd.yclients.v2+json',
  DEFAULT_TIMEOUT: 30000, // 30 seconds

  // API limits: 200 req/min or 5 req/sec per IP
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 200,
    REQUESTS_PER_SECOND: 5,
  },
} as const;

/**
 * Company identifiers
 */
export type CompanyIdentifier = 'companyEntity' | 'companyChain';

/**
 * Company-specific configuration
 */
interface CompanyConfig {
  PARTNER_TOKEN: string;
  DEFAULT_USER_TOKEN: string;
  COMPANY_ID: number;
  BASE_URL: string;
  TIMEOUT: number;
}

/**
 * Default config values for both companies (overridable by environment variables)
 */
const DEFAULT_COMPANIES_CONFIG: Record<CompanyIdentifier, CompanyConfig> = {
  companyEntity: {
    PARTNER_TOKEN: 'c7kky7xxyg2pdsh5gzfg',
    DEFAULT_USER_TOKEN: '6ad89961537fd64f64a1bad057f5b6d2',
    COMPANY_ID: 1141478,
    BASE_URL: YCLIENTS_API_CONFIG.BASE_URL,
    TIMEOUT: YCLIENTS_API_CONFIG.DEFAULT_TIMEOUT,
  },
  companyChain: {
    PARTNER_TOKEN: 'j7zrjzx5fwcbhys6bkpm',
    DEFAULT_USER_TOKEN: 'e3c18940b35227b92cf128e541704664',
    COMPANY_ID: 1714625,
    BASE_URL: YCLIENTS_API_CONFIG.BASE_URL,
    TIMEOUT: YCLIENTS_API_CONFIG.DEFAULT_TIMEOUT,
  },
} as const;

/**
 * Get config for a specific company
 */
export const getYClientsConfig = (company: CompanyIdentifier) => {
  const defaultConfig = DEFAULT_COMPANIES_CONFIG[company];

  return {
    partnerToken: defaultConfig.PARTNER_TOKEN,
    defaultUserToken: defaultConfig.DEFAULT_USER_TOKEN,
    companyId: defaultConfig.COMPANY_ID,
    baseUrl: defaultConfig.BASE_URL,
    timeout: defaultConfig.TIMEOUT,
  };
};

export const YCLIENTS_ENDPOINTS = {
  SEND_SMS_CODE: (companyId: number) => `/api/v1/book_code/${companyId}`,
  USER_AUTH_BY_CODE: '/api/v1/user/auth',
  USER_AUTH_BY_PASSWORD: '/api/v1/auth',

  CLIENTS_SEARCH: (companyId: number) => `/api/v1/company/${companyId}/clients/search`,
  CLIENT_GET: (companyId: number, clientId: number) => `/api/v1/client/${companyId}/${clientId}`,
  CLIENT_CREATE: (companyId: number) => `/api/v1/clients/${companyId}`,
  CLIENT_UPDATE: (companyId: number, clientId: number) => `/api/v1/client/${companyId}/${clientId}`,
  CLIENT_DELETE: (companyId: number, clientId: number) => `/api/v1/client/${companyId}/${clientId}`,

  STAFF_LIST: (companyId: number) => `/api/v1/company/${companyId}/staff`,
  STAFF_GET: (companyId: number, staffId: number) => `/api/v1/company/${companyId}/staff/${staffId}`,

  RECORDS_LIST: (companyId: number) => `/api/v1/records/${companyId}`,
  RECORD_GET: (companyId: number, recordId: number) => `/api/v1/record/${companyId}/${recordId}`,
  RECORD_CREATE: (companyId: number) => `/api/v1/records/${companyId}`,
  RECORD_UPDATE: (companyId: number, recordId: number) => `/api/v1/record/${companyId}/${recordId}`,
  RECORD_DELETE: (companyId: number, recordId: number) => `/api/v1/record/${companyId}/${recordId}`,

  SERVICES_LIST: (companyId: number) => `/api/v1/company/${companyId}/services`,
  SERVICE_GET: (companyId: number, serviceId: number) => `/api/v1/company/${companyId}/services/${serviceId}`,

  COMPANIES_LIST: '/api/v1/companies',
  COMPANY_GET: (companyId: number) => `/api/v1/company/${companyId}`,
} as const;

export const YCLIENTS_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const YCLIENTS_ERROR_CODES = {
  INVALID_CODE: 432,
  TIME_SLOT_TAKEN: 433,
  CLIENT_BLACKLISTED: 434,
  INVALID_PHONE_FORMAT: 431,
  NAME_REQUIRED: 435,
  NO_AVAILABLE_STAFF: 436,
  TIME_CONFLICT: 437,
  SERVICE_UNAVAILABLE: 438,
} as const;
