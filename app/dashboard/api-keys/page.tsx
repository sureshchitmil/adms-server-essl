import { createClient } from '@/lib/supabase/server';
import ApiKeyManagement from '@/components/api-key-management';

export default async function ApiKeysPage() {
  const supabase = createClient();
  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('*')
    .order('created_at', { ascending: false });

  return <ApiKeyManagement initialApiKeys={apiKeys || []} />;
}

