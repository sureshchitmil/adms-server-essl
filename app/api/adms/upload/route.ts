import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Endpoint for file uploads (upload)
// Devices may upload files (photos, templates, etc.) here
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceSN = searchParams.get('SN');
    const fileName = searchParams.get('FileName') || searchParams.get('file');

    // Always return OK even if SN is missing (devices expect 200 OK)
    if (!deviceSN) {
      console.warn('[upload] Missing SN parameter');
      return new NextResponse('OK', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    const body = await request.text();
    console.log(`[upload] Device SN: ${deviceSN}`);
    console.log(`[upload] File name: ${fileName || 'unknown'}`);
    console.log(`[upload] Body length: ${body.length}`);

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

    // Handle file upload if body contains data
    if (body && body.trim() && fileName) {
      try {
        // Determine file type from extension or content
        const isBase64 = body.length > 100 && /^[A-Za-z0-9+/=]+$/.test(body.replace(/\s/g, ''));
        
        if (isBase64) {
          // Decode base64 and upload to storage
          const fileBuffer = Buffer.from(body, 'base64');
          const storagePath = `${deviceSN}/${fileName}`;
          
          // Determine content type
          let contentType = 'application/octet-stream';
          if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
            contentType = 'image/jpeg';
          } else if (fileName.endsWith('.png')) {
            contentType = 'image/png';
          }

          const { error: uploadError } = await supabase.storage
            .from('attendance-photos')
            .upload(storagePath, fileBuffer, {
              contentType,
              upsert: true,
            });

          if (uploadError) {
            console.error('[upload] Storage upload error:', uploadError);
          } else {
            console.log(`[upload] Successfully uploaded ${fileName}`);
          }
        }
      } catch (uploadError: any) {
        console.error('[upload] Error processing file upload:', uploadError);
      }
    }

    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error: any) {
    console.error('Error processing upload:', error);
    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

