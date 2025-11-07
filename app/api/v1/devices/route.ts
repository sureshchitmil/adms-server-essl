import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { serial_number, name } = body;

    if (!serial_number || !serial_number.trim()) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS
    const serviceSupabase = createServiceClient();
    const { data: device, error } = await serviceSupabase
      .from('devices')
      .insert({
        serial_number: serial_number.trim(),
        name: name?.trim() || null,
        last_seen: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          { error: 'A device with this serial number already exists' },
          { status: 409 }
        );
      }
      console.error('Error adding device:', error);
      return NextResponse.json(
        { error: 'Failed to add device', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: device }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/v1/devices:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { device_id } = body;

    if (!device_id) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS
    const serviceSupabase = createServiceClient();

    // First, get the device to find its serial number
    const { data: device, error: fetchError } = await serviceSupabase
      .from('devices')
      .select('serial_number')
      .eq('id', device_id)
      .single();

    if (fetchError || !device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    // Delete pending commands for this device
    await serviceSupabase
      .from('pending_commands')
      .delete()
      .eq('device_sn', device.serial_number);

    // Delete the device
    // Note: attendance_logs will have device_id set to NULL automatically due to ON DELETE SET NULL
    const { error: deleteError } = await serviceSupabase
      .from('devices')
      .delete()
      .eq('id', device_id);

    if (deleteError) {
      console.error('Error deleting device:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete device', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Device deleted successfully',
      device_id 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error in DELETE /api/v1/devices:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

