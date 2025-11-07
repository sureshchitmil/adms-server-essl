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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Fingerprint, User, Radio, Wifi, WifiOff, Plus } from 'lucide-react';
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
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

  const handleSyncAllData = async (deviceSN: string, device: Device) => {
    if (!confirm('This will sync all historical data from the device. This may take several minutes. Continue?')) {
      return;
    }

    const commands = [
      'DATA QUERY ATTLOG StartTime=2000-00-00 00:00:00', // Sync all attendance logs
      'DATA QUERY USER', // Sync all employees/users
    ];

    // Add biometric sync commands based on device capabilities
    if (device.supports_finger) {
      commands.push('DATA QUERY FP'); // Sync all fingerprints
    }
    if (device.supports_face) {
      commands.push('DATA QUERY FACE'); // Sync all faces
    }

    // Send all commands
    let successCount = 0;
    let errorCount = 0;

    for (const command of commands) {
      try {
        const { error } = await supabase
          .from('pending_commands')
          .insert({
            device_sn: deviceSN,
            command_string: command,
            status: 'pending',
          });

        if (error) {
          console.error(`Error sending command "${command}":`, error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error: any) {
        console.error(`Error sending command "${command}":`, error);
        errorCount++;
      }
    }

    if (errorCount === 0) {
      alert(`Successfully queued ${successCount} sync command(s). The device will process them when it polls for commands.`);
    } else {
      alert(`Queued ${successCount} command(s), but ${errorCount} failed. Please try again.`);
    }
  };

  const handleAddDevice = async () => {
    if (!serialNumber.trim()) {
      alert('Please enter a serial number');
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch('/api/v1/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serial_number: serialNumber.trim(),
          name: deviceName.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Error adding device');
        return;
      }

      // Device added successfully
      setDevices((prev) => [...prev, result.data as Device]);
      setIsAddDialogOpen(false);
      setSerialNumber('');
      setDeviceName('');
    } catch (error: any) {
      alert('Error adding device: ' + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and monitor your biometric devices
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Device
        </Button>
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

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSyncAllData(device.serial_number, device)}
                      className="flex-1 min-w-[140px]"
                    >
                      Sync All Data
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          More Commands
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => handleManualSync(device.serial_number)}
                        >
                          Sync Attendance Only
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            sendCommand(device.serial_number, 'DATA QUERY USER')
                          }
                        >
                          Sync Employees Only
                        </DropdownMenuItem>
                        {device.supports_face && (
                          <DropdownMenuItem
                            onClick={() =>
                              sendCommand(device.serial_number, 'DATA QUERY FACE')
                            }
                          >
                            Sync Faces Only
                          </DropdownMenuItem>
                        )}
                        {device.supports_finger && (
                          <DropdownMenuItem
                            onClick={() =>
                              sendCommand(device.serial_number, 'DATA QUERY FP')
                            }
                          >
                            Sync Fingerprints Only
                          </DropdownMenuItem>
                        )}
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
            Devices will appear here when they connect for the first time, or you can add one manually.
          </p>
        </div>
      )}

      {/* Add Device Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Device Manually</DialogTitle>
            <DialogDescription>
              Add a device by entering its serial number. The device will appear in the list once added.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="serial-number">Serial Number *</Label>
              <Input
                id="serial-number"
                placeholder="Enter device serial number"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isAdding) {
                    handleAddDevice();
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                The serial number is usually found on the device label or in device settings.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name (Optional)</Label>
              <Input
                id="device-name"
                placeholder="e.g., Main Entrance, Office Floor 1"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isAdding) {
                    handleAddDevice();
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                A friendly name to identify this device. If not provided, the serial number will be used.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setSerialNumber('');
                setDeviceName('');
              }}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button onClick={handleAddDevice} disabled={isAdding || !serialNumber.trim()}>
              {isAdding ? 'Adding...' : 'Add Device'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

