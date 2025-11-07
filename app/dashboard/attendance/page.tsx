import { createClient } from '@/lib/supabase/server';
import AttendanceViewer from '@/components/attendance-viewer';

export default async function AttendancePage() {
  const supabase = createClient();
  
  // Get attendance logs with related data
  const { data: logs } = await supabase
    .from('attendance_logs')
    .select(`
      *,
      employees:employee_id (
        employee_code,
        name
      ),
      devices:device_id (
        serial_number,
        name
      )
    `)
    .order('punch_timestamp', { ascending: false })
    .limit(100);

  return <AttendanceViewer initialLogs={logs || []} />;
}

