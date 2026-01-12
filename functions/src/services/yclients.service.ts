import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  YClientsConfig,
  YClientsBaseResponse,
  YClientsErrorResponse,
  SendSmsCodeRequest,
  SendSmsCodeResponse,
  UserAuthByCodeRequest,
  UserAuthByPasswordRequest,
  UserAuthResponse,
  ClientSearchRequest,
  ClientSearchResponse,
  StaffListResponse,
  RecordListParams,
  RecordListResponse,
} from '../types/yclients.types';

/**
 * YClients API Service
 * Documentation: https://developers.yclients.com/
 */
export class YClientsService {
  private readonly axiosInstance: AxiosInstance;
  private readonly partnerToken: string;
  private readonly companyId: number;
  private readonly defaultUserToken: string;
  private readonly baseUrl: string;

  constructor(config: YClientsConfig) {
    this.partnerToken = config.partnerToken;
    this.baseUrl = config.baseUrl || 'https://api.yclients.com';
    this.companyId = config.companyId!;
    this.defaultUserToken = config.defaultUserToken;

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Accept': 'application/vnd.yclients.v2+json',
        'Content-Type': 'application/json',
      },
    });

    // Partner token set by default, user token appended in buildRequestConfig
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (!config.headers.get('Authorization')) {
          config.headers.set('Authorization', `Bearer ${this.partnerToken}`);
        }
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      (response: any) => response,
      (error: AxiosError<unknown>) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  async sendSmsCode(
    data: SendSmsCodeRequest
  ): Promise<SendSmsCodeResponse> {
    const response = await this.axiosInstance.post<SendSmsCodeResponse>(
      `/api/v1/book_code/${this.companyId}`,
      data
    );
    return response.data;
  }

  async authenticateUserByCode(
    data: UserAuthByCodeRequest
  ): Promise<YClientsBaseResponse<UserAuthResponse>> {
    const response = await this.axiosInstance.post<YClientsBaseResponse<UserAuthResponse>>(
      '/api/v1/user/auth',
      data
    );
    return response.data;
  }

  async authenticateUserByPassword(
    data: UserAuthByPasswordRequest
  ): Promise<YClientsBaseResponse<UserAuthResponse>> {
    const response = await this.axiosInstance.post<YClientsBaseResponse<UserAuthResponse>>(
      '/api/v1/auth',
      data
    );
    return response.data;
  }

  async searchClients(
    searchParams: ClientSearchRequest,
  ): Promise<ClientSearchResponse> {
    const response = await this.axiosInstance.post<ClientSearchResponse>(
      `/api/v1/company/${this.companyId}/clients/search`,
      searchParams,
      this.buildRequestConfig(true)
    );
    return response.data;
  }

  async getStaffList(
    staffId?: number,
  ): Promise<StaffListResponse> {
    const url = staffId
      ? `/api/v1/company/${this.companyId}/staff/${staffId}`
      : `/api/v1/company/${this.companyId}/staff`;

    const response = await this.axiosInstance.get<StaffListResponse>(
      url,
      this.buildRequestConfig(true)
    );
    return response.data;
  }

  async getRecords(
    params?: RecordListParams,
  ): Promise<RecordListResponse> {
    const response = await this.axiosInstance.get<RecordListResponse>(
      `/api/v1/records/${this.companyId}`,
      {
        ...this.buildRequestConfig(true),
        params,
      }
    );
    return response.data;
  }

  /**
   * Supports two authorization formats:
   * - Bearer {partnerToken}
   * - Bearer {partnerToken}, User {userToken}
   */
  private buildRequestConfig(
    withUser: boolean = false
  ): AxiosRequestConfig {
    const headers: Record<string, string> = {};

    if (withUser) {
      headers['Authorization'] = `Bearer ${this.partnerToken}, User ${this.defaultUserToken}`;
    }

    return {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    };
  }

  private handleError(error: AxiosError<unknown>): Error {
    if (error.response) {
      const errorData = error.response.data as YClientsErrorResponse | undefined;
      
      const message = 
        errorData?.meta?.message || 
        errorData?.errors?.message || 
        error.message || 
        'Unknown error occurred';
      
      const errorCode = 
        errorData?.meta?.error_code || 
        errorData?.errors?.code;

      const enhancedError = new Error(
        `YClients API Error (${error.response.status}): ${message}`
      );
      
      (enhancedError as any).status = error.response.status;
      (enhancedError as any).errorCode = errorCode;
      (enhancedError as any).data = errorData;
      
      return enhancedError;
    } else if (error.request) {
      return new Error('YClients API: No response received from server');
    } else {
      return new Error(`YClients API: ${error.message}`);
    }
  }

  getCompanyId(): number {
    return this.companyId;
  }

  getDefaultUserToken(): string | undefined {
    return this.defaultUserToken;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export function createYClientsService(config: YClientsConfig): YClientsService {
  return new YClientsService(config);
}
