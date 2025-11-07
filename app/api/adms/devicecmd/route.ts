import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Endpoint for command result acknowledgment (devicecmd)
// Devices POST command execution results here
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceSN = searchParams.get('SN');

    // Always return OK even if SN is missing (devices expect 200 OK)
    if (!deviceSN) {
      console.warn('[devicecmd] Missing SN parameter');
      return new NextResponse('OK', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    const body = await request.text();
    console.log(`[devicecmd] Device SN: ${deviceSN}`);
    console.log(`[devicecmd] Command result: ${body.substring(0, 500)}`);

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

    // Parse command result
    // Format might be: OK <CommandID> or ERROR <CommandID> <Message>
    if (body && body.trim()) {
      const lines = body.split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Handle OK acknowledgment
        if (trimmedLine.startsWith('OK ')) {
          const commandIdMatch = trimmedLine.match(/OK\s+(\d+)/);
          if (commandIdMatch) {
            const commandId = parseInt(commandIdMatch[1], 10);
            await supabase
              .from('pending_commands')
              .update({ status: 'acked' })
              .eq('command_id', commandId)
              .eq('device_sn', deviceSN);
          }
        }
        // Handle ERROR acknowledgment
        else if (trimmedLine.startsWith('ERROR ')) {
          const errorMatch = trimmedLine.match(/ERROR\s+(\d+)\s+(.+)/);
          if (errorMatch) {
            const commandId = parseInt(errorMatch[1], 10);
            const errorMessage = errorMatch[2];
            await supabase
              .from('pending_commands')
              .update({ 
                status: 'failed',
                // Could store error message if we add a column for it
              })
              .eq('command_id', commandId)
              .eq('device_sn', deviceSN);
            console.error(`[devicecmd] Command ${commandId} failed: ${errorMessage}`);
          }
        }
      }
    }

    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error: any) {
    console.error('Error processing devicecmd:', error);
    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

