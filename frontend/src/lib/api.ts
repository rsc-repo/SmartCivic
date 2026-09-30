import axios from 'axios';

// Points at the local NestJS backend (see backend/src/main.ts —
// global prefix "api", CORS allowed for http://localhost:3000).
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Called by AuthContext whenever the token changes (login/logout/rehydrate
// from localStorage), so every request after that carries it automatically.
export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

export interface Department {
  id: number;
  name: string;
  code: string;
  slaHoursDefault: number;
}

export async function getHealth() {
  const { data } = await apiClient.get('/health');
  return data;
}

export async function getDepartments(): Promise<Department[]> {
  const { data } = await apiClient.get<Department[]>('/departments');
  return data;
}

// --- Auth -------------------------------------------------------------

export type UserRole = 'CITIZEN' | 'OFFICER' | 'DEPT_ADMIN' | 'SYSTEM_ADMIN';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const { data } = await apiClient.post<AuthResult>('/auth/login', {
    email,
    password,
  });
  return data;
}

export async function register(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResult> {
  const { data } = await apiClient.post<AuthResult>('/auth/register', {
    email,
    password,
    fullName,
  });
  return data;
}

// Admin-only (enforced server-side); populates the "assign officer"
// dropdown on the officer dashboard.
export async function getOfficers(): Promise<AuthUser[]> {
  const { data } = await apiClient.get<AuthUser[]>('/users', {
    params: { role: 'OFFICER' },
  });
  return data;
}

// --- Issues -------------------------------------------------------------

export type IssueStatus =
  | 'SUBMITTED'
  | 'VALIDATING'
  | 'VALID'
  | 'INVALID'
  | 'TRIAGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'VERIFICATION_PENDING'
  | 'CLOSED'
  | 'REOPENED';

export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IssuePerson {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface IssueSummary {
  id: number;
  ticketId: string;
  title: string;
  description: string | null;
  category: string;
  status: IssueStatus;
  priority: IssuePriority;
  location: GeoPoint;
  addressText: string | null;
  createdAt: string;
  department: Department | null;
  reporter?: IssuePerson | null;
  assignedOfficer?: IssuePerson | null;
}

export interface NearbyIssue extends IssueSummary {
  distanceMeters: number;
}

export interface IssueFilter {
  departmentId?: number;
  assignedOfficerId?: number;
  status?: IssueStatus;
}

export async function getIssues(
  filter: IssueFilter = {},
): Promise<IssueSummary[]> {
  const { data } = await apiClient.get<IssueSummary[]>('/issues', {
    params: filter,
  });
  return data;
}

export async function getNearbyIssues(
  lat: number,
  lng: number,
  radiusMeters = 2000,
): Promise<NearbyIssue[]> {
  const { data } = await apiClient.get<NearbyIssue[]>('/issues/nearby', {
    params: { lat, lng, radius: radiusMeters },
  });
  return data;
}

// Dept/system admins only (enforced server-side too) — assigns an officer
// and moves the issue SUBMITTED/TRIAGED/etc -> ASSIGNED.
export async function assignOfficer(
  issueId: number,
  officerId: number,
): Promise<IssueSummary> {
  const { data } = await apiClient.patch<IssueSummary>(
    `/issues/${issueId}/assign`,
    { officerId },
  );
  return data;
}

// The assigned officer (or a dept/system admin) advances the workflow.
// Pass evidenceFiles when marking RESOLVED to attach repair-evidence
// photos in the same request.
export async function updateIssueStatus(
  issueId: number,
  status: IssueStatus,
  comments?: string,
  evidenceFiles?: File[],
): Promise<IssueSummary> {
  if (evidenceFiles && evidenceFiles.length > 0) {
    const form = new FormData();
    form.append('status', status);
    if (comments) form.append('comments', comments);
    evidenceFiles.forEach((file) => form.append('evidence', file));
    const { data } = await apiClient.patch<IssueSummary>(
      `/issues/${issueId}/status`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  }

  const { data } = await apiClient.patch<IssueSummary>(
    `/issues/${issueId}/status`,
    { status, comments },
  );
  return data;
}

export interface IssueHistoryEntry {
  id: number;
  previousStatus: IssueStatus | null;
  newStatus: IssueStatus;
  comments: string | null;
  createdAt: string;
  changedBy: IssuePerson | null;
}

export async function getIssueHistory(
  issueId: number,
): Promise<IssueHistoryEntry[]> {
  const { data } = await apiClient.get<IssueHistoryEntry[]>(
    `/issues/${issueId}/history`,
  );
  return data;
}

export interface IssueMediaItem {
  id: number;
  filePath: string;
  mediaType: string;
  uploadedAt: string;
}

export async function getIssueMedia(
  issueId: number,
): Promise<IssueMediaItem[]> {
  const { data } = await apiClient.get<IssueMediaItem[]>(
    `/issues/${issueId}/media`,
  );
  return data;
}

// The backend serves uploaded files at /uploads/<path> (no /api prefix).
export function mediaUrl(filePath: string): string {
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}/uploads/${filePath}`;
}
