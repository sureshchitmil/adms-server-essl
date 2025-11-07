import { createServiceClient } from '@/lib/supabase/service';
import bcrypt from 'bcryptjs';

export async function validateApiKey(apiKey: string | null): Promise<boolean> {
  if (!apiKey) {
    return false;
  }

  // Remove 'Bearer ' prefix if present
  const key = apiKey.startsWith('Bearer ') ? apiKey.substring(7) : apiKey;

  const supabase = createServiceClient();
  
  // Get all API keys from database
  const { data: apiKeys, error } = await supabase
    .from('api_keys')
    .select('hashed_key');

  if (error || !apiKeys) {
    return false;
  }

  // Compare the provided key with all hashed keys
  for (const apiKeyRecord of apiKeys) {
    try {
      const isValid = await bcrypt.compare(key, apiKeyRecord.hashed_key);
      if (isValid) {
        return true;
      }
    } catch (error) {
      // Continue to next key if comparison fails
      continue;
    }
  }

  return false;
}

export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, 10);
}
