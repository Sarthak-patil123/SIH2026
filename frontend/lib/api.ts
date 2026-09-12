// Static Frontend API mock layer — returns mock data without network requests
import { mockCases, mockAlerts, mockAuditLogs, mockAdminActivity } from './mock-data';

export const API_BASE_URL = 'http://static-frontend-mock/api';

/**
 * apiFetch — Static mock wrapper that resolves immediately with mock responses
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Simulate tiny delay for realistic UI transitions
  await new Promise((res) => setTimeout(res, 60));

  const cleanPath = path.split('?')[0];

  if (cleanPath === '/cases' || cleanPath.startsWith('/cases?')) {
    return { cases: mockCases } as unknown as T;
  }

  if (cleanPath.startsWith('/cases/activity')) {
    return { activities: mockAdminActivity } as unknown as T;
  }

  if (cleanPath.startsWith('/cases/')) {
    const caseId = cleanPath.replace('/cases/', '');
    const found = mockCases.find((c) => c.id === caseId || c.caseNumber === caseId);
    return { case: found || mockCases[0] } as unknown as T;
  }

  if (cleanPath === '/alerts') {
    return { alerts: mockAlerts } as unknown as T;
  }

  if (cleanPath === '/audit') {
    return { logs: mockAuditLogs } as unknown as T;
  }

  if (cleanPath === '/chatbot/ask') {
    return {
      answer: 'This is a static response. IDVerify is running in static frontend mode.',
    } as unknown as T;
  }

  return {} as T;
}

/**
 * apiUpload — Static mock file upload simulation
 */
export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData
): Promise<T> {
  await new Promise((res) => setTimeout(res, 300));

  if (path.includes('ocr')) {
    return {
      document_metadata: {
        detected_type: 'PASSPORT',
        document_country: 'INDIA',
      },
      quality_assessment: {
        passed: true,
        blur_score: 94.2,
        glare_detected: false,
        warnings: [],
      },
      pipeline_summary: {
        overall_confidence: 96.5,
        execution_time_ms: 180,
        ocr_confidence_mean: 96.5,
      },
      extracted_data: {
        fields: {
          'Full Name': { value: 'RAJESH KUMAR', confidence: 98.4 },
          'Date of Birth': { value: '12 MAY 1998', confidence: 96.2 },
          'Nationality': { value: 'INDIAN', confidence: 99.1 },
          'Gender': { value: 'MALE', confidence: 99.8 },
          'Passport Number': { value: 'N1234567', confidence: 97.5 },
          'Date of Expiry': { value: '14 JAN 2030', confidence: 94.8 },
        },
      },
    } as unknown as T;
  }

  if (path.includes('face')) {
    return {
      status: 'VERIFIED',
      similarity_percent: 94.8,
      is_match: true,
      match_score: 0.948,
    } as unknown as T;
  }

  return {} as T;
}
