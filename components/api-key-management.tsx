'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Copy, Check, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { hashApiKey } from '@/lib/api-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Use Web Crypto API for generating random values
declare const crypto: Crypto;

interface ApiKey {
  id: string;
  name: string;
  hashed_key: string;
  created_at: string;
}

interface ApiKeyManagementProps {
  initialApiKeys: ApiKey[];
}

export default function ApiKeyManagement({ initialApiKeys }: ApiKeyManagementProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialApiKeys);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const supabase = createClient();

  const generateApiKey = (): string => {
    // Generate a secure random API key
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return 'adms_' + hex;
  };

  const handleGenerate = async () => {
    if (!newKeyName.trim()) {
      alert('Please enter a name for the API key');
      return;
    }

    const apiKey = generateApiKey();
    const hashedKey = await hashApiKey(apiKey);

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        name: newKeyName,
        hashed_key: hashedKey,
      })
      .select()
      .single();

    if (error) {
      alert('Error generating API key: ' + error.message);
    } else {
      setGeneratedKey(apiKey);
      setApiKeys([data, ...apiKeys]);
      setNewKeyName('');
    }
  };

  const copyToClipboard = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setGeneratedKey(null);
    setNewKeyName('');
    setCopied(false);
  };

  const handleDelete = async (keyId: string, keyName: string) => {
    setDeletingKeyId(keyId);
    
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId);

    if (error) {
      alert('Error deleting API key: ' + error.message);
      setDeletingKeyId(null);
    } else {
      setApiKeys(apiKeys.filter(key => key.id !== keyId));
      setDeletingKeyId(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
        <p className="mt-2 text-sm text-gray-600">
          Generate and manage API keys for external system integration
        </p>
      </div>
      <div className="mb-6 flex items-center justify-end">
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate API Key
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.name}</TableCell>
                <TableCell>
                  {format(new Date(key.created_at), 'PPpp')}
                </TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingKeyId === key.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingKeyId === key.id ? (
                          'Deleting...'
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the API key &quot;{key.name}&quot;?
                          <br />
                          <br />
                          This action cannot be undone. Any systems using this API key will
                          immediately lose access to the API.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(key.id, key.name)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {apiKeys.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-gray-500">No API keys found.</p>
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {generatedKey ? 'API Key Generated' : 'Generate API Key'}
            </DialogTitle>
            <DialogDescription>
              {generatedKey
                ? 'Copy this API key now. You won\'t be able to see it again!'
                : 'Create a new API key for external systems to access the API.'}
            </DialogDescription>
          </DialogHeader>
          {!generatedKey ? (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="key-name">Name *</Label>
                  <Input
                    id="key-name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., HRMS System"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={!newKeyName.trim()}>
                  Generate
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      value={generatedKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-red-600">
                    ⚠️ Save this key securely. It cannot be retrieved later.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseDialog}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

