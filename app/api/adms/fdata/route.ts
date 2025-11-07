import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Endpoint for uploading fingerprint/face templates (fdata)
// Format: Similar to cdata but specifically for biometric templates
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceSN = searchParams.get('SN');

    // Always return OK even if SN is missing (devices expect 200 OK)
    if (!deviceSN) {
      console.warn('[fdata] Missing SN parameter');
      return new NextResponse('OK', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // Get raw text body
    const body = await request.text();
    
    console.log(`[fdata] Device SN: ${deviceSN}`);
    console.log(`[fdata] Body length: ${body.length}`);
    if (body.length > 0) {
      console.log(`[fdata] Body preview: ${body.substring(0, 200)}`);
    }

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

    if (!body || body.trim() === '') {
      return new NextResponse('OK', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // Parse the data - lines are separated by \n, fields by \t
    const lines = body.split('\n').filter(line => line.trim() !== '');
    const errors: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      try {
        const fields = trimmedLine.split('\t');
        const recordType = fields[0];

        switch (recordType) {
          case 'FP': {
            // Format: FP\tPIN\tFingerID\tTemplate
            if (fields.length < 4) break;

            const pin = fields[1];
            const fingerId = fields[2] ? parseInt(fields[2], 10) : null;
            const template = fields[3];

            // Get employee ID
            const { data: employee } = await supabase
              .from('employees')
              .select('id')
              .eq('employee_code', pin)
              .single();

            if (employee) {
              // Upsert biometric template
              const { error: templateError } = await supabase
                .from('biometric_templates')
                .upsert({
                  employee_id: employee.id,
                  template_type: 'finger',
                  finger_id: fingerId,
                  template_data: template,
                }, {
                  onConflict: 'id',
                });
              if (templateError) {
                throw new Error(`Failed to upsert fingerprint template: ${templateError.message}`);
              }
            }
            break;
          }

          case 'FACE': {
            // Format: FACE\tPIN\tTemplate
            if (fields.length < 3) break;

            const pin = fields[1];
            const template = fields[2];

            // Get employee ID
            const { data: employee } = await supabase
              .from('employees')
              .select('id')
              .eq('employee_code', pin)
              .single();

            if (employee) {
              // Upsert biometric template
              const { error: templateError } = await supabase
                .from('biometric_templates')
                .upsert({
                  employee_id: employee.id,
                  template_type: 'face',
                  finger_id: null,
                  template_data: template,
                }, {
                  onConflict: 'id',
                });
              if (templateError) {
                throw new Error(`Failed to upsert face template: ${templateError.message}`);
              }
            }
            break;
          }

          default:
            // Unknown record type, ignore
            break;
        }
      } catch (lineError: any) {
        errors.push(`Error processing line "${trimmedLine.substring(0, 50)}": ${lineError.message}`);
        console.error('Error processing fdata line:', lineError);
      }
    }

    if (errors.length > 0) {
      console.error('Errors processing fdata:', errors);
    }

    // Always return OK
    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error: any) {
    console.error('Error processing fdata:', error);
    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

