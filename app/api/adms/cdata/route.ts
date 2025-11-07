import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// Disable body parsing to get raw text
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceSN = searchParams.get('SN');

    if (!deviceSN) {
      return new NextResponse('SN parameter required', { status: 400 });
    }

    // Get raw text body
    const body = await request.text();
    
    // Log incoming request for debugging
    console.log(`[cdata] Device SN: ${deviceSN}`);
    console.log(`[cdata] Body length: ${body.length}`);
    if (body.length > 0) {
      console.log(`[cdata] Body preview: ${body.substring(0, 200)}`);
    }
    
    // Even if body is empty, ensure device is registered
    const supabase = createServiceClient();
    const { error: upsertError } = await supabase
      .from('devices')
      .upsert({
        serial_number: deviceSN,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'serial_number',
      });
    
    if (upsertError) {
      console.error(`[cdata] Failed to upsert device ${deviceSN}:`, upsertError);
      // Still return OK to prevent device retries, but log the error
    } else {
      console.log(`[cdata] Successfully registered/updated device ${deviceSN}`);
    }
    
    if (!body || body.trim() === '') {
      return new NextResponse('OK', { status: 200 });
    }

    // Parse the data - lines are separated by \n, fields by \t
    const lines = body.split('\n').filter(line => line.trim() !== '');
    const errors: string[] = [];

    if (lines.length > 0) {
      console.log(`[cdata] Processing ${lines.length} lines`);
    }

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.length > 0) {
        console.log(`[cdata] Processing line: ${trimmedLine.substring(0, 100)}`);
      }
      
      try {
        // Handle command acknowledgment: OK <CommandID>
        if (trimmedLine.startsWith('OK ')) {
          const commandIdMatch = trimmedLine.match(/OK\s+(\d+)/);
          if (commandIdMatch) {
            const commandId = parseInt(commandIdMatch[1], 10);
            const { error } = await supabase
              .from('pending_commands')
              .update({ status: 'acked' })
              .eq('command_id', commandId)
              .eq('device_sn', deviceSN);
            if (error) {
              errors.push(`Failed to acknowledge command ${commandId}: ${error.message}`);
            }
          }
          continue;
        }

        // Parse tab-separated values
        const fields = trimmedLine.split('\t');
        const recordType = fields[0];

        switch (recordType) {
        case 'INFO': {
          // Parse device info and capabilities
          const options: Record<string, string> = {};
          for (let i = 1; i < fields.length; i++) {
            const field = fields[i];
            if (field.startsWith('&options=')) {
              const optionsStr = field.substring(10); // Remove '&options='
              const optionPairs = optionsStr.split(',');
              for (const pair of optionPairs) {
                const [key, value] = pair.split('=');
                if (key && value) {
                  options[key] = value;
                }
              }
            }
          }

          // Update device capabilities
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

          // Upsert device
          const { error: deviceError } = await supabase
            .from('devices')
            .upsert({
              serial_number: deviceSN,
              ...updateData,
              last_seen: new Date().toISOString(),
            }, {
              onConflict: 'serial_number',
            });
          if (deviceError) {
            throw new Error(`Failed to upsert device: ${deviceError.message}`);
          }
          break;
        }

        case 'ATTLOG': {
          // Format: ATTLOG\tPIN\tTimestamp\tStatus\tVerifyMode\t[AttPhoto]
          if (fields.length < 4) break;

          const pin = fields[1];
          const timestampStr = fields[2];
          const status = fields[3] ? parseInt(fields[3], 10) : null;
          const verifyMode = fields[4] ? parseInt(fields[4], 10) : null;
          const attPhotoBase64 = fields[5] || null;

          // Parse timestamp (format: YYYY-MM-DD HH:MM:SS)
          let punchTimestamp: Date;
          try {
            punchTimestamp = new Date(timestampStr.replace(' ', 'T'));
          } catch {
            punchTimestamp = new Date();
          }

          // Get or create employee
          let employeeId: string;
          const { data: employee } = await supabase
            .from('employees')
            .select('id')
            .eq('employee_code', pin)
            .single();

          if (employee) {
            employeeId = employee.id;
          } else {
            // Create employee if doesn't exist
            const { data: newEmployee } = await supabase
              .from('employees')
              .insert({ employee_code: pin })
              .select('id')
              .single();
            employeeId = newEmployee?.id || '';
          }

          // Get device ID
          const { data: device } = await supabase
            .from('devices')
            .select('id')
            .eq('serial_number', deviceSN)
            .single();

          if (!device) break;

          // Handle photo upload if present
          let photoPath: string | null = null;
          if (attPhotoBase64) {
            try {
              // Decode base64
              const photoBuffer = Buffer.from(attPhotoBase64, 'base64');
              const fileName = `${deviceSN}/${punchTimestamp.getTime()}_${pin}.jpg`;
              
              // Upload to Supabase Storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('attendance-photos')
                .upload(fileName, photoBuffer, {
                  contentType: 'image/jpeg',
                  upsert: true,
                });

              if (!uploadError && uploadData) {
                photoPath = uploadData.path;
              }
            } catch (error) {
              console.error('Error uploading photo:', error);
              // Continue without photo
            }
          }

          // Insert attendance log (ignore duplicates)
          const { error: logError } = await supabase
            .from('attendance_logs')
            .insert({
              device_id: device.id,
              employee_id: employeeId,
              punch_timestamp: punchTimestamp.toISOString(),
              status_code: status,
              verify_mode: verifyMode,
              att_photo_path: photoPath,
            });
          if (logError && !logError.message.includes('duplicate')) {
            throw new Error(`Failed to insert attendance log: ${logError.message}`);
          }
          break;
        }

        case 'USER': {
          // Format: USER\tPIN\tName\tCard\t[other fields]
          if (fields.length < 2) break;

          const pin = fields[1];
          const name = fields[2] || null;
          const card = fields[3] || null;
          const privilege = fields[4] ? parseInt(fields[4], 10) : 0;

          // Upsert employee
          const { error: employeeError } = await supabase
            .from('employees')
            .upsert({
              employee_code: pin,
              name: name || null,
              rfid_card: card || null,
              privilege: privilege,
            }, {
              onConflict: 'employee_code',
            });
          if (employeeError) {
            throw new Error(`Failed to upsert employee: ${employeeError.message}`);
          }
          break;
        }

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
        // Log error but continue processing other lines
        errors.push(`Error processing line "${trimmedLine.substring(0, 50)}": ${lineError.message}`);
        console.error('Error processing line:', lineError);
      }
    }

    // Log errors if any occurred
    if (errors.length > 0) {
      console.error('Errors processing cdata:', errors);
    }

    // Update transaction_stamp if present in the request
    const transactionStamp = searchParams.get('TransactionStamp');
    if (transactionStamp) {
      await supabase
        .from('devices')
        .update({ transaction_stamp: transactionStamp })
        .eq('serial_number', deviceSN);
    }

    // Always return OK to device even if some records failed
    // This prevents devices from retrying and creating duplicates
    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('Error processing cdata:', error);
    // Still return OK to prevent device retries
    // Log the error for debugging
    return new NextResponse('OK', { status: 200 });
  }
}

