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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Fingerprint, User, Radio, Wifi, WifiOff, Plus, Circle, Trash2 } from 'lucide-react';
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClient();

  // Update current time every second for real-time status updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
          } else if (payload.eventType === 'DELETE') {
            setDevices((prev) => prev.filter((d) => d.id !== payload.old.id));
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

  const getConnectionStatus = (lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    const isOnline = diffMinutes < 5;

    let statusText: string;
    let statusColor: string;
    let statusBadge: string;

    if (isOnline) {
      if (diffSeconds < 60) {
        statusText = 'Connected now';
        statusColor = 'text-green-600';
        statusBadge = 'bg-green-100 text-green-800';
      } else if (diffMinutes < 1) {
        statusText = `Connected ${diffSeconds}s ago`;
        statusColor = 'text-green-600';
        statusBadge = 'bg-green-100 text-green-800';
      } else {
        statusText = `Connected ${diffMinutes}m ago`;
        statusColor = 'text-green-600';
        statusBadge = 'bg-green-100 text-green-800';
      }
    } else {
      if (diffMinutes < 60) {
        statusText = `Offline ${diffMinutes}m ago`;
        statusColor = 'text-gray-500';
        statusBadge = 'bg-gray-100 text-gray-800';
      } else if (diffHours < 24) {
        statusText = `Offline ${diffHours}h ago`;
        statusColor = 'text-orange-600';
        statusBadge = 'bg-orange-100 text-orange-800';
      } else {
        statusText = `Offline ${diffDays}d ago`;
        statusColor = 'text-red-600';
        statusBadge = 'bg-red-100 text-red-800';
      }
    }

    return { isOnline, statusText, statusColor, statusBadge };
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

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/v1/devices', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: deviceToDelete.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Error deleting device');
        return;
      }

      // Remove device from list
      setDevices((prev) => prev.filter((d) => d.id !== deviceToDelete.id));
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    } catch (error: any) {
      alert('Error deleting device: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (device: Device) => {
    setDeviceToDelete(device);
    setDeleteDialogOpen(true);
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
          const connectionStatus = getConnectionStatus(device.last_seen);
          return (
            <Card key={device.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{device.name || device.serial_number}</CardTitle>
                  <div className="flex items-center gap-2">
                    {connectionStatus.isOnline ? (
                      <div className="relative">
                        <Wifi className="h-5 w-5 text-green-500" />
                        <Circle className="h-2 w-2 text-green-500 absolute -top-0.5 -right-0.5 animate-pulse fill-green-500" />
                      </div>
                    ) : (
                      <WifiOff className="h-5 w-5 text-gray-400" />
                    )}
                    <span className={`text-sm font-medium ${connectionStatus.statusColor}`}>
                      {connectionStatus.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <CardDescription>SN: {device.serial_number}</CardDescription>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${connectionStatus.statusBadge}`}>
                    {connectionStatus.statusText}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500 uppercase">Connection Status</p>
                      {connectionStatus.isOnline && (
                        <span className="inline-flex items-center gap-1">
                          <Circle className="h-2 w-2 text-green-500 fill-green-500 animate-pulse" />
                          <span className="text-xs text-green-600 font-medium">Live</span>
                        </span>
                      )}
                    </div>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(device)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
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

      {/* Delete Device Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deviceToDelete?.name || deviceToDelete?.serial_number}</strong>?
              <br />
              <br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Remove the device from the system</li>
                <li>Delete all pending commands for this device</li>
                <li>Keep attendance logs (device reference will be removed)</li>
              </ul>
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDevice}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Device'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

