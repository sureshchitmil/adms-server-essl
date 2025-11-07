# Database Migrations

This directory contains SQL migration files for setting up the ADMS Server database schema.

## Running Migrations

### Option 1: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of each migration file in order
4. Execute each migration

### Option 2: Via Supabase CLI
```bash
supabase db push
```

## Migration Files

1. `001_initial_schema.sql` - Creates all tables, indexes, triggers, and RLS policies
2. `002_enable_realtime.sql` - Enables Realtime for devices and attendance_logs tables

## Storage Bucket Setup

After running the migrations, you need to create the storage bucket manually:

1. Go to Supabase Dashboard > Storage
2. Create a new bucket named `attendance-photos`
3. Set it to public or configure RLS policies as needed
4. Allow authenticated users to read and service role to write

