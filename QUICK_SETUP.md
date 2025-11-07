# Quick Setup Guide

## ✅ Step 1: Run Database Migrations

**Direct Link to SQL Editor:**
https://supabase.com/dashboard/project/fqtvkefkrtcwqiickapy/sql

### Migration 1: Initial Schema
1. Click "New Query" in SQL Editor
2. Copy ALL contents from: `supabase/migrations/001_initial_schema.sql`
3. Paste and click "Run"
4. Wait for "Success" message

### Migration 2: Enable Realtime  
1. Click "New Query" again
2. Copy ALL contents from: `supabase/migrations/002_enable_realtime.sql`
3. Paste and click "Run"
4. Wait for "Success" message

## ✅ Step 2: Create Storage Bucket

**Direct Link to Storage:**
https://supabase.com/dashboard/project/fqtvkefkrtcwqiickapy/storage/buckets

1. Click "New bucket"
2. Name: `attendance-photos`
3. Make it **Public** (or configure RLS)
4. Click "Create bucket"

## ✅ Step 3: Verify Setup

Run this command:
```bash
node scripts/verify-database.js
```

You should see all ✅ green checkmarks.

## ✅ Step 4: Create Admin User

**Direct Link to Auth:**
https://supabase.com/dashboard/project/fqtvkefkrtcwqiickapy/auth/users

1. Click "Add user" → "Create new user"
2. Enter email and password
3. Save credentials for login

## 🚀 Ready to Go!

After completing all steps:
1. Your app is running at: http://localhost:3000
2. Log in at: http://localhost:3000/login
3. Start managing devices!

---

**Need help?** See `SETUP.md` for detailed instructions.

