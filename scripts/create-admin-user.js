const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdminUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables!');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
    process.exit(1);
  }

  // Create admin client with service role key
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('👤 Create Admin User for ADMS Server\n');
  console.log('Supabase URL:', supabaseUrl);
  console.log('');

  try {
    // Get email
    const email = await question('Enter email address: ');
    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      rl.close();
      process.exit(1);
    }

    // Get password
    const password = await question('Enter password (min 6 characters): ');
    if (!password || password.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      rl.close();
      process.exit(1);
    }

    // Confirm password
    const confirmPassword = await question('Confirm password: ');
    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match');
      rl.close();
      process.exit(1);
    }

    console.log('\n⏳ Creating user...\n');

    // Create user using admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'admin',
        created_by: 'setup-script'
      }
    });

    if (createError) {
      if (createError.message.includes('already registered')) {
        console.error('❌ User with this email already exists');
        console.log('\n💡 You can reset the password or use a different email.\n');
      } else {
        console.error('❌ Error creating user:', createError.message);
      }
      rl.close();
      process.exit(1);
    }

    if (userData && userData.user) {
      console.log('✅ Admin user created successfully!\n');
      console.log('📋 User Details:');
      console.log('   Email:', userData.user.email);
      console.log('   User ID:', userData.user.id);
      console.log('   Email Confirmed:', userData.user.email_confirmed_at ? 'Yes' : 'No');
      console.log('   Created At:', new Date(userData.user.created_at).toLocaleString());
      console.log('');
      console.log('🚀 You can now log in at: http://localhost:3000/login');
      console.log('');
    } else {
      console.error('❌ Unexpected error: User data not returned');
      rl.close();
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

createAdminUser().catch((error) => {
  console.error('❌ Fatal error:', error);
  rl.close();
  process.exit(1);
});

