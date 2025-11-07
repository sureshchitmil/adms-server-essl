const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

async function verifyDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔍 Verifying database setup...\n');

  const requiredTables = [
    'devices',
    'employees',
    'biometric_templates',
    'attendance_logs',
    'pending_commands',
    'api_keys',
  ];

  const results = {};

  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        results[table] = { exists: false, error: error.message };
      } else {
        results[table] = { exists: true };
      }
    } catch (err) {
      results[table] = { exists: false, error: err.message };
    }
  }

  console.log('📊 Table Status:\n');
  let allGood = true;
  for (const [table, result] of Object.entries(results)) {
    if (result.exists) {
      console.log(`  ✅ ${table}`);
    } else {
      console.log(`  ❌ ${table} - ${result.error}`);
      allGood = false;
    }
  }

  // Check storage bucket
  console.log('\n📦 Storage Bucket Status:\n');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.log(`  ⚠️  Could not check buckets: ${error.message}`);
    } else {
      const attendancePhotosBucket = buckets.find(b => b.name === 'attendance-photos');
      if (attendancePhotosBucket) {
        console.log('  ✅ attendance-photos bucket exists');
      } else {
        console.log('  ❌ attendance-photos bucket not found');
        console.log('     Create it in: Supabase Dashboard → Storage → Buckets');
        allGood = false;
      }
    }
  } catch (err) {
    console.log(`  ⚠️  Could not check storage: ${err.message}`);
  }

  console.log('\n' + '='.repeat(50));
  if (allGood) {
    console.log('✅ Database setup verified successfully!');
  } else {
    console.log('❌ Some components are missing. Please complete the setup.');
    console.log('\nSee SETUP.md for detailed instructions.');
  }
  console.log('='.repeat(50) + '\n');
}

verifyDatabase().catch(console.error);

