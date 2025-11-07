'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Camera } from 'lucide-react';

interface AttendanceLog {
  id: string;
  device_id: string;
  employee_id: string;
  punch_timestamp: string;
  status_code: number | null;
  verify_mode: number | null;
  att_photo_path: string | null;
  employees: {
    employee_code: string;
    name: string | null;
  } | null;
  devices: {
    serial_number: string;
    name: string | null;
  } | null;
}

interface AttendanceViewerProps {
  initialLogs: AttendanceLog[];
}

export default function AttendanceViewer({ initialLogs }: AttendanceViewerProps) {
  const [logs, setLogs] = useState<AttendanceLog[]>(initialLogs);
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to attendance log changes
    const channel = supabase
      .channel('attendance-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_logs',
        },
        async (payload) => {
          // Fetch the full log with relations
          const { data } = await supabase
            .from('attendance_logs')
            .select(`
              *,
              employees:employee_id (
                employee_code,
                name
              ),
              devices:device_id (
                serial_number,
                name
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setLogs((prev) => [data as AttendanceLog, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleRowClick = async (log: AttendanceLog) => {
    setSelectedLog(log);
    if (log.att_photo_path) {
      const { data } = supabase.storage
        .from('attendance-photos')
        .getPublicUrl(log.att_photo_path);
      setPhotoUrl(data.publicUrl);
    } else {
      setPhotoUrl(null);
    }
  };

  const getStatusText = (statusCode: number | null) => {
    if (statusCode === null) return '-';
    // Common status codes: 0 = Check In, 1 = Check Out, etc.
    const statusMap: Record<number, string> = {
      0: 'Check In',
      1: 'Check Out',
    };
    return statusMap[statusCode] || `Status ${statusCode}`;
  };

  const getVerifyModeText = (verifyMode: number | null) => {
    if (verifyMode === null) return '-';
    const modeMap: Record<number, string> = {
      0: 'Password',
      1: 'Fingerprint',
      15: 'Face',
      2: 'RFID',
    };
    return modeMap[verifyMode] || `Mode ${verifyMode}`;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Attendance Logs</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and monitor attendance records from all devices
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verify Mode</TableHead>
              <TableHead>Photo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                className="cursor-pointer"
                onClick={() => handleRowClick(log)}
              >
                <TableCell className="font-medium">
                  {log.employees?.name || log.employees?.employee_code || '-'}
                  <br />
                  <span className="text-xs text-gray-500">
                    ({log.employees?.employee_code})
                  </span>
                </TableCell>
                <TableCell>
                  {log.devices?.name || log.devices?.serial_number || '-'}
                </TableCell>
                <TableCell>
                  {format(new Date(log.punch_timestamp), 'PPpp')}
                </TableCell>
                <TableCell>{getStatusText(log.status_code)}</TableCell>
                <TableCell>{getVerifyModeText(log.verify_mode)}</TableCell>
                <TableCell>
                  {log.att_photo_path ? (
                    <Camera className="h-4 w-4 text-blue-500" />
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {logs.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-gray-500">No attendance logs found.</p>
        </div>
      )}

      {/* Photo Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Attendance Details</DialogTitle>
            <DialogDescription>
              {selectedLog && (
                <>
                  Employee: {selectedLog.employees?.name || selectedLog.employees?.employee_code}
                  <br />
                  Device: {selectedLog.devices?.name || selectedLog.devices?.serial_number}
                  <br />
                  Time: {format(new Date(selectedLog.punch_timestamp), 'PPpp')}
                  <br />
                  Status: {getStatusText(selectedLog.status_code)} | Verify: {getVerifyModeText(selectedLog.verify_mode)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {photoUrl ? (
            <div className="flex justify-center">
              <Image
                src={photoUrl}
                alt="Attendance photo"
                width={800}
                height={600}
                className="max-h-[500px] w-auto rounded-lg"
                unoptimized
              />
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-gray-500">No photo available for this attendance log.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

