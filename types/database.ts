export interface Database {
  public: {
    Tables: {
      devices: {
        Row: {
          id: string;
          serial_number: string;
          name: string | null;
          firmware_version: string | null;
          last_seen: string;
          transaction_stamp: string;
          supports_face: boolean;
          supports_finger: boolean;
          supports_rfid: boolean;
        };
        Insert: {
          id?: string;
          serial_number: string;
          name?: string | null;
          firmware_version?: string | null;
          last_seen?: string;
          transaction_stamp?: string;
          supports_face?: boolean;
          supports_finger?: boolean;
          supports_rfid?: boolean;
        };
        Update: {
          id?: string;
          serial_number?: string;
          name?: string | null;
          firmware_version?: string | null;
          last_seen?: string;
          transaction_stamp?: string;
          supports_face?: boolean;
          supports_finger?: boolean;
          supports_rfid?: boolean;
        };
      };
      employees: {
        Row: {
          id: string;
          employee_code: string;
          name: string | null;
          rfid_card: string | null;
          privilege: number;
        };
        Insert: {
          id?: string;
          employee_code: string;
          name?: string | null;
          rfid_card?: string | null;
          privilege?: number;
        };
        Update: {
          id?: string;
          employee_code?: string;
          name?: string | null;
          rfid_card?: string | null;
          privilege?: number;
        };
      };
      biometric_templates: {
        Row: {
          id: string;
          employee_id: string;
          template_type: string;
          finger_id: number | null;
          template_data: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          template_type: string;
          finger_id?: number | null;
          template_data: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          template_type?: string;
          finger_id?: number | null;
          template_data?: string;
        };
      };
      attendance_logs: {
        Row: {
          id: string;
          device_id: string;
          employee_id: string;
          punch_timestamp: string;
          status_code: number | null;
          verify_mode: number | null;
          att_photo_path: string | null;
        };
        Insert: {
          id?: string;
          device_id: string;
          employee_id: string;
          punch_timestamp: string;
          status_code?: number | null;
          verify_mode?: number | null;
          att_photo_path?: string | null;
        };
        Update: {
          id?: string;
          device_id?: string;
          employee_id?: string;
          punch_timestamp?: string;
          status_code?: number | null;
          verify_mode?: number | null;
          att_photo_path?: string | null;
        };
      };
      pending_commands: {
        Row: {
          id: string;
          command_id: number;
          device_sn: string;
          command_string: string;
          status: 'pending' | 'sent' | 'acked' | 'failed';
          created_at: string;
        };
        Insert: {
          id?: string;
          command_id?: number;
          device_sn: string;
          command_string: string;
          status?: 'pending' | 'sent' | 'acked' | 'failed';
          created_at?: string;
        };
        Update: {
          id?: string;
          command_id?: number;
          device_sn?: string;
          command_string?: string;
          status?: 'pending' | 'sent' | 'acked' | 'failed';
          created_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          name: string;
          hashed_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          hashed_key: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          hashed_key?: string;
          created_at?: string;
        };
      };
    };
  };
}

