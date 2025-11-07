'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Key, Globe, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ApiDocumentation() {
  const [copied, setCopied] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Get the base URL
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }

    // Try to get the first API key as an example
    const fetchApiKey = async () => {
      const { data } = await supabase
        .from('api_keys')
        .select('name')
        .limit(1)
        .single();
      
      if (data) {
        setApiKey('your_api_key_here');
      }
    };
    fetchApiKey();
  }, [supabase]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const apiBaseUrl = `${baseUrl}/api/v1`;

  const curlExamples = {
    employees: `curl -X GET "${apiBaseUrl}/employees" \\
  -H "Authorization: Bearer ${apiKey || 'your_api_key'}"`,
    employee: `curl -X GET "${apiBaseUrl}/employees/101" \\
  -H "Authorization: Bearer ${apiKey || 'your_api_key'}"`,
    attendance: `curl -X GET "${apiBaseUrl}/attendance?start_date=2025-01-01&end_date=2025-01-31" \\
  -H "Authorization: Bearer ${apiKey || 'your_api_key'}"`,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
        <p className="mt-2 text-sm text-gray-600">
          REST API documentation for integrating with external systems
        </p>
      </div>

      <div className="space-y-6">
        {/* Authentication */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <CardTitle>Authentication</CardTitle>
            </div>
            <CardDescription>
              All API requests require authentication using an API key
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-700 mb-2">
                Include your API key in the <code className="bg-gray-100 px-1 rounded">Authorization</code> header:
              </p>
              <div className="flex gap-2">
                <code className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-mono">
                  Authorization: Bearer your_api_key_here
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard('Authorization: Bearer your_api_key_here', 'auth-header')}
                >
                  {copied === 'auth-header' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Generate API keys from the <strong>API Keys</strong> page in the dashboard. 
                Keep your API keys secure and never expose them in client-side code.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Base URL */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>Base URL</CardTitle>
            </div>
            <CardDescription>
              All API endpoints are prefixed with this base URL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <code className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-mono">
                {apiBaseUrl}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(apiBaseUrl, 'base-url')}
              >
                {copied === 'base-url' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Get Employees */}
        <Card>
          <CardHeader>
            <CardTitle>GET /employees</CardTitle>
            <CardDescription>
              Retrieve a list of all employees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Endpoint</p>
              <div className="flex gap-2">
                <code className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-mono">
                  GET {apiBaseUrl}/employees
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(`${apiBaseUrl}/employees`, 'endpoint-employees')}
                >
                  {copied === 'endpoint-employees' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">cURL Example</p>
              <div className="relative">
                <pre className="rounded-md bg-gray-900 text-gray-100 p-4 text-xs overflow-x-auto">
                  <code>{curlExamples.employees}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-100"
                  onClick={() => copyToClipboard(curlExamples.employees, 'curl-employees')}
                >
                  {copied === 'curl-employees' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Response</p>
              <pre className="rounded-md bg-gray-100 p-4 text-xs overflow-x-auto">
                <code>{`{
  "data": [
    {
      "employee_code": "101",
      "name": "John Doe",
      "rfid_card": "12345678"
    },
    {
      "employee_code": "102",
      "name": "Jane Smith",
      "rfid_card": "87654321"
    }
  ]
}`}</code>
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Get Single Employee */}
        <Card>
          <CardHeader>
            <CardTitle>GET /employees/[code]</CardTitle>
            <CardDescription>
              Retrieve a single employee by employee code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Endpoint</p>
              <div className="flex gap-2">
                <code className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-mono">
                  GET {apiBaseUrl}/employees/101
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(`${apiBaseUrl}/employees/101`, 'endpoint-employee')}
                >
                  {copied === 'endpoint-employee' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">cURL Example</p>
              <div className="relative">
                <pre className="rounded-md bg-gray-900 text-gray-100 p-4 text-xs overflow-x-auto">
                  <code>{curlExamples.employee}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-100"
                  onClick={() => copyToClipboard(curlExamples.employee, 'curl-employee')}
                >
                  {copied === 'curl-employee' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Response</p>
              <pre className="rounded-md bg-gray-100 p-4 text-xs overflow-x-auto">
                <code>{`{
  "data": {
    "employee_code": "101",
    "name": "John Doe",
    "rfid_card": "12345678"
  }
}`}</code>
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Get Attendance Logs */}
        <Card>
          <CardHeader>
            <CardTitle>GET /attendance</CardTitle>
            <CardDescription>
              Retrieve attendance logs with optional filtering
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Endpoint</p>
              <div className="flex gap-2">
                <code className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-mono">
                  GET {apiBaseUrl}/attendance
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(`${apiBaseUrl}/attendance`, 'endpoint-attendance')}
                >
                  {copied === 'endpoint-attendance' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Query Parameters</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">start_date</code>
                  <span className="text-sm text-gray-600">(optional) Start date in YYYY-MM-DD format</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">end_date</code>
                  <span className="text-sm text-gray-600">(optional) End date in YYYY-MM-DD format</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">employee_code</code>
                  <span className="text-sm text-gray-600">(optional) Filter by employee code</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">cURL Example</p>
              <div className="relative">
                <pre className="rounded-md bg-gray-900 text-gray-100 p-4 text-xs overflow-x-auto">
                  <code>{curlExamples.attendance}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-100"
                  onClick={() => copyToClipboard(curlExamples.attendance, 'curl-attendance')}
                >
                  {copied === 'curl-attendance' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Response</p>
              <pre className="rounded-md bg-gray-100 p-4 text-xs overflow-x-auto">
                <code>{`{
  "data": [
    {
      "employee_code": "101",
      "device_sn": "ABC12345",
      "punch_timestamp": "2025-01-15T09:30:00Z",
      "status_code": 0,
      "verify_mode": 15,
      "photo_url": "https://..."
    }
  ]
}`}</code>
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Error Responses */}
        <Card>
          <CardHeader>
            <CardTitle>Error Responses</CardTitle>
            <CardDescription>
              Standard error response format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">401 Unauthorized</p>
              <pre className="rounded-md bg-gray-100 p-4 text-xs overflow-x-auto">
                <code>{`{
  "error": "Unauthorized"
}`}</code>
              </pre>
              <p className="text-sm text-gray-600 mt-2">
                Returned when API key is missing or invalid
              </p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">404 Not Found</p>
              <pre className="rounded-md bg-gray-100 p-4 text-xs overflow-x-auto">
                <code>{`{
  "error": "Employee not found"
}`}</code>
              </pre>
              <p className="text-sm text-gray-600 mt-2">
                Returned when requested resource doesn't exist
              </p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">500 Internal Server Error</p>
              <pre className="rounded-md bg-gray-100 p-4 text-xs overflow-x-auto">
                <code>{`{
  "error": "Internal server error"
}`}</code>
              </pre>
              <p className="text-sm text-gray-600 mt-2">
                Returned when an unexpected server error occurs
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <CardTitle>Rate Limiting</CardTitle>
            <CardDescription>
              API usage guidelines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-700">
                Currently, there are no strict rate limits. However, please use the API responsibly:
              </p>
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
                <li>Implement reasonable retry logic with exponential backoff</li>
                <li>Avoid making excessive requests in short time periods</li>
                <li>Cache responses when appropriate</li>
                <li>Use date range filters to limit response sizes</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

