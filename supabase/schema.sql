-- WarRoom: Single-user CRM for finance job applications
-- Run this in Supabase SQL Editor after creating your project

-- Enums for companies
CREATE TYPE company_type AS ENUM (
  'Bank', 'Hedge Fund', 'Asset Manager', 'Recruiter Firm', 'Other'
);

-- Enums for contacts
CREATE TYPE contact_category AS ENUM (
  'Sales', 'Trading', 'Structuring', 'Investment', 'HR', 'Recruiter', 'Other'
);

CREATE TYPE seniority AS ENUM (
  'Analyst', 'Associate', 'VP', 'Director', 'MD', 'Partner', 'HR', 'Recruiter', 'Other'
);

-- Enums for interactions
CREATE TYPE interaction_global_category AS ENUM (
  'Sales', 'Trading', 'Structuring', 'Investment', 'Other'
);

CREATE TYPE interaction_type AS ENUM (
  'Official Application', 'LinkedIn Message', 'Cold Email', 'Call', 'Referral'
);

CREATE TYPE interaction_status AS ENUM (
  'Sent', 'Waiting', 'Follow-up', 'Interview', 'Offer', 'Rejected', 'Closed'
);

CREATE TYPE priority AS ENUM ('Low', 'Medium', 'High');

CREATE TYPE outcome AS ENUM ('None', 'Rejected', 'Interview', 'Offer');

-- Table: companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type company_type NOT NULL DEFAULT 'Other',
  main_location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_companies_name ON companies(name);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own companies"
  ON companies FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table: contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  exact_title TEXT,
  category contact_category,
  seniority seniority,
  location TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  manager_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_manager_id ON contacts(manager_id);
CREATE INDEX idx_contacts_email ON contacts(email);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own contacts"
  ON contacts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table: interactions (one per contact)
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role_title TEXT,
  global_category interaction_global_category,
  type interaction_type,
  status interaction_status NOT NULL DEFAULT 'Sent',
  priority priority,
  date_sent DATE,
  last_update DATE,
  next_follow_up_date DATE,
  outcome outcome,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interactions_user_id ON interactions(user_id);
CREATE INDEX idx_interactions_company_id ON interactions(company_id);
CREATE INDEX idx_interactions_contact_id ON interactions(contact_id);
CREATE INDEX idx_interactions_status ON interactions(status);
CREATE INDEX idx_interactions_date_sent ON interactions(date_sent DESC);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own interactions"
  ON interactions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
