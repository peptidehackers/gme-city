# Supabase Database Setup

This directory contains SQL migration files for setting up the GMB City database tables.

## Tables

### 1. `leads`
Stores contact information from the complete audit form submissions.

**Fields:**
- `id` - UUID primary key
- `email` - Contact email (required)
- `phone` - Contact phone (required)
- `business_name` - Business name (required)
- `website` - Business website (required)
- `street` - Street address (optional)
- `city` - City (required)
- `zip` - ZIP code (optional)
- `category` - Business category (required)
- `status` - Lead status: `new`, `contacted`, `qualified`, `converted`, `lost`
- `source` - Lead source (default: `complete_audit`)
- `notes` - Internal notes (optional)
- `assigned_to` - UUID of assigned user (optional)
- `created_at` - Timestamp
- `updated_at` - Timestamp (auto-updates)

### 2. `complete_audits`
Stores audit results for each lead.

**Fields:**
- `id` - UUID primary key
- `lead_id` - Foreign key to leads table
- `seo_local_score` - Local SEO score (0-100)
- `seo_onsite_score` - On-site SEO score (0-100)
- `citation_coverage` - Citation coverage percentage (0-100)
- `keyword_count` - Number of keyword opportunities found
- `report_sent` - Whether email report was sent
- `report_sent_at` - Timestamp when report was sent
- `email_opened` - Whether email was opened
- `email_opened_at` - Timestamp when email was opened
- `raw_seo_data` - Full SEO API response (JSONB, optional)
- `raw_citation_data` - Full citation API response (JSONB, optional)
- `raw_keyword_data` - Full keyword API response (JSONB, optional)
- `created_at` - Timestamp

## How to Run Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to the **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `001_create_leads_table.sql`
5. Click **Run** to execute
6. Repeat for `002_create_complete_audits_table.sql`

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

### Option 3: Manual SQL Execution

1. Open your Supabase project
2. Go to **Database** → **SQL Editor**
3. Execute each migration file in order:
   - First: `001_create_leads_table.sql`
   - Second: `002_create_complete_audits_table.sql`

## Verification

After running the migrations, verify the tables were created:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('leads', 'complete_audits');

-- Check leads table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leads';

-- Check complete_audits table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'complete_audits';
```

## Row Level Security (RLS)

Both tables have RLS enabled with the following policies:

### Leads Table
- **Service role**: Full access (for API routes)
- **Authenticated users**: Can view leads assigned to them

### Complete Audits Table
- **Service role**: Full access (for API routes)
- **Authenticated users**: Can view audits for leads assigned to them

## Environment Variables

Make sure your `.env.local` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

The service role key is automatically used in API routes via the anon key.

## API Integration

The complete audit API route (`/api/complete-audit`) automatically:

1. **Saves lead data** to the `leads` table
2. **Runs all audits** (SEO, Citations, Keywords)
3. **Sends email report** with results
4. **Saves audit results** to the `complete_audits` table

No additional code changes needed - the integration is already complete!

## Querying Data

Example queries to access your lead data:

```sql
-- Get all leads with their audit results
SELECT
  l.business_name,
  l.email,
  l.city,
  l.status,
  ca.seo_local_score,
  ca.seo_onsite_score,
  ca.citation_coverage,
  ca.keyword_count,
  ca.report_sent,
  l.created_at
FROM leads l
LEFT JOIN complete_audits ca ON ca.lead_id = l.id
ORDER BY l.created_at DESC;

-- Get leads by status
SELECT * FROM leads
WHERE status = 'new'
ORDER BY created_at DESC;

-- Get average scores across all audits
SELECT
  AVG(seo_local_score) as avg_local_score,
  AVG(seo_onsite_score) as avg_onsite_score,
  AVG(citation_coverage) as avg_citation_coverage
FROM complete_audits;

-- Get leads with low SEO scores (opportunities)
SELECT
  l.business_name,
  l.email,
  l.phone,
  ca.seo_local_score,
  ca.seo_onsite_score
FROM leads l
JOIN complete_audits ca ON ca.lead_id = l.id
WHERE ca.seo_local_score < 50 OR ca.seo_onsite_score < 50
ORDER BY ca.created_at DESC;
```

## Troubleshooting

### Error: "permission denied for table leads"
- Make sure RLS policies are set up correctly
- Verify you're using the service_role key in API routes

### Error: "relation leads does not exist"
- Run the migration files in order
- Check that migrations were executed successfully

### Data not being saved
- Check the console logs in your API route
- Verify environment variables are set correctly
- Test the connection: `supabase db ping`

## Support

For issues with Supabase setup, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase SQL Editor Guide](https://supabase.com/docs/guides/database/overview)
