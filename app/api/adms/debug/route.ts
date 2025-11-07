import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Debug endpoint to check device registration
export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const searchParams = request.nextUrl.searchParams;
  const deviceSN = searchParams.get('SN');
  const listAll = searchParams.get('list') === 'true';

  // If list=true, return all devices
  if (listAll) {
    const { data: devices, error } = await supabase
      .from('devices')
      .select('*')
      .order('last_seen', { ascending: false });

    return NextResponse.json({
      total: devices?.length || 0,
      devices: devices || [],
      error: error?.message || null,
    });
  }

  // If no SN provided, return error
  if (!deviceSN) {
    return NextResponse.json({ 
      error: 'SN parameter required, or use ?list=true to list all devices' 
    }, { status: 400 });
  }

  // Check if device exists
  const { data: device, error } = await supabase
    .from('devices')
    .select('*')
    .eq('serial_number', deviceSN)
    .single();

  // Calculate if device is online (last seen within 5 minutes)
  let isOnline = false;
  if (device?.last_seen) {
    const lastSeenDate = new Date(device.last_seen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 1000 / 60;
    isOnline = diffMinutes < 5;
  }

  return NextResponse.json({
    deviceSN,
    exists: !!device,
    isOnline,
    device: device || null,
    error: error?.message || null,
    message: device 
      ? `Device ${deviceSN} is registered. Last seen: ${device.last_seen}`
      : `Device ${deviceSN} is not registered. Make sure the device is sending data to /iclock/cdata endpoint.`,
  });
}

