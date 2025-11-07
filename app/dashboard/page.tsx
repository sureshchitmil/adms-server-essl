import { createClient } from '@/lib/supabase/server';
import DeviceDashboard from '@/components/device-dashboard';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .order('last_seen', { ascending: false });

  return <DeviceDashboard initialDevices={devices || []} />;
}

