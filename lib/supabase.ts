import { createClient } from '@supabase/supabase-js';

// Supabase client for client-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type AuditRecord = {
  id: string;
  created_at: string;
  business_name: string;
  city: string;
  primary_category: string;
  review_count: number;
  rating: number;
  photos_last_30d: number;
  has_qa: boolean;
  posts_per_month: number;
  has_website: boolean;
  has_hours: boolean;
  has_services: boolean;
  has_booking_link: boolean;
  has_duplicate_listing: boolean;
  nap_consistent: boolean;
  score: number;
  user_id?: string;
  email?: string;
};

export type SavedAudit = {
  id: string;
  created_at: string;
  audit_data: any;
  score: number;
  business_name: string;
  user_email?: string;
};

// Lead from complete audit form
export type Lead = {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  phone: string;
  business_name: string;
  website: string;
  street?: string;
  city: string;
  zip?: string;
  category: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  source: string;
  notes?: string;
  assigned_to?: string;
};

// Complete audit results
export type CompleteAudit = {
  id: string;
  created_at: string;
  lead_id: string;
  seo_local_score: number;
  seo_onsite_score: number;
  citation_coverage: number;
  keyword_count: number;
  report_sent: boolean;
  report_sent_at?: string;
  email_opened?: boolean;
  email_opened_at?: string;
  raw_seo_data?: any;
  raw_citation_data?: any;
  raw_keyword_data?: any;
};
