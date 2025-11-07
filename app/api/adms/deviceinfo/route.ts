import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Endpoint for device status/info (deviceinfo)
// Devices may POST device information here
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceSN = searchParams.get('SN');

    // Always return OK even if SN is missing (devices expect 200 OK)
    if (!deviceSN) {
      console.warn('[deviceinfo] Missing SN parameter');
      return new NextResponse('OK', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    const body = await request.text();
    console.log(`[deviceinfo] Device SN: ${deviceSN}`);
    console.log(`[deviceinfo] Body: ${body.substring(0, 500)}`);

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

    // Parse device info if provided
    if (body && body.trim()) {
      const lines = body.split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        const fields = line.split('\t');
        if (fields[0] === 'INFO') {
          // Parse device info similar to cdata endpoint
          const options: Record<string, string> = {};
          for (let i = 1; i < fields.length; i++) {
            const field = fields[i];
            if (field.startsWith('&options=')) {
              const optionsStr = field.substring(10);
              const optionPairs = optionsStr.split(',');
              for (const pair of optionPairs) {
                const [key, value] = pair.split('=');
                if (key && value) {
                  options[key] = value;
                }
              }
            }
          }

          const updateData: {
            supports_face?: boolean;
            supports_finger?: boolean;
            supports_rfid?: boolean;
            firmware_version?: string;
            name?: string;
          } = {};

          if (options.FaceFun === '1') updateData.supports_face = true;
          if (options.FingFun === '1') updateData.supports_finger = true;
          if (options.RFIDFun === '1' || options.RFID === '1') updateData.supports_rfid = true;
          if (options.FirmwareVersion) updateData.firmware_version = options.FirmwareVersion;
          if (options.DeviceName) updateData.name = options.DeviceName;

          await supabase
            .from('devices')
            .upsert({
              serial_number: deviceSN,
              ...updateData,
              last_seen: new Date().toISOString(),
            }, {
              onConflict: 'serial_number',
            });
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
    console.error('Error processing deviceinfo:', error);
    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

// Some devices may GET device info
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceSN = searchParams.get('SN');

    if (!deviceSN) {
      return new NextResponse('OK', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    const supabase = createServiceClient();
    const { data: device } = await supabase
      .from('devices')
      .select('*')
      .eq('serial_number', deviceSN)
      .single();

    if (device) {
      // Return device info in plain text format
      const info = `INFO\tSN=${device.serial_number}\tName=${device.name || ''}\tFirmware=${device.firmware_version || ''}`;
      return new NextResponse(info, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error: any) {
    console.error('Error processing deviceinfo GET:', error);
    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

