'use client';

import { useEffect, useState } from 'react';
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
import { Plus, Pencil } from 'lucide-react';

interface Employee {
  id: string;
  employee_code: string;
  name: string | null;
  rfid_card: string | null;
  privilege: number;
}

interface EmployeeManagementProps {
  initialEmployees: Employee[];
}

export default function EmployeeManagement({ initialEmployees }: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    rfid_card: '',
  });
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to employee changes
    const channel = supabase
      .channel('employees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setEmployees((prev) =>
              prev.map((e) =>
                e.id === payload.new.id ? (payload.new as Employee) : e
              )
            );
          } else if (payload.eventType === 'INSERT') {
            setEmployees((prev) => [...prev, payload.new as Employee]);
          } else if (payload.eventType === 'DELETE') {
            setEmployees((prev) =>
              prev.filter((e) => e.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleAdd = () => {
    setFormData({ employee_code: '', name: '', rfid_card: '' });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      employee_code: employee.employee_code,
      name: employee.name || '',
      rfid_card: employee.rfid_card || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleAddSubmit = async () => {
    const { error } = await supabase
      .from('employees')
      .insert({
        employee_code: formData.employee_code,
        name: formData.name || null,
        rfid_card: formData.rfid_card || null,
      });

    if (error) {
      alert('Error adding employee: ' + error.message);
    } else {
      setIsAddDialogOpen(false);
      setFormData({ employee_code: '', name: '', rfid_card: '' });
    }
  };

  const handleEditSubmit = async () => {
    if (!editingEmployee) return;

    const { error } = await supabase
      .from('employees')
      .update({
        employee_code: formData.employee_code,
        name: formData.name || null,
        rfid_card: formData.rfid_card || null,
      })
      .eq('id', editingEmployee.id);

    if (error) {
      alert('Error updating employee: ' + error.message);
    } else {
      setIsEditDialogOpen(false);
      setEditingEmployee(null);
      setFormData({ employee_code: '', name: '', rfid_card: '' });
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage employee information and sync to devices
        </p>
      </div>
      <div className="mb-6 flex items-center justify-end">
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>RFID Card #</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">
                  {employee.employee_code}
                </TableCell>
                <TableCell>{employee.name || '-'}</TableCell>
                <TableCell>{employee.rfid_card || '-'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(employee)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {employees.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-gray-500">No employees found.</p>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>
              Add a new employee to the system. Changes will sync to all devices.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-code">Employee Code *</Label>
              <Input
                id="add-code"
                value={formData.employee_code}
                onChange={(e) =>
                  setFormData({ ...formData, employee_code: e.target.value })
                }
                placeholder="101"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-rfid">RFID Card Number</Label>
              <Input
                id="add-rfid"
                value={formData.rfid_card}
                onChange={(e) =>
                  setFormData({ ...formData, rfid_card: e.target.value })
                }
                placeholder="12345678"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubmit} disabled={!formData.employee_code}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information. Changes will automatically sync to all devices.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-code">Employee Code *</Label>
              <Input
                id="edit-code"
                value={formData.employee_code}
                onChange={(e) =>
                  setFormData({ ...formData, employee_code: e.target.value })
                }
                placeholder="101"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-rfid">RFID Card Number</Label>
              <Input
                id="edit-rfid"
                value={formData.rfid_card}
                onChange={(e) =>
                  setFormData({ ...formData, rfid_card: e.target.value })
                }
                placeholder="12345678"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={!formData.employee_code}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

