export type CaseStatus = "open" | "in_review" | "resolved" | "rejected";
export type CasePriority = "low" | "medium" | "high" | "critical";

export interface CaseRecord {
  id: string;
  title: string;
  description?: string;
  status: CaseStatus;
  priority: CasePriority;
  assignedTo?: string;
  documentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseRequest {
  title: string;
  description?: string;
  priority?: CasePriority;
  assignedTo?: string;
  documentId?: string;
}

export interface UpdateCaseRequest {
  status?: CaseStatus;
  priority?: CasePriority;
  assignedTo?: string;
  description?: string;
}
