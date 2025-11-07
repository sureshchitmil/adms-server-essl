# Create Admin User

## Option 1: Interactive Script (Recommended)

Run the interactive script and follow the prompts:

```bash
node scripts/create-admin-user.js
```

You'll be prompted to enter:
- Email address
- Password (min 6 characters)
- Password confirmation

## Option 2: Quick Script (Command Line)

Create a user directly with command line arguments:

```bash
node scripts/create-admin-user-quick.js admin@example.com YourPassword123
```

**Example:**
```bash
node scripts/create-admin-user-quick.js admin@company.com AdminPass123!
```

## Option 3: Via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/fqtvkefkrtcwqiickapy/auth/users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. Set "Auto Confirm User" to ON
5. Click "Create user"

## After Creating User

1. Log in at: http://localhost:3000/login
2. Use the email and password you created
3. Start managing devices and employees!

## Troubleshooting

### User already exists
- Use a different email address
- Or reset the password in Supabase Dashboard

### Password too short
- Password must be at least 6 characters

### Can't log in
- Verify the user was created successfully
- Check that email confirmation is enabled
- Ensure the app is running: `npm run dev`

