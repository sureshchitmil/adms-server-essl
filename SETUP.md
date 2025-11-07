# Supabase Database Setup Guide

## Prerequisites

✅ Environment variables are configured in `.env.local` (copied from `.env.example`)

## Step 1: Run Database Migrations

### Option A: Via Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/fqtvkefkrtcwqiickapy/sql
   - Or navigate: Dashboard → Your Project → SQL Editor

2. **Run First Migration**
   - Click "New Query"
   - Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
   - Paste into the SQL editor
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - Wait for success message

3. **Run Second Migration**
   - Click "New Query" again
   - Copy the entire contents of `supabase/migrations/002_enable_realtime.sql`
   - Paste into the SQL editor
   - Click "Run"
   - Wait for success message

### Option B: Via Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref fqtvkefkrtcwqiickapy

# Run migrations
supabase db push
```

## Step 2: Verify Tables Created

Run the verification script:

```bash
node scripts/verify-database.js
```

Or manually check in Supabase Dashboard:
- Go to: Table Editor
- You should see these tables:
  - ✅ `devices`
  - ✅ `employees`
  - ✅ `biometric_templates`
  - ✅ `attendance_logs`
  - ✅ `pending_commands`
  - ✅ `api_keys`

## Step 3: Set Up Storage Bucket

1. **Create Storage Bucket**
   - Go to: https://supabase.com/dashboard/project/fqtvkefkrtcwqiickapy/storage/buckets
   - Click "New bucket"
   - Name: `attendance-photos`
   - Set to **Public** (or configure RLS policies manually)
   - Click "Create bucket"

2. **Configure RLS Policies (if bucket is private)**
   - Go to Storage → Policies
   - Create policy for `attendance-photos` bucket:
     - Policy name: "Allow service role write"
     - Allowed operation: INSERT, UPDATE
     - Target roles: service_role
   - Create policy:
     - Policy name: "Allow authenticated read"
     - Allowed operation: SELECT
     - Target roles: authenticated

## Step 4: Enable Realtime (Verify)

The migration `002_enable_realtime.sql` should have enabled Realtime. Verify:

1. Go to: Database → Replication
2. Check that `devices` and `attendance_logs` tables are listed
3. If not, run this SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_logs;
```

## Step 5: Create Admin User

1. Go to: Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. Save the credentials (you'll need them to log in)

## Verification Checklist

- [ ] All 6 tables exist in Table Editor
- [ ] Storage bucket `attendance-photos` exists
- [ ] Realtime enabled for `devices` and `attendance_logs`
- [ ] Admin user created in Authentication
- [ ] Environment variables set in `.env.local`

## Troubleshooting

### Tables already exist
If you see "relation already exists" errors, the tables are already created. You can:
- Drop and recreate (⚠️ deletes data)
- Or skip the migration and verify tables exist

### Permission errors
- Ensure you're using the correct Supabase project
- Check that your service role key is correct in `.env.local`

### Realtime not working
- Verify tables are added to `supabase_realtime` publication
- Check Database → Replication settings

## Next Steps

After setup is complete:
1. Start the development server: `npm run dev`
2. Log in at: http://localhost:3000/login
3. Generate API keys in the dashboard
4. Configure your eSSL devices to connect

