import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { validateApiKey } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
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
    const { data: employee, error } = await supabase
      .from('employees')
      .select('employee_code, name, rfid_card')
      .eq('employee_code', params.code)
      .single();

    if (error || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: employee,
    });
  } catch (error) {
    console.error('Error in GET /api/v1/employees/[code]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

