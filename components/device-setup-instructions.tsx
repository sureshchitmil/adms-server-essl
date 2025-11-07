'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Server, Globe, Key } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function DeviceSetupInstructions() {
  const [copied, setCopied] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    // Get the base URL
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const serverUrl = baseUrl || 'https://your-app.vercel.app';
  const dataPushUrl = `${serverUrl}/iclock/cdata`;
  const commandPollUrl = `${serverUrl}/iclock/getrequest`;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Device Setup Instructions</h1>
        <p className="mt-2 text-sm text-gray-600">
          Configure your eSSL Biomatrix devices to connect to ADMS Server
        </p>
      </div>

      <div className="space-y-6">
        {/* Server Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <CardTitle>Server Configuration</CardTitle>
            </div>
            <CardDescription>
              Configure your device with these server settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Server URL</label>
              <div className="mt-1 flex gap-2">
                <code className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-mono">
                  {serverUrl}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(serverUrl, 'server-url')}
                >
                  {copied === 'server-url' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Data Push URL</label>
              <div className="mt-1 flex gap-2">
                <code className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-mono">
                  {dataPushUrl}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(dataPushUrl, 'data-push')}
                >
                  {copied === 'data-push' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Endpoint where devices send attendance logs and data
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Command Poll URL</label>
              <div className="mt-1 flex gap-2">
                <code className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-mono">
                  {commandPollUrl}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(commandPollUrl, 'command-poll')}
                >
                  {copied === 'command-poll' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Endpoint where devices poll for pending commands
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step-by-Step Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Step-by-Step Setup</CardTitle>
            <CardDescription>
              Follow these steps to configure your eSSL Biomatrix device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 list-decimal list-inside">
              <li className="space-y-2">
                <p className="font-medium">Access Device Menu</p>
                <p className="text-sm text-gray-600">
                  On your eSSL Biomatrix device, navigate to: <strong>Menu → Communication → ADMS</strong>
                </p>
              </li>
              <li className="space-y-2">
                <p className="font-medium">Enter Server URL</p>
                <p className="text-sm text-gray-600">
                  Set the <strong>Server URL</strong> to: <code className="bg-gray-100 px-1 rounded">{serverUrl}</code>
                </p>
              </li>
              <li className="space-y-2">
                <p className="font-medium">Configure Data Push</p>
                <p className="text-sm text-gray-600">
                  Set <strong>Data Push URL</strong> to: <code className="bg-gray-100 px-1 rounded">{dataPushUrl}</code>
                </p>
                <p className="text-sm text-gray-500">
                  This is where the device will send attendance logs, user data, and photos.
                </p>
              </li>
              <li className="space-y-2">
                <p className="font-medium">Configure Command Poll</p>
                <p className="text-sm text-gray-600">
                  Set <strong>Command Poll URL</strong> to: <code className="bg-gray-100 px-1 rounded">{commandPollUrl}</code>
                </p>
                <p className="text-sm text-gray-500">
                  The device will poll this endpoint every 30 seconds for pending commands.
                </p>
              </li>
              <li className="space-y-2">
                <p className="font-medium">Enable Push Mode</p>
                <p className="text-sm text-gray-600">
                  Enable <strong>Push Mode</strong> or <strong>ADMS Mode</strong> in device settings
                </p>
              </li>
              <li className="space-y-2">
                <p className="font-medium">Save and Restart</p>
                <p className="text-sm text-gray-600">
                  Save all settings and restart the device. The device will automatically connect and register itself.
                </p>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Device Registration */}
        <Card>
          <CardHeader>
            <CardTitle>Device Registration</CardTitle>
            <CardDescription>
              What happens after configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium text-sm mb-1">Automatic Registration</p>
              <p className="text-sm text-gray-600">
                When the device first connects, it will automatically send its device information (serial number, capabilities) 
                to the server. The device will appear in the <strong>Devices</strong> page.
              </p>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Heartbeat</p>
              <p className="text-sm text-gray-600">
                The device sends a heartbeat every few minutes to indicate it&apos;s online. 
                Devices are considered offline if no heartbeat is received for 5 minutes.
              </p>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Data Synchronization</p>
              <p className="text-sm text-gray-600">
                Attendance logs are pushed immediately when an employee punches in. 
                You can also manually sync all data using the &quot;Manual Sync&quot; button on the device card.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
            <CardDescription>
              Common issues and solutions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium text-sm mb-1">Device not appearing</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
                <li>Verify the server URL is correct and accessible from the device network</li>
                <li>Check that Push Mode is enabled</li>
                <li>Restart the device</li>
                <li>Check device logs for connection errors</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Device shows as offline</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
                <li>Check network connectivity</li>
                <li>Verify firewall settings allow outbound HTTPS connections</li>
                <li>Check if the server URL is accessible from the device</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Data not syncing</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
                <li>Use &quot;Manual Sync&quot; button to force synchronization</li>
                <li>Check device storage capacity</li>
                <li>Verify device is online</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

