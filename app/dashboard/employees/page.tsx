import { createClient } from '@/lib/supabase/server';
import EmployeeManagement from '@/components/employee-management';

export default async function EmployeesPage() {
  const supabase = createClient();
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .order('employee_code', { ascending: true });

  return <EmployeeManagement initialEmployees={employees || []} />;
}

