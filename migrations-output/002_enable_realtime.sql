-- Enable Realtime for devices and attendance_logs tables
-- This needs to be run after the initial schema

-- Add tables to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_logs;

