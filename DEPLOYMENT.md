# Deployment Guide

## Prerequisites

1. Supabase project set up
2. Vercel account
3. Environment variables configured

## Steps

### 1. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_enable_realtime.sql`

### 2. Storage Setup

1. Go to Supabase Dashboard > Storage
2. Create a new bucket named `attendance-photos`
3. Set it to public or configure RLS policies:
   - Allow service role to write
   - Allow authenticated users to read

### 3. Environment Variables

Set the following environment variables in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (keep secret!)

### 4. Deploy to Vercel

1. Connect your repository to Vercel
2. Vercel will automatically detect Next.js
3. The `next.config.js` already has URL rewrites configured
4. Deploy!

### 5. Configure Device URLs

After deployment, configure your eSSL devices with:
- Server URL: `https://your-app.vercel.app`
- Data Push URL: `/iclock/cdata`
- Command Poll URL: `/iclock/getrequest`

## Post-Deployment

1. Create an admin user in Supabase Auth
2. Log in to the dashboard
3. Generate API keys for external systems
4. Configure devices to connect

## Troubleshooting

- Check Vercel function logs for API route errors
- Verify Supabase connection in environment variables
- Ensure Realtime is enabled on devices and attendance_logs tables
- Check storage bucket permissions

