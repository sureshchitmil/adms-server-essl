Product Requirements Document: : ADMS Server & Web Dashboard
Property : Value
Title : ADMS Server for eSSL Biomatrix Devices
Status : Scoping (Draft)
Version : 1.6
Date : November 6, 2025
Author : Suresh Chitmil
Stakeholders : Development Team, Project Manager, ERP/HRMS Team

1. Introduction
1.1. Overview
This document outlines the requirements for a custom-built, cloud-native ADMS (Automatic Data Master Server). This system will be built as a single, unified Next.js application deployed on Vercel, providing three core services:
ADMS Listener Endpoints: A set of serverless API routes that listen for HTTP "push" requests from remote biometric devices to collect data.
The Web Dashboard: A modern, real-time web application for administrators to monitor devices, manage employees, and view attendance logs.
The Public REST API: A secure, read-only API for external systems (like ERP, CRM, or HRMS) to consume the collected data.
1.2. Business Goal
The primary goal is to create a centralized, scalable, and real-time system for managing a fleet of biometric devices. This replaces traditional, on-premise software that struggles with devices on different networks. This server will provide a single source of truth for all employee attendance data, allow for remote management of user credentials, and integrate seamlessly with other business-critical systems (ERP, HRMS).
1.3. Target Audience (Users)
System Administrators (HR/IT): Users of the web dashboard.
System (Biometric Device): A non-human user pushing data and polling for commands.
System (External ERP/HRMS): A non-human user consuming the Public REST API.
1.4. Scope
In Scope
✅ Building all components as a unified Next.js App.
✅ Deploying the entire application on Vercel.
✅ Building the Next.js web dashboard.
✅ Building a Public REST API for ERP/HRMS.
✅ Real-time device status (Online/Offline).
✅ Detecting device capabilities (Face, Finger, RFID).
✅ Collecting Attendance Logs (ATTLOG).
✅ Collecting Attendance Photos (AttPhoto).
✅ Collecting Employee Data (User, Finger, Face, RFID).
✅ Updating Employee Name, Code, & RFID on devices.
✅ Storing all data in a Supabase database.
✅ Storing photos in Supabase Storage.

Out of Scope
❌ Payroll processing (we only collect data).
❌ Direct, server-initiated connections to devices (ADMS is a push-only protocol).
❌ On-device menu or firmware modifications.
❌ Support for non-ADMS/Push-SDK protocols.
❌ Detailed shift or leave management (Dashboard will focus on raw data).



