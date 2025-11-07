import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceSN = searchParams.get('SN');

    if (!deviceSN) {
      return new NextResponse('SN parameter required', { status: 400 });
    }

    const supabase = createServiceClient();

    // Find pending command for this device
    const { data: command, error } = await supabase
      .from('pending_commands')
      .select('*')
      .eq('device_sn', deviceSN)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !command) {
      // No pending commands, return OK
      return new NextResponse('OK', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // Update command status to 'sent'
    await supabase
      .from('pending_commands')
      .update({ status: 'sent' })
      .eq('id', command.id);

    // Return command in format: C:COMMAND_ID:COMMAND_STRING\n
    const response = `C:${command.command_id}:${command.command_string}\n`;
    
    return new NextResponse(response, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error processing getrequest:', error);
    return new NextResponse('Error processing request', { status: 500 });
  }
}

