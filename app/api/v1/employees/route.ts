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

    const supabase = createServiceClient();
    const { data: employees, error } = await supabase
      .from('employees')
      .select('employee_code, name, rfid_card')
      .order('employee_code', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: employees || [],
    });
  } catch (error) {
    console.error('Error in GET /api/v1/employees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

