'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RefreshCw, Download, Filter, X, Search } from 'lucide-react';
import { format } from 'date-fns';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'cdata' | 'command' | 'attendance' | 'employee' | 'device';
  device_sn?: string;
  message: string;
  data?: any;
}

export default function LogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [devices, setDevices] = useState<Array<{ serial_number: string; name: string | null }>>([]);
  const supabase = createClient();

  useEffect(() => {
    loadDevices();
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, filterType, filterDevice]);

  const loadDevices = async () => {
    const { data } = await supabase
      .from('devices')
      .select('serial_number, name')
      .order('name', { ascending: true });
    setDevices(data || []);
  };

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      // Fetch recent attendance logs
      const { data: attendanceLogs } = await supabase
        .from('attendance_logs')
        .select('*, devices(serial_number, name), employees(employee_code, name)')
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch recent commands
      const { data: commands } = await supabase
        .from('pending_commands')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch recent device updates
      const { data: deviceUpdates } = await supabase
        .from('devices')
        .select('*, last_seen')
        .order('last_seen', { ascending: false })
        .limit(50);

      // Combine and format logs
      const logEntries: LogEntry[] = [];

      // Attendance logs
      attendanceLogs?.forEach((log: any) => {
        logEntries.push({
          id: log.id,
          timestamp: log.created_at || log.punch_timestamp,
          type: 'attendance',
          device_sn: log.devices?.serial_number,
          message: `Attendance: ${log.employees?.name || log.employees?.employee_code} - ${format(new Date(log.punch_timestamp), 'PPpp')}`,
          data: log,
        });
      });

      // Commands
      commands?.forEach((cmd: any) => {
        logEntries.push({
          id: cmd.id,
          timestamp: cmd.created_at,
          type: 'command',
          device_sn: cmd.device_sn,
          message: `Command [${cmd.status}]: ${cmd.command_string}`,
          data: cmd,
        });
      });

      // Device updates
      deviceUpdates?.forEach((device: any) => {
        logEntries.push({
          id: device.id,
          timestamp: device.last_seen,
          type: 'device',
          device_sn: device.serial_number,
          message: `Device ${device.name || device.serial_number} - Last seen: ${format(new Date(device.last_seen), 'PPpp')}`,
          data: device,
        });
      });

      // Sort by timestamp (newest first)
      logEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setLogs(logEntries);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.type === filterType);
    }

    // Filter by device
    if (filterDevice !== 'all') {
      filtered = filtered.filter(log => log.device_sn === filterDevice);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(term) ||
        log.device_sn?.toLowerCase().includes(term) ||
        JSON.stringify(log.data).toLowerCase().includes(term)
      );
    }

    setFilteredLogs(filtered);
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'attendance':
        return 'bg-blue-100 text-blue-800';
      case 'command':
        return 'bg-purple-100 text-purple-800';
      case 'device':
        return 'bg-green-100 text-green-800';
      case 'employee':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Logs & Console</h1>
        <p className="mt-2 text-sm text-gray-600">
          View raw data, device activity, and system logs
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filterType === 'all' ? 'All Types' : filterType}
                    <Filter className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterType('all')}>
                    All Types
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('attendance')}>
                    Attendance
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('command')}>
                    Commands
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('device')}>
                    Device Updates
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-2">
              <Label>Device</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filterDevice === 'all' 
                      ? 'All Devices' 
                      : devices.find(d => d.serial_number === filterDevice)?.name || filterDevice}
                    <Filter className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterDevice('all')}>
                    All Devices
                  </DropdownMenuItem>
                  {devices.map((device) => (
                    <DropdownMenuItem
                      key={device.serial_number}
                      onClick={() => setFilterDevice(device.serial_number)}
                    >
                      {device.name || device.serial_number}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={loadLogs}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  onClick={exportLogs}
                  disabled={filteredLogs.length === 0}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Log Entries</CardTitle>
              <CardDescription>
                Showing {filteredLogs.length} of {logs.length} entries
              </CardDescription>
            </div>
            {(filterType !== 'all' || filterDevice !== 'all' || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterType('all');
                  setFilterDevice('all');
                  setSearchTerm('');
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No logs found</p>
              <p className="text-sm text-gray-400 mt-2">
                {logs.length === 0
                  ? 'No logs available yet. Activity will appear here as devices connect and send data.'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getLogTypeColor(
                            log.type
                          )}`}
                        >
                          {log.type.toUpperCase()}
                        </span>
                        {log.device_sn && (
                          <span className="text-sm text-gray-500">
                            Device: {log.device_sn}
                          </span>
                        )}
                        <span className="text-sm text-gray-400">
                          {format(new Date(log.timestamp), 'PPpp')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">{log.message}</p>
                      {log.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            View Raw Data
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

