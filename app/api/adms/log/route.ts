import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Endpoint for diagnostic logs (log)
// Devices POST diagnostic/log information here
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceSN = searchParams.get('SN');

    // Always return OK even if SN is missing (devices expect 200 OK)
    if (!deviceSN) {
      console.warn('[log] Missing SN parameter');
      return new NextResponse('OK', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    const body = await request.text();
    console.log(`[log] Device SN: ${deviceSN}`);
    console.log(`[log] Diagnostic log: ${body.substring(0, 1000)}`);

    const supabase = createServiceClient();

    // Update device last_seen
    await supabase
      .from('devices')
      .upsert({
        serial_number: deviceSN,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'serial_number',
      });

    // Log diagnostic information (could be stored in a logs table if needed)
    // For now, we just log to console/server logs
    if (body && body.trim()) {
      // Could store in a device_logs table if you create one
      console.log(`[log] Full log from ${deviceSN}:`, body);
    }

    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error: any) {
    console.error('Error processing log:', error);
    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

// Some devices may GET logs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceSN = searchParams.get('SN');

    // Always return OK
    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error: any) {
    console.error('Error processing log GET:', error);
    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

