export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertStatus = "unread" | "read" | "dismissed";

export interface AlertRecord {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  caseId?: string;
  documentId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertRequest {
  title: string;
  message: string;
  severity?: AlertSeverity;
  caseId?: string;
  documentId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateAlertRequest {
  status?: AlertStatus;
  severity?: AlertSeverity;
}