2. User Personas & Stories
2.1. Persona: Admin (HR/IT Manager)
As an Admin, I want to...
...log in to a secure web dashboard to manage the system.
...see a list of all my registered devices and their real-time status (Online/Offline).
...see icons on the device card that show me if it supports Face, Finger, and/or RFID.
...view a central, filterable table of all attendance punches from all devices.
...see the photo taken at the time of the punch (if available) when I click on an attendance log.
...create a new employee in the dashboard with their Name, Employee Code, and RFID Card Number.
...edit an employee's Name, Employee Code, or RFID Card Number on the dashboard and have it automatically sync and update on the physical device.
...click a 'Manual Sync' button for a specific device to download all stored attendance logs from it.
...remotely clear attendance logs from a device that is full.
...remotely restart a device that is behaving incorrectly.
...generate a secure API key so I can give my HRMS read-only access to the data.
2.2. Persona: System (eSSL Biomatrix Device)
As a Device, I need to...
...automatically send my device information (Serial Number, capabilities, etc.) to the server when I first connect.
...immediately push a new attendance log (ATTLOG), including AttPhoto data, to the server every time an employee punches in.
...periodically send a "heartbeat" to the server so it knows I am online.
...poll the server every 30 seconds at a specific endpoint to ask for any pending commands.
...receive a formatted command from the server (e.g., DATA UPDATE USER...) and execute it.
...report back to the server that a command was successfully (or unsuccessfully) executed.
...push all stored employee data (User, Finger, Face, RFID Card) to the server when requested.
2.3. Persona: System (External ERP/HRMS)
As an ERP, I need to...
...make an authenticated GET request to an API endpoint (/api/v1/attendance) with a date range to pull all attendance logs for payroll.
...make an authenticated GET request to an API endpoint (/api/v1/employees) to get a list of all current employees.
3. Features & Requirements
3.1. Epic 1: ADMS Listener API Routes
These are serverless API routes built within the Next.js project responsible for handling all raw communication from the biometric devices.
Requirement 3.1.1: Vercel URL Rewrites
The next.config.js file must use Rewrites to map the clean URLs required by the devices to the actual API route handlers.
source: '/iclock/cdata' -> destination: '/api/adms/cdata'
source: '/iclock/getrequest' -> destination: '/api/adms/getrequest'
Requirement 3.1.2: Data Receiver Endpoint (/api/adms/cdata)
Must be an HTTP POST API Route.
Must be configured to accept text/plain request bodies.
Must identify the device by its SN (Serial Number) in the query string (e.g., ?SN=ABC12345).
Must update the devices table transaction_stamp and last_seen timestamp.
Must parse the line-separated (\n) and tab-separated (\t) request body.
Must handle different record types:
Device Registration/Info (INFO, &options=): Parse capabilities (e.g., FaceFun=1, FingFun=1) and update the devices table.
ATTLOG (Attendance Log):
Parse PIN, Timestamp, Status, VerifyMode.
AttPhoto Handling: If AttPhoto (Base64) is present, decode it and upload to Supabase Storage.
Store in attendance_logs table, including the att_photo_path.
USER (User Data): Parse PIN, Name, Card (RFID). Upsert into employees table.
FP (Fingerprint Template): Parse PIN, Template. Store in biometric_templates.
FACE (Face Template): Parse PIN, Template. Store in biometric_templates.
Must respond with OK to acknowledge successful data receipt.
Requirement 3.1.3: Command Polling Endpoint (/api/adms/getrequest)
Must be an HTTP GET API Route.
Must identify the device by its SN from the query string.
Must query the pending_commands table in Supabase for any commands where device_sn == SN and status == 'pending'.
If no commands exist: Respond with OK in the text/plain body.
If a command exists:
Respond with the command in the format C:COMMAND_ID:COMMAND_STRING\n (e.g., C:123456789:DATA UPDATE USER PIN=101\tName=John Doe\tCard=12345678).
Update the command's status to 'sent' in the pending_commands table.
Requirement 3.1.4: Command Acknowledgment
The cdata endpoint (3.1.2) must also parse OK <CommandID> responses from the device.
When this is received, it must update the corresponding command in pending_commands to status = 'acked'.
3.2. Epic 2: The Web Dashboard (Next.js Frontend)
This is the client-facing React application for administrators, built using the Next.js App Router, Shadcn UI, and Tailwind V3.
Requirement 3.2.1: Authentication
Must have a secure login page for Admins.
Must use Supabase Auth with the @supabase/ssr library for cookie-based session management.
All dashboard pages must be server-side protected.
Requirement 3.2.2: Device Dashboard
Must display a Card for each device from the devices table.
The Card must show:
Device Name, Serial Number (SN), TransactionStamp.
Live Status: "Online" or "Offline" (based on last_seen). This will use Supabase Realtime.
Capabilities: Display icons (e.g., lucide-react icons for Fingerprint, User, Camera) if supports_finger, supports_rfid, supports_face are true.
Must include a Button on the card to "Send Command" and a "Manual Sync" button.
The "Send Command" menu should intelligently disable options (e.g., "Sync All Faces") if the device does not support it.
Requirement 3.2.3: Employee Management
Must display a Table (using shadcn/ui/table) of all users from the employees table.
Columns: Employee Code, Name, RFID Card #.
Must include a Button to "Add New Employee" (opens a Dialog). The dialog must have fields for Name, Employee Code, and RFID Card.
Must include an "Edit" Button for each row (opens a Dialog).
Crucial Workflow (Update Employee):
Admin clicks "Edit" and changes Name to "John S. Doe" and Card to "12345678".
The Next.js app updates the row in the employees table.
A Supabase Database Function (Trigger) automatically creates a new row in the pending_commands table.
The command_string will be DATA UPDATE USER PIN=101\tName=John S. Doe\tCard=12345678.
The next time the device polls (Req 3.1.3), it will receive this command and update itself.
Requirement 3.2.4: Crucial Workflow (Manual Sync)
Admin clicks "Manual Sync" on a device.
The Next.js app (via a Server Action) inserts a new row into the pending_commands table.
The command_string will be DATA QUERY ATTLOG StartTime=2000-00-00 00:00:00.
The next time the device polls, it receives this command and begins pushing all its stored attendance logs.
Requirement 3.2.5: Live Attendance Log Viewer
Must display a Table of data from the attendance_logs table.
Columns: Employee Name, Device Name, Timestamp, Status, Photo.
Clicking the row should open a Dialog showing the full-size photo loaded from Supabase Storage.
The table must update in real-time using Supabase Realtime.
3.3. Epic 3: Database & Auth (Supabase)
Requirement 3.3.1: Database Schema (See 4.3 for details)
Requirement 3.3.2: Storage
Must create a Supabase Storage bucket named attendance-photos.
Must have RLS policies so photos can be written by the API routes and read by authenticated dashboard users.
Requirement 3.3.3: Real-time
Must enable Supabase Realtime (Broadcasting) on the devices and attendance_logs tables.
Requirement 3.3.4: Database Function (Trigger) for Commands
Must create a PostgreSQL function (on_employee_update) in Supabase.
This function must be attached as a Trigger that fires AFTER UPDATE on the employees table.
The function will check which fields changed (e.g., name, employee_code, rfid_card) and insert the correct DATA UPDATE USER... command into the pending_commands table.
3.4. Epic 4: Public REST API (for ERP/HRMS)
This API provides secure, read-only access to the collected data. This will be built using Next.js API Routes.
Requirement 3.4.1: API Authentication
All requests to /api/v1/* must be authenticated using a static API key (Bearer Token) passed in the Authorization header.
The API key will be stored securely in Vercel Environment Variables.
Requirement 3.4.2: Endpoint: Get Employees (GET /api/v1/employees)
Action: Returns a list of all employees.
Response (JSON): {"data": [{"employee_code": "101", "name": "John Doe", "rfid_card": "12345678"}, ...]}
Requirement 3.4.3: Endpoint: Get Employee (GET /api/v1/employees/[code])
Action: Returns a single employee by their employee_code.
Response (JSON): {"data": {"employee_code": "101", "name": "John Doe", "rfid_card": "12345678"}}
Requirement 3.4.4: Endpoint: Get Attendance Logs (GET /api/v1/attendance)
Action: Returns a list of attendance logs, with optional filtering.
Query Parameters: start_date, end_date, employee_code.
Response (JSON): {"data": [{"employee_code": "101", "device_sn": "ABC12345", "punch_timestamp": "...", "photo_url": "..."}, ...]}
4. Technical Architecture
4.1. System Architecture Diagram
The system operates in four decoupled loops on one platform:
Data Loop (Push): Biometric Device -> HTTP POST -> Vercel (Next.js API Route) -> Supabase DB & Supabase Storage.
Admin Loop (Real-time): Admin <-> Vercel (Next.js App) <-> Supabase DB & Supabase Storage.
Command Loop (Poll): Admin -> Vercel (Next.js Server Action) -> Supabase DB (pending_commands) <- Vercel (Next.js API Route) <- HTTP GET <- Biometric Device.
External API Loop (Pull): External ERP/HRMS -> HTTP GET -> Vercel (Next.js API Route) -> Supabase DB.
4.2. Technology Stack
Component
Technology
Rationale
Application Framework
Next.js 14+ (App Router)
A unified platform for the dashboard, ADMS listener, and public API.
Deployment Platform
Vercel
Natively supports Next.js, serverless functions, and URL rewrites.
Database
Supabase (Postgres)
Central data store, Auth, and Real-time engine.
File Storage
Supabase Storage
For storing AttPhoto images efficiently.
UI Components
Shadcn UI & Tailwind V3
Rapidly build a beautiful, accessible, and consistent UI.
IDE
Cursor AI
(Used for development to accelerate coding and integration).

4.3. Supabase Database Schema (v1.6)
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
  supports_rfid BOOLEAN DEFAULT false
);

-- Master list of employees
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT NOT NULL UNIQUE, -- The "PIN" on the device, from employees.EmployeeCode
  name TEXT, -- from employees.EmployeeName
  rfid_card TEXT, -- from employees.EmployeeRFIDNumber
  privilege INT DEFAULT 0 -- from employees.Role
);

-- Stores raw biometric templates
CREATE TABLE biometric_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL, -- 'finger', 'face', 'palm' (from employeesbio.BioName)
  finger_id INT, -- Which finger (0-9)
  template_data TEXT NOT new -- The full Base64 string (from employeesbio.Bio)
);

-- Stores all attendance punches
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id),
  employee_id UUID REFERENCES employees(id),
  punch_timestamp TIMESTAMPTZ NOT NULL, -- from devicelogs.LogDate
  status_code INT,
  verify_mode INT, -- from devicelogs.VerificationType
  att_photo_path TEXT -- Path to the photo in Supabase Storage
);

-- Command queue for devices to poll
CREATE TABLE pending_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id BIGINT UNIQUE DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT,
  device_sn TEXT NOT NULL, -- References devices.serial_number
  command_string TEXT NOT NULL, -- from devicecommands.DeviceCommand
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'acked', 'failed'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stores API keys for external systems
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., "HRMS System"
  hashed_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAME_TZ DEFAULT now()
);

-- Create Storage Bucket for photos
-- (This is done via the Supabase Dashboard or Management API)
-- Bucket Name: "attendance-photos"


5. Non-Functional Requirements
Security: The Next.js dashboard must be accessible only to authenticated users. The Public API must be secured with an API key. Vercel Environment Variables must be used for all secrets.
Scalability: The serverless functions on Vercel will scale automatically with traffic.
Real-time: The Admin dashboard must reflect device status and new punches in under 5 seconds.
Error Handling: API routes must gracefully handle malformed data and Base64 photo decoding errors without crashing the application.
6. Open Questions
What are all the possible status_code and verify_mode integers for an ATTLOG? (The verificationtype table in your SQL file helps, but we need to confirm status_code).
What is the exact command format for DATA QUERY ATTLOG? Does StartTime=2000-00-00 00:00:00 work, or do we need to be more specific?
