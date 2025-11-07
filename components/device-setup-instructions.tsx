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
              <label className="text-sm font-medium text-gray-700">Server Address / Server URL</label>
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
              <p className="mt-1 text-xs text-gray-500">
                This is the base URL for your ADMS server. Some devices only need this URL and will automatically construct the full endpoint paths.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Data Push URL <span className="text-gray-400 font-normal">(if separate field available)</span></label>
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
                Endpoint where devices send attendance logs and data. Only needed if your device has a separate field for this.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Command Poll URL <span className="text-gray-400 font-normal">(if separate field available)</span></label>
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
                Endpoint where devices poll for pending commands. Only needed if your device has a separate field for this.
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
                  On your eSSL Biomatrix device, navigate to: <strong>Menu → Communication → ADMS</strong> or <strong>Menu → Cloud Server Setting</strong>
                </p>
              </li>
              <li className="space-y-2">
                <p className="font-medium">Set Server Mode</p>
                <p className="text-sm text-gray-600">
                  Ensure <strong>Server Mode</strong> is set to <strong>ADMS</strong>
                </p>
              </li>
              <li className="space-y-2">
                <p className="font-medium">Enter Server Address</p>
                <p className="text-sm text-gray-600">
                  Set the <strong>Server Address</strong> (or <strong>Server URL</strong>) to: 
                </p>
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <code className="text-sm font-mono text-gray-900">{serverUrl}</code>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  <strong>Note:</strong> Some device models only require the base Server Address. The device will automatically use:
                  <br />• <code className="bg-gray-100 px-1 rounded">{dataPushUrl}</code> for data push
                  <br />• <code className="bg-gray-100 px-1 rounded">{commandPollUrl}</code> for command polling
                </p>
              </li>
              <li className="space-y-2">
                <p className="font-medium">Enable Domain Name (if available)</p>
                <p className="text-sm text-gray-600">
                  If your device has an <strong>Enable Domain Name</strong> option, set it to <strong>ON</strong>
                </p>
              </li>
              <li className="space-y-2">
                <p className="font-medium">Configure Separate URLs (if available)</p>
                <p className="text-sm text-gray-600">
                  If your device has separate fields for Data Push URL and Command Poll URL:
                </p>
                <div className="mt-2 space-y-2 ml-4">
                  <div>
                    <p className="text-sm font-medium">Data Push URL:</p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{dataPushUrl}</code>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Command Poll URL:</p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{commandPollUrl}</code>
                  </div>
                </div>
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

        {/* Device Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Device Requirements</CardTitle>
            <CardDescription>
              Important information about device communication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium text-sm mb-1">HTTP Support</p>
              <p className="text-sm text-gray-600">
                These devices only support <strong>HTTP</strong> (not HTTPS) unless patched. 
                Your server must:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2 mt-2">
                <li>Accept HTTP POST/GET requests</li>
                <li>Require no authentication</li>
                <li>Return plain text responses</li>
                <li>Always respond with status 200 OK</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Server Configuration</p>
              <p className="text-sm text-gray-600">
                The server endpoints are configured to meet these requirements. 
                Device endpoints (<code className="bg-gray-100 px-1 rounded">/iclock/cdata</code> and <code className="bg-gray-100 px-1 rounded">/iclock/getrequest</code>) 
                are publicly accessible and always return plain text &quot;OK&quot; responses.
              </p>
            </div>
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
                <li><strong>Note:</strong> Devices support HTTP (not HTTPS) unless patched. Ensure your server accepts HTTP connections.</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Device shows as offline</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
                <li>Check network connectivity</li>
                <li>Verify firewall settings allow outbound HTTP/HTTPS connections</li>
                <li>Check if the server URL is accessible from the device</li>
                <li><strong>Important:</strong> Devices only support HTTP (not HTTPS) unless patched. Your server must accept HTTP connections.</li>
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

