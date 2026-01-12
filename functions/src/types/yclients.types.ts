/**
 * YClients API Types
 * https://developers.yclients.com/
 */

export interface YClientsBaseResponse<T> {
  success: boolean;
  data: T;
  meta: Record<string, unknown> | unknown[];
}

export interface SendSmsCodeRequest {
  phone: string;
  fullname?: string;
}

export interface SendSmsCodeResponse {
  success: true;
  data: null;
  meta: {
    message: string;
  };
}

export interface UserAuthByCodeRequest {
  phone: string;
  code: string;
}

export interface UserAuthByPasswordRequest {
  login: string;
  password: string;
}

export interface UserAuthResponse {
  id: number;
  user_token: string;
  name: string;
  surname?: string;
  patronymic?: string;
  phone: string;
  login: string;
  email: string;
  avatar: string;
  0?: string; // Some responses include this field
}

export interface ClientSearchRequest {
  page: number;
  page_size: number;
  fields: string[];
  order_by?: string;
  order_by_direction?: 'asc' | 'desc';
  operation?: 'AND' | 'OR';
  filters?: ClientSearchFilter[];
}

export interface ClientSearchFilter {
  type: string;
  state: Record<string, unknown>;
}

export interface Client {
  id: number;
  name: string;
  surname?: string;
  patronymic?: string;
  phone: string;
  email: string;
  card?: string;
  birth_date?: string;
  discount?: number;
  sex?: string;
  sex_id?: number;
  importance?: string;
  importance_id?: number;
  categories?: ClientCategory[];
  custom_fields?: Record<string, unknown>;
}

export interface ClientCategory {
  id: number;
  title: string;
  color: string;
}

export interface ClientSearchResponse {
  success: true;
  data: Client[];
  meta: {
    total_count: number;
    page?: number;
  };
}

export interface Staff {
  id: number;
  name: string;
  company_id: number;
  specialization: string;
  information?: string;
  api_id?: string | null;
  fired: number;
  is_fired: boolean;
  hidden: number;
  is_online: boolean;
  status: number;
  is_deleted: boolean;
  user_id: number;
  rating: number;
  prepaid: string;
  weight?: number;
  avatar: string;
  avatar_big: string;
  position: StaffPosition | null;
  user?: StaffUser;
  services_links?: ServiceLink[];
  employee?: Employee;
  is_bookable?: boolean;
}

export interface StaffPosition {
  id: number;
  title: string;
}

export interface StaffUser {
  id: number;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  is_approved: boolean;
  is_salon_representative?: boolean;
}

export interface ServiceLink {
  service_id: number;
  master_id: number;
  length: number;
  technological_card_id: number;
  api_id: string;
  is_online: boolean;
  is_offline_records_allowed: boolean;
  price: number | null;
}

export interface Employee {
  id: number;
  phone: string;
  name: string;
  firstname: string;
  surname: string;
  patronymic: string;
  date_admission: string;
  date_registration_end: string;
  citizenship: string;
  sex: string;
  gender: number;
  passport_data: string;
  personal_tax_reference_number: string;
  number_insurance_certificates: string;
}

export interface StaffListResponse {
  success: true;
  data: Staff[];
  meta: {
    count: number;
  };
}

export interface YRecord {
  id: number;
  company_id: number;
  staff_id: number;
  services: RecordService[];
  goods_transactions: unknown[];
  staff: RecordStaff;
  client: RecordClient | null;
  comer: unknown | null;
  clients_count: number;
  date: string;
  datetime: string;
  create_date: string;
  comment: string;
  online: boolean;
  visit_attendance: number;
  attendance: number;
  confirmed: number;
  seance_length: number;
  length: number;
  technical_break_duration: number;
  sms_before: number;
  sms_now: number;
  sms_now_text: string;
  email_now: number;
  notified: number;
  master_request: number;
  api_id: string;
  from_url: string;
  review_requested: number;
  visit_id: number;
  created_user_id: number;
  deleted: boolean;
  paid_full: number;
  payment_status: number;
  prepaid: boolean;
  prepaid_confirmed: boolean;
  last_change_date: string;
  custom_color: string;
  custom_font_color: string;
  record_labels: RecordLabel[];
  activity_id: number;
  custom_fields: Record<string, unknown>;
  documents: RecordDocument[];
  bookform_id?: number;
  record_from?: string;
  is_mobile?: number;
  short_link?: string;
}

export interface RecordService {
  id: number;
  title: string;
  cost: number;
  cost_to_pay: number;
  manual_cost: number;
  cost_per_unit: number;
  discount: number;
  first_cost: number;
  amount: number;
}

export interface RecordStaff {
  id: number;
  api_id?: string | null;
  name: string;
  specialization: string;
  position: StaffPosition | unknown[];
  avatar: string;
  avatar_big: string;
  rating: number;
  votes_count: number;
}

export interface RecordClient {
  id: number;
  name: string;
  surname: string;
  patronymic: string;
  display_name: string;
  phone: string;
  card: string;
  email: string;
  success_visits_count: number;
  fail_visits_count: number;
  discount: number;
  is_new: boolean;
  custom_fields: Record<string, unknown>;
  client_tags?: unknown[];
}

export interface RecordLabel {
  id: number;
  title: string;
  color: string;
  icon: string;
  font_color: string;
}

export interface RecordDocument {
  id: number;
  type_id: number;
  storage_id: number;
  user_id: number;
  company_id: number;
  number: number;
  comment: string;
  date_created: string;
  category_id: number;
  visit_id: number;
  record_id: number;
  type_title: string;
  is_sale_bill_printed: boolean;
}

export interface RecordListParams {
  page?: number;
  count?: number;
  staff_id?: number;
  client_id?: number;
  created_user_id?: number;
  start_date?: string;
  end_date?: string;
  c_start_date?: string;
  c_end_date?: string;
  changed_after?: string;
  changed_before?: string;
  include_consumables?: number;
  include_finance_transactions?: number;
  with_deleted?: boolean;
}

export interface RecordListResponse {
  success: true;
  data: YRecord[];
  meta: {
    page: number;
    total_count: number;
  };
}

export interface YClientsConfig {
  partnerToken: string;
  defaultUserToken?: string;
  baseUrl?: string;
  companyId?: number;
  timeout?: number;
}

export interface YClientsRequestConfig {
  userToken?: string;
  companyId?: number;
}

export interface YClientsErrorResponse {
  success: false;
  data?: unknown;
  meta?: {
    message?: string;
    error_code?: number;
    [key: string]: unknown;
  };
  errors?: {
    code?: number;
    message?: string;
    [key: string]: unknown;
  };
}
