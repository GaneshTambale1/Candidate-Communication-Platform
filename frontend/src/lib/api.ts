import axios from 'axios';
import type { Candidate, Message, Page, Dashboard, Batch, Scenario } from '@/types';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 15000,
});

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Unable to connect to the server. Please check the connection.';
    const data = error.response?.data;
    if (typeof data?.detail === 'string') return data.detail;
    if (typeof data?.message === 'string') return data.message;
    if (data && typeof data === 'object') {
      const first = Object.values(data)[0];
      if (Array.isArray(first)) return first.join(' ');
      if (typeof first === 'string') return first;
    }
  }
  return 'Something went wrong. Please try again.';
}

export const client = {
  dashboard: async () => (await api.get<Dashboard>('/dashboard/')).data,
  candidates: async (search = '', page = 1) => (await api.get<Page<Candidate>>('/candidates/', {params:{search, page}})).data,
  candidate: async (id: string) => (await api.get<Candidate>(`/candidates/${id}/`)).data,
  addCandidate: async (body: {name:string; email:string; phone:string}) => (await api.post<Candidate>('/candidates/',body)).data,
  updateCandidate: async (id:string, body: {name:string; email:string; phone:string}) => (await api.patch<Candidate>(`/candidates/${id}/`,body)).data,
  messages: async (params: Record<string, string|number> = {}) => (await api.get<Page<Message>>('/messages/',{params})).data,
  candidateMessages: async (id:string, page=1) => (await api.get<Page<Message>>(`/candidates/${id}/messages/`, {params:{page}})).data,
  send: async (candidate_id:string, body:string, scenario:Scenario) => (await api.post<Message>('/messages/',{candidate_id,body,scenario})).data,
  sendBulk: async (candidate_ids:string[], body:string, scenario:Scenario, mixed_results=false) => (await api.post<{batch_id:string; total:number;queued:number}>('/messages/bulk/',{candidate_ids,body,scenario,mixed_results})).data,
  retry: async (id:string, scenario?:Scenario) => (await api.post<Message>(`/messages/${id}/retry/`,{scenario: scenario || undefined})).data,
  batches: async () => (await api.get<Page<Batch>>('/batches/')).data,
  batch: async (id:string) => (await api.get<Batch>(`/batches/${id}/`)).data,
  batchMessages: async (id:string, page=1) => (await api.get<Page<Message>>(`/batches/${id}/messages/`,{params:{page}})).data,
};

export const fmtDate = (date:string) => new Date(date).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});
