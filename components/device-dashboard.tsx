'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Fingerprint, User, Radio, Wifi, WifiOff } from 'lucide-react';
import { format } from 'date-fns';

interface Device {
  id: string;
  serial_number: string;
  name: string | null;
  firmware_version: string | null;
  last_seen: string;
  transaction_stamp: string;
  supports_face: boolean;
  supports_finger: boolean;
  supports_rfid: boolean;
}

interface DeviceDashboardProps {
  initialDevices: Device[];
}

export default function DeviceDashboard({ initialDevices }: DeviceDashboardProps) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to device changes
    const channel = supabase
      .channel('devices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setDevices((prev) =>
              prev.map((d) =>
                d.id === payload.new.id ? (payload.new as Device) : d
              )
            );
          } else if (payload.eventType === 'INSERT') {
            setDevices((prev) => [...prev, payload.new as Device]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const isOnline = (lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 1000 / 60;
    return diffMinutes < 5; // Consider online if last seen within 5 minutes
  };

  const sendCommand = async (deviceSN: string, command: string) => {
    const { error } = await supabase
      .from('pending_commands')
      .insert({
        device_sn: deviceSN,
        command_string: command,
        status: 'pending',
      });

    if (error) {
      alert('Error sending command: ' + error.message);
    } else {
      alert('Command sent successfully');
    }
  };

  const handleManualSync = async (deviceSN: string) => {
    await sendCommand(deviceSN, 'DATA QUERY ATTLOG StartTime=2000-00-00 00:00:00');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage and monitor your biometric devices
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {devices.map((device) => {
          const online = isOnline(device.last_seen);
          return (
            <Card key={device.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{device.name || device.serial_number}</CardTitle>
                  <div className="flex items-center gap-2">
                    {online ? (
                      <Wifi className="h-5 w-5 text-green-500" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-gray-400" />
                    )}
                    <span className={`text-sm ${online ? 'text-green-600' : 'text-gray-500'}`}>
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <CardDescription>SN: {device.serial_number}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      Last Seen: {format(new Date(device.last_seen), 'PPpp')}
                    </p>
                    <p className="text-sm text-gray-600">
                      Transaction Stamp: {device.transaction_stamp}
                    </p>
                    {device.firmware_version && (
                      <p className="text-sm text-gray-600">
                        Firmware: {device.firmware_version}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {device.supports_face && (
                      <div className="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs">
                        <User className="h-3 w-3" />
                        Face
                      </div>
                    )}
                    {device.supports_finger && (
                      <div className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs">
                        <Fingerprint className="h-3 w-3" />
                        Finger
                      </div>
                    )}
                    {device.supports_rfid && (
                      <div className="flex items-center gap-1 rounded bg-purple-100 px-2 py-1 text-xs">
                        <Radio className="h-3 w-3" />
                        RFID
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Send Command
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => handleManualSync(device.serial_number)}
                        >
                          Manual Sync (ATTLOG)
                        </DropdownMenuItem>
                        {device.supports_face && (
                          <DropdownMenuItem
                            onClick={() =>
                              sendCommand(device.serial_number, 'DATA QUERY FACE')
                            }
                          >
                            Sync All Faces
                          </DropdownMenuItem>
                        )}
                        {device.supports_finger && (
                          <DropdownMenuItem
                            onClick={() =>
                              sendCommand(device.serial_number, 'DATA QUERY FP')
                            }
                          >
                            Sync All Fingerprints
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() =>
                            sendCommand(device.serial_number, 'DATA QUERY USER')
                          }
                        >
                          Sync All Users
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            sendCommand(device.serial_number, 'CLEAR ATTLOG')
                          }
                        >
                          Clear Attendance Logs
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            sendCommand(device.serial_number, 'REBOOT')
                          }
                        >
                          Reboot Device
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleManualSync(device.serial_number)}
                    >
                      Manual Sync
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {devices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No devices registered yet.</p>
          <p className="text-sm text-gray-400 mt-2">
            Devices will appear here when they connect for the first time.
          </p>
        </div>
      )}
    </div>
  );
}

