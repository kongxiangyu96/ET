export type ProjectType = "business" | "innovation";
export type ProjectStatus = "active" | "completed" | "paused";

export interface Project {
  id: number;
  name: string;
  type: ProjectType;
  description: string;
  deadline: string | null;
  completion: number;
  status: ProjectStatus;
  created_at: string;
  total_hours?: number;
  member_count?: number;
}

export interface WorkLog {
  id: number;
  colleague_name: string;
  project_id: number;
  project_name?: string;
  project_type?: ProjectType;
  hours: number;
  log_date: string;
  description: string;
  raw_input: string;
  created_at: string;
}

export interface ParsedWorkLog {
  colleague_name: string;
  project_hint: string;
  hours: number;
  log_date: string;
  description: string;
  confidence: number;
  raw_input: string;
}

export interface Stats {
  byType: Array<{ type: ProjectType; total_hours: number; unique_colleagues: number; log_count: number }>;
  byProject: Array<{ id: number; name: string; type: ProjectType; completion: number; deadline: string | null; status: ProjectStatus; total_hours: number; members: number }>;
  byColleague: Array<{ colleague_name: string; total_hours: number; project_count: number; business_hours: number; innovation_hours: number }>;
  byDate: Array<{ log_date: string; business_hours: number; innovation_hours: number; total_hours: number }>;
}

export interface SummaryData {
  markdown: string;
  stats: {
    totalBusiness: number;
    totalInnovation: number;
    businessProjects: Project[];
    innovationProjects: Project[];
    colleagueStats: Array<{ colleague_name: string; total_hours: number; business_hours: number; innovation_hours: number }>;
  };
}
