const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Allow self-signed certificates for Supabase
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function createTables() {
  // Use the non-pooling connection for DDL operations
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error('❌ Missing POSTGRES_URL or POSTGRES_URL_NON_POOLING in .env.local');
    process.exit(1);
  }

  console.log('🔌 Connecting to Supabase PostgreSQL...\n');

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read migration files
    const migration1Path = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
    const migration2Path = path.join(__dirname, '../supabase/migrations/002_enable_realtime.sql');

    const migration1 = fs.readFileSync(migration1Path, 'utf-8');
    const migration2 = fs.readFileSync(migration2Path, 'utf-8');

    console.log('📋 Executing Migration 1: Initial Schema...\n');
    
    // Execute the entire migration as one transaction
    // Remove comments and split intelligently
    const cleanMigration1 = migration1
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    try {
      await client.query(cleanMigration1);
      console.log('  ✅ Migration 1 executed successfully\n');
    } catch (error) {
      // If it fails, try executing in smaller chunks
      console.log('  ⚠️  Full migration failed, trying chunked execution...\n');
      
      // Split by semicolon but preserve dollar-quoted strings
      const statements = [];
      let currentStatement = '';
      let inDollarQuote = false;
      let dollarTag = '';
      
      for (const line of cleanMigration1.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Check for dollar-quoted strings ($$ or $tag$)
        const dollarMatch = trimmed.match(/\$([^$]*)\$/g);
        if (dollarMatch) {
          for (const match of dollarMatch) {
            if (!inDollarQuote) {
              inDollarQuote = true;
              dollarTag = match;
            } else if (match === dollarTag) {
              inDollarQuote = false;
              dollarTag = '';
            }
          }
        }
        
        currentStatement += line + '\n';
        
        if (!inDollarQuote && trimmed.endsWith(';')) {
          const stmt = currentStatement.trim();
          if (stmt.length > 10) {
            statements.push(stmt);
          }
          currentStatement = '';
        }
      }
      
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }
      
      let successCount = 0;
      let skipCount = 0;
      
      for (let i = 0; i < statements.length; i++) {
        try {
          await client.query(statements[i]);
          successCount++;
          if ((i + 1) % 5 === 0) {
            process.stdout.write(`  Progress: ${i + 1}/${statements.length} statements\r`);
          }
        } catch (error) {
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate') ||
              error.message.includes('already defined')) {
            skipCount++;
          } else {
            // Only show first few errors to avoid spam
            if (i < 5) {
              console.error(`\n  ⚠️  Statement ${i + 1}: ${error.message.substring(0, 80)}`);
            }
          }
        }
      }
      
      console.log(`\n  ✅ Executed: ${successCount}, Skipped: ${skipCount}\n`);
    }

    console.log('📋 Executing Migration 2: Enable Realtime...\n');
    
    try {
      await client.query(migration2);
      console.log('  ✅ Migration 2 executed successfully\n');
    } catch (error) {
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate')) {
        console.log('  ⚠️  Realtime already enabled (skipped)\n');
      } else {
        console.error(`  ⚠️  Error: ${error.message}\n`);
      }
    }

    // Verify tables were created
    console.log('🔍 Verifying tables...\n');
    const { rows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const requiredTables = [
      'devices',
      'employees',
      'biometric_templates',
      'attendance_logs',
      'pending_commands',
      'api_keys',
    ];

    console.log('📊 Created Tables:');
    const createdTables = rows.map(r => r.table_name);
    let allCreated = true;
    for (const table of requiredTables) {
      if (createdTables.includes(table)) {
        console.log(`  ✅ ${table}`);
      } else {
        console.log(`  ❌ ${table} - NOT FOUND`);
        allCreated = false;
      }
    }

    if (allCreated) {
      console.log('\n✅ All tables created successfully!\n');
    } else {
      console.log('\n⚠️  Some tables are missing. Check errors above.\n');
    }

    console.log('📦 Next step: Create storage bucket "attendance-photos" in Supabase Dashboard');
    console.log('   Link: https://supabase.com/dashboard/project/fqtvkefkrtcwqiickapy/storage/buckets\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTables().catch(console.error);
