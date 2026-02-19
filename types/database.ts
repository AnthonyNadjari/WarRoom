export type CompanyType =
  | "Bank"
  | "Hedge Fund"
  | "Asset Manager"
  | "Private Equity"
  | "Prop Shop"
  | "Recruiter"
  | "Other";

export type ContactCategory =
  | "Sales"
  | "Trading"
  | "Structuring"
  | "Investment"
  | "HR"
  | "Recruiter"
  | "Other";

export type Seniority =
  | "Analyst"
  | "Associate"
  | "VP"
  | "Director"
  | "MD"
  | "Partner"
  | "HR"
  | "Recruiter"
  | "Other";

export type InteractionGlobalCategory =
  | "Sales"
  | "Trading"
  | "Structuring"
  | "Investment"
  | "Other";

export type InteractionType =
  | "Official Application"
  | "LinkedIn Message"
  | "Cold Email"
  | "Call"
  | "Referral";

export type InteractionStatus =
  | "Sent"
  | "Waiting"
  | "Follow-up"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Closed";

export type Priority = "Low" | "Medium" | "High";

export type Outcome = "None" | "Rejected" | "Interview" | "Offer";

export type InteractionSourceType = "Direct" | "Via Recruiter";

export type ProcessStatus = "Active" | "Interviewing" | "Offer" | "Rejected" | "Closed";

export interface Process {
  id: string;
  user_id: string;
  company_id: string;
  role_title: string;
  location: string | null;
  status: ProcessStatus;
  source_process_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ProcessWithRelations = Process & {
  company?: { id: string; name: string; website_domain?: string | null; logo_url?: string | null } | null;
  sourceProcess?: { id: string; role_title: string; company?: { id: string; name: string } | null } | null;
  _count?: { interactions: number };
};

export interface Company {
  id: string;
  user_id: string;
  name: string;
  type: CompanyType;
  main_location: string | null;
  website_domain: string | null;
  logo_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  company_id: string;
  first_name: string | null;
  last_name: string | null;
  exact_title: string | null;
  category: ContactCategory | null;
  seniority: Seniority | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  manager_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface ContactWithCompany extends Contact {
  company?: Company | null;
}

export interface Interaction {
  id: string;
  user_id: string;
  company_id: string;
  contact_id: string;
  role_title: string | null;
  global_category: InteractionGlobalCategory | null;
  type: InteractionType | null;
  status: InteractionStatus;
  priority: Priority | null;
  date_sent: string | null;
  last_update: string | null;
  next_follow_up_date: string | null;
  outcome: Outcome | null;
  comment: string | null;
  source_type: InteractionSourceType;
  recruiter_id: string | null;
  process_id: string | null;
  created_at: string;
}

export type InteractionWithRelations = Interaction & {
  company?: { id: string; name: string; website_domain?: string | null; logo_url?: string | null } | null;
  contact?: { id: string; first_name: string | null; last_name: string | null } | null;
  recruiter?: { id: string; name: string } | null;
  process?: { id: string; role_title: string; status: ProcessStatus } | null;
};
