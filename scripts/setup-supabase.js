const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function executeSQL(supabase, sql) {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  const results = [];
  
  for (const statement of statements) {
    if (statement.length < 10) continue;
    
    try {
      // Use the REST API to execute SQL
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: statement }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Some errors are expected (like "already exists")
        if (!errorText.includes('already exists') && !errorText.includes('duplicate')) {
          console.warn(`  ⚠️  ${errorText.substring(0, 100)}`);
        }
      }
    } catch (error) {
      // Try alternative method using PostgREST
      try {
        // For DDL statements, we need to use the Postgres connection directly
        // This is a limitation - we'll need to use the dashboard or psql
        console.warn(`  ⚠️  Cannot execute DDL via REST API: ${statement.substring(0, 50)}...`);
      } catch (e) {
        // Ignore
      }
    }
  }
  
  return results;
}

async function setupDatabase() {
  console.log('🚀 Setting up Supabase Database for ADMS Server\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables!');
    console.error('Please ensure .env.local exists with:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY\n');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`   Supabase URL: ${supabaseUrl}\n`);

  // Read migration files
  const migration1Path = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
  const migration2Path = path.join(__dirname, '../supabase/migrations/002_enable_realtime.sql');

  if (!fs.existsSync(migration1Path) || !fs.existsSync(migration2Path)) {
    console.error('❌ Migration files not found!');
    process.exit(1);
  }

  const migration1 = fs.readFileSync(migration1Path, 'utf-8');
  const migration2 = fs.readFileSync(migration2Path, 'utf-8');

  console.log('📋 Migration files found\n');
  console.log('⚠️  IMPORTANT: Supabase REST API cannot execute DDL statements directly.');
  console.log('   You need to run these migrations in the Supabase Dashboard.\n');
  console.log('📝 Instructions:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/fqtvkefkrtcwqiickapy/sql');
  console.log('2. Click "New Query"');
  console.log('3. Copy and paste the contents of: supabase/migrations/001_initial_schema.sql');
  console.log('4. Click "Run"');
  console.log('5. Copy and paste the contents of: supabase/migrations/002_enable_realtime.sql');
  console.log('6. Click "Run"\n');
  console.log('📦 Storage Setup:');
  console.log('1. Go to: https://supabase.com/dashboard/project/fqtvkefkrtcwqiickapy/storage/buckets');
  console.log('2. Click "New bucket"');
  console.log('3. Name: attendance-photos');
  console.log('4. Set to Public or configure RLS policies\n');
  
  // Write migration files to a convenient location
  const outputDir = path.join(__dirname, '../migrations-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  fs.writeFileSync(path.join(outputDir, '001_initial_schema.sql'), migration1);
  fs.writeFileSync(path.join(outputDir, '002_enable_realtime.sql'), migration2);
  
  console.log('✅ Migration files copied to: migrations-output/\n');
  console.log('💡 Tip: You can copy the SQL from the migrations-output/ folder\n');
}

setupDatabase().catch(console.error);

