import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { validateApiKey } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Validate API key
    const authHeader = request.headers.get('authorization');
    const isValid = await validateApiKey(authHeader);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const employeeCode = searchParams.get('employee_code');

    const supabase = createServiceClient();
    let query = supabase
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
      .order('punch_timestamp', { ascending: false });

    // Apply filters
    if (startDate) {
      query = query.gte('punch_timestamp', startDate);
    }
    if (endDate) {
      query = query.lte('punch_timestamp', endDate);
    }
    if (employeeCode) {
      // First get employee ID
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_code', employeeCode)
        .single();

      if (employee) {
        query = query.eq('employee_id', employee.id);
      } else {
        // Return empty if employee not found
        return NextResponse.json({ data: [] });
      }
    }

    const { data: logs, error } = await query.limit(1000);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch attendance logs' },
        { status: 500 }
      );
    }

    // Format response
    const formattedLogs = (logs || []).map((log: any) => {
      let photoUrl = null;
      if (log.att_photo_path) {
        const { data } = supabase.storage
          .from('attendance-photos')
          .getPublicUrl(log.att_photo_path);
        photoUrl = data.publicUrl;
      }

      return {
        employee_code: log.employees?.employee_code || null,
        device_sn: log.devices?.serial_number || null,
        punch_timestamp: log.punch_timestamp,
        status_code: log.status_code,
        verify_mode: log.verify_mode,
        photo_url: photoUrl,
      };
    });

    return NextResponse.json({
      data: formattedLogs,
    });
  } catch (error) {
    console.error('Error in GET /api/v1/attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

