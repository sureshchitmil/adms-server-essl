-- ADMS Server Database Schema
-- Version: 1.6
-- Date: 2025-01-XX

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stores device information
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT NOT NULL UNIQUE,
  name TEXT,
  firmware_version TEXT,
  last_seen TIMESTAMPTZ DEFAULT now(),
  transaction_stamp TEXT DEFAULT '0', -- From devices.TransactionStamp
  -- Device capabilities, parsed from INFO/options
  supports_face BOOLEAN DEFAULT false,
  supports_finger BOOLEAN DEFAULT false,
  supports_rfid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Master list of employees
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT NOT NULL UNIQUE, -- The "PIN" on the device, from employees.EmployeeCode
  name TEXT, -- from employees.EmployeeName
  rfid_card TEXT, -- from employees.EmployeeRFIDNumber
  privilege INT DEFAULT 0, -- from employees.Role
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stores raw biometric templates
CREATE TABLE biometric_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL, -- 'finger', 'face', 'palm' (from employeesbio.BioName)
  finger_id INT, -- Which finger (0-9)
  template_data TEXT NOT NULL, -- The full Base64 string (from employeesbio.Bio)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stores all attendance punches
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE SET NULL,
  punch_timestamp TIMESTAMPTZ NOT NULL, -- from devicelogs.LogDate
  status_code INT,
  verify_mode INT, -- from devicelogs.VerificationType
  att_photo_path TEXT, -- Path to the photo in Supabase Storage
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Command queue for devices to poll
CREATE TABLE pending_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id BIGINT UNIQUE DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT,
  device_sn TEXT NOT NULL, -- References devices.serial_number
  command_string TEXT NOT NULL, -- from devicecommands.DeviceCommand
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acked', 'failed')), -- 'pending', 'sent', 'acked', 'failed'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stores API keys for external systems
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., "HRMS System"
  hashed_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_devices_serial_number ON devices(serial_number);
CREATE INDEX idx_devices_last_seen ON devices(last_seen);
CREATE INDEX idx_employees_employee_code ON employees(employee_code);
CREATE INDEX idx_employees_rfid_card ON employees(rfid_card);
CREATE INDEX idx_biometric_templates_employee_id ON biometric_templates(employee_id);
CREATE INDEX idx_attendance_logs_device_id ON attendance_logs(device_id);
CREATE INDEX idx_attendance_logs_employee_id ON attendance_logs(employee_id);
CREATE INDEX idx_attendance_logs_punch_timestamp ON attendance_logs(punch_timestamp);
CREATE INDEX idx_pending_commands_device_sn ON pending_commands(device_sn);
CREATE INDEX idx_pending_commands_status ON pending_commands(status);
CREATE INDEX idx_pending_commands_command_id ON pending_commands(command_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_commands_updated_at BEFORE UPDATE ON pending_commands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate commands when employee data changes
CREATE OR REPLACE FUNCTION on_employee_update()
RETURNS TRIGGER AS $$
DECLARE
  device_record RECORD;
  command_str TEXT;
BEGIN
  -- Only proceed if name, employee_code, or rfid_card changed
  IF (OLD.name IS DISTINCT FROM NEW.name) OR 
     (OLD.employee_code IS DISTINCT FROM NEW.employee_code) OR 
     (OLD.rfid_card IS DISTINCT FROM NEW.rfid_card) THEN
    
    -- Build the command string
    command_str := 'DATA UPDATE USER PIN=' || NEW.employee_code;
    
    IF NEW.name IS NOT NULL THEN
      command_str := command_str || E'\tName=' || NEW.name;
    END IF;
    
    IF NEW.rfid_card IS NOT NULL THEN
      command_str := command_str || E'\tCard=' || NEW.rfid_card;
    END IF;
    
    -- Insert command for all devices
    FOR device_record IN SELECT serial_number FROM devices LOOP
      INSERT INTO pending_commands (device_sn, command_string, status)
      VALUES (device_record.serial_number, command_str, 'pending')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on employee update
CREATE TRIGGER employee_update_trigger
AFTER UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION on_employee_update();

-- Enable Row Level Security (RLS)
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to read all data
CREATE POLICY "Allow authenticated read on devices" ON devices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read on employees" ON employees
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read on biometric_templates" ON biometric_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read on attendance_logs" ON attendance_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read on pending_commands" ON pending_commands
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read on api_keys" ON api_keys
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to do everything (for API routes)
CREATE POLICY "Allow service role all operations on devices" ON devices
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role all operations on employees" ON employees
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role all operations on biometric_templates" ON biometric_templates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role all operations on attendance_logs" ON attendance_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role all operations on pending_commands" ON pending_commands
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role all operations on api_keys" ON api_keys
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to insert/update employees and pending_commands
CREATE POLICY "Allow authenticated insert on employees" ON employees
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on employees" ON employees
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert on pending_commands" ON pending_commands
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on pending_commands" ON pending_commands
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert on api_keys" ON api_keys
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable Realtime for devices and attendance_logs tables
-- Note: This needs to be done via Supabase Dashboard or Management API
-- ALTER PUBLICATION supabase_realtime ADD TABLE devices;
-- ALTER PUBLICATION supabase_realtime ADD TABLE attendance_logs;

