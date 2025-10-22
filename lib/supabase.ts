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
