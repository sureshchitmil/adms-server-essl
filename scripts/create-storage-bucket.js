const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

async function createStorageBucket() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('📦 Creating storage bucket "attendance-photos"...\n');

  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      process.exit(1);
    }

    const existingBucket = buckets.find(b => b.name === 'attendance-photos');
    if (existingBucket) {
      console.log('✅ Bucket "attendance-photos" already exists\n');
      return;
    }

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('attendance-photos', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg']
    });

    if (error) {
      console.error('❌ Error creating bucket:', error.message);
      console.log('\n💡 Please create it manually:');
      console.log('   https://supabase.com/dashboard/project/fqtvkefkrtcwqiickapy/storage/buckets\n');
      process.exit(1);
    }

    console.log('✅ Storage bucket "attendance-photos" created successfully!\n');
    console.log('   Bucket ID:', data.id);
    console.log('   Public:', data.public);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Please create it manually:');
    console.log('   https://supabase.com/dashboard/project/fqtvkefkrtcwqiickapy/storage/buckets\n');
  }
}

createStorageBucket().catch(console.error);

