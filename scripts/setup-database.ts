import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function setupDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables:');
    console.error('  NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.error('  SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Setting up database...');

  // Read migration files
  const migration1 = readFileSync(
    join(__dirname, '../supabase/migrations/001_initial_schema.sql'),
    'utf-8'
  );
  const migration2 = readFileSync(
    join(__dirname, '../supabase/migrations/002_enable_realtime.sql'),
    'utf-8'
  );

  try {
    // Execute first migration
    console.log('Executing migration 001_initial_schema.sql...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: migration1,
    });

    if (error1) {
      // Try direct query execution
      console.log('Trying direct SQL execution...');
      const queries1 = migration1.split(';').filter((q) => q.trim().length > 0);
      for (const query of queries1) {
        if (query.trim()) {
          const { error } = await supabase.rpc('exec_sql', { sql: query });
          if (error && !error.message.includes('already exists')) {
            console.warn('Query warning:', error.message);
          }
        }
      }
    }

    // Execute second migration
    console.log('Executing migration 002_enable_realtime.sql...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: migration2,
    });

    if (error2) {
      const queries2 = migration2.split(';').filter((q) => q.trim().length > 0);
      for (const query of queries2) {
        if (query.trim()) {
          const { error } = await supabase.rpc('exec_sql', { sql: query });
          if (error && !error.message.includes('already exists')) {
            console.warn('Query warning:', error.message);
          }
        }
      }
    }

    console.log('Database setup completed!');
  } catch (error: any) {
    console.error('Error setting up database:', error.message);
    console.log('\nPlease run the migrations manually in Supabase SQL Editor:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Copy and paste the contents of supabase/migrations/001_initial_schema.sql');
    console.log('3. Execute it');
    console.log('4. Copy and paste the contents of supabase/migrations/002_enable_realtime.sql');
    console.log('5. Execute it');
    process.exit(1);
  }
}

setupDatabase();

