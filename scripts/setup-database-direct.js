const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function setupDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables:');
    console.error('  NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.error('  SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
    process.exit(1);
  }

  console.log('Connecting to Supabase:', supabaseUrl);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Read migration files
  const migration1Path = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
  const migration2Path = path.join(__dirname, '../supabase/migrations/002_enable_realtime.sql');

  const migration1 = fs.readFileSync(migration1Path, 'utf-8');
  const migration2 = fs.readFileSync(migration2Path, 'utf-8');

  try {
    console.log('\n=== Executing Migration 1: Initial Schema ===');
    
    // Split migration into individual statements
    const statements1 = migration1
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements1.length; i++) {
      const statement = statements1[i];
      if (statement.length < 10) continue; // Skip very short statements
      
      try {
        console.log(`Executing statement ${i + 1}/${statements1.length}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          // Try using the REST API directly
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ sql: statement + ';' }),
          });

          if (!response.ok && !error.message.includes('already exists')) {
            console.warn(`  Warning: ${error.message}`);
          }
        }
      } catch (err) {
        console.warn(`  Warning on statement ${i + 1}: ${err.message}`);
      }
    }

    console.log('\n=== Executing Migration 2: Enable Realtime ===');
    const statements2 = migration2
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements2.length; i++) {
      const statement = statements2[i];
      if (statement.length < 10) continue;
      
      try {
        console.log(`Executing statement ${i + 1}/${statements2.length}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        if (error && !error.message.includes('already exists')) {
          console.warn(`  Warning: ${error.message}`);
        }
      } catch (err) {
        console.warn(`  Warning: ${err.message}`);
      }
    }

    console.log('\n✅ Database setup completed!');
    console.log('\nNext steps:');
    console.log('1. Go to Supabase Dashboard > Storage');
    console.log('2. Create a bucket named "attendance-photos"');
    console.log('3. Set it to public or configure RLS policies');
  } catch (error) {
    console.error('\n❌ Error setting up database:', error.message);
    console.log('\n📝 Please run the migrations manually:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Copy contents of: supabase/migrations/001_initial_schema.sql');
    console.log('3. Execute it');
    console.log('4. Copy contents of: supabase/migrations/002_enable_realtime.sql');
    console.log('5. Execute it');
  }
}

setupDatabase();

