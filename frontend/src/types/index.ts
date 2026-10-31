export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}
export type Status = 'queued'|'sending'|'sent'|'delivered'|'read'|'failed';
export type Scenario = 'success'|'delivery_failure'|'temporary_failure'|'rate_limit'|'invalid_recipient'|'provider_unavailable';
export interface Message {
  id: string;
  candidate: string;
  candidate_name: string;
  candidate_phone: string;
  batch: string | null;
  body: string;
  status: Status;
  scenario: Scenario;
  provider_message_id: string;
  error_code: string;
  failure_reason: string;
  created_at: string;
  updated_at: string;
}
export interface Batch {
  id: string;
  created_at: string;
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  queued: number;
}
export interface Dashboard {
  candidates: number;
  messages: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
  batches: number;
}
