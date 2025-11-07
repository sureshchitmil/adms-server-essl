const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

async function createAdminUser(email, password) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
  }

  if (!email || !password) {
    console.error('❌ Usage: node create-admin-user-quick.js <email> <password>');
    console.error('   Example: node create-admin-user-quick.js admin@example.com MySecurePass123');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    process.exit(1);
  }

  // Create admin client with service role key
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('👤 Creating admin user...\n');
  console.log('Email:', email);
  console.log('');

  try {
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        created_by: 'setup-script'
      }
    });

    if (createError) {
      if (createError.message.includes('already registered')) {
        console.error('❌ User with this email already exists');
        console.log('\n💡 Try a different email or reset the password in Supabase Dashboard\n');
      } else {
        console.error('❌ Error creating user:', createError.message);
      }
      process.exit(1);
    }

    if (userData && userData.user) {
      console.log('✅ Admin user created successfully!\n');
      console.log('📋 User Details:');
      console.log('   Email:', userData.user.email);
      console.log('   User ID:', userData.user.id);
      console.log('   Email Confirmed: Yes');
      console.log('   Created At:', new Date(userData.user.created_at).toLocaleString());
      console.log('');
      console.log('🚀 You can now log in at: http://localhost:3000/login');
      console.log('');
    } else {
      console.error('❌ Unexpected error: User data not returned');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const email = args[0];
const password = args[1];

createAdminUser(email, password).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

