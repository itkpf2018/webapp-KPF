'use client';

/**
 * User PINs Management Client Component
 * Admin interface for managing user authentication PINs
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Key, Shield, User, CheckCircle, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import type { Database } from '@/types/supabase';

type UserPin = Database['public']['Tables']['user_pins']['Row'];
type UserRole = 'employee' | 'sales' | 'admin' | 'super_admin';

export default function UserPinsClient() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPin, setEditingPin] = useState<UserPin | null>(null);
  const [deletingPin, setDeletingPin] = useState<UserPin | null>(null);
  const [resettingPin, setResettingPin] = useState<UserPin | null>(null);
  const queryClient = useQueryClient();

  // Fetch user PINs
  const { data: userPins, isLoading } = useQuery({
    queryKey: ['user-pins'],
    queryFn: async () => {
      const res = await fetch('/api/admin/user-pins');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      return data.userPins as UserPin[];
    },
  });

  // Create PIN mutation
  const createMutation = useMutation({
    mutationFn: async (data: { employee_id: string; employee_name: string; pin: string; role: string }) => {
      const res = await fetch('/api/admin/user-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pins'] });
      setIsCreateModalOpen(false);
    },
  });

  // Update PIN mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserPin> }) => {
      const res = await fetch(`/api/admin/user-pins/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pins'] });
      setEditingPin(null);
    },
  });

  // Delete PIN mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/user-pins/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pins'] });
      setDeletingPin(null);
    },
  });

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      employee: 'bg-blue-100 text-blue-700 border-blue-200',
      sales: 'bg-green-100 text-green-700 border-green-200',
      admin: 'bg-red-100 text-red-700 border-red-200',
      super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    const labels: Record<string, string> = {
      employee: 'พนักงาน',
      sales: 'Sales',
      admin: 'Admin',
      super_admin: 'Super Admin',
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${colors[role] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
        <Shield className="h-3 w-3" />
        {labels[role] || role}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <p className="text-sm text-slate-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 pt-24">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">จัดการ PIN ผู้ใช้งาน</h1>
            <p className="mt-1 text-sm text-slate-600">
              สร้าง แก้ไข และจัดการ PIN สำหรับระบบยืนยันตัวตน
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-md transition hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            สร้าง PIN ใหม่
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-3">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{userPins?.length || 0}</p>
                <p className="text-sm text-slate-600">ผู้ใช้งานทั้งหมด</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-green-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {userPins?.filter(p => p.is_active).length || 0}
                </p>
                <p className="text-sm text-slate-600">Active</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-red-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-3">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {userPins?.filter(p => !p.is_active).length || 0}
                </p>
                <p className="text-sm text-slate-600">Inactive</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Warning */}
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              เพื่อความปลอดภัย PIN ถูกเข้ารหัสด้วย bcrypt
            </p>
            <p className="mt-1 text-xs text-amber-700">
              ไม่สามารถแสดง PIN จริงได้ หากต้องการเปลี่ยน PIN ใช้ฟีเจอร์ &quot;รีเซ็ต PIN&quot; หรือแก้ไขผู้ใช้
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  รหัสพนักงาน
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  ชื่อ
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  PIN
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  บทบาท
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  สถานะ
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Login ล่าสุด
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {userPins?.map((pin) => (
                <tr key={pin.id} className="transition hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {pin.employee_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{pin.employee_name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-slate-500">••••••</span>
                      <button
                        onClick={() => setResettingPin(pin)}
                        className="rounded-lg p-1 text-orange-600 transition hover:bg-orange-50"
                        title="รีเซ็ต PIN"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(pin.role)}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        updateMutation.mutate({
                          id: pin.id,
                          data: { is_active: !pin.is_active },
                        });
                      }}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition ${
                        pin.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {pin.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {pin.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {pin.last_login_at
                      ? new Date(pin.last_login_at).toLocaleString('th-TH')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingPin(pin)}
                        className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                        title="แก้ไข"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingPin(pin)}
                        className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                        title="ลบ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!userPins?.length && (
            <div className="p-12 text-center">
              <Key className="mx-auto mb-4 h-12 w-12 text-slate-400" />
              <p className="text-slate-600">ยังไม่มีผู้ใช้งานในระบบ</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 text-sm font-semibold text-blue-600 hover:underline"
              >
                สร้าง PIN ใหม่
              </button>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {isCreateModalOpen && (
          <CreatePINModal
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={(data) => createMutation.mutate(data)}
            isSubmitting={createMutation.isPending}
            error={createMutation.error?.message}
          />
        )}

        {/* Edit Modal */}
        {editingPin && (
          <EditPINModal
            pin={editingPin}
            onClose={() => setEditingPin(null)}
            onSubmit={(data) => updateMutation.mutate({ id: editingPin.id, data })}
            isSubmitting={updateMutation.isPending}
            error={updateMutation.error?.message}
          />
        )}

        {/* Delete Confirm */}
        {deletingPin && (
          <DeleteConfirmModal
            pin={deletingPin}
            onClose={() => setDeletingPin(null)}
            onConfirm={() => deleteMutation.mutate(deletingPin.id)}
            isDeleting={deleteMutation.isPending}
          />
        )}

        {/* Reset PIN Modal */}
        {resettingPin && (
          <ResetPINModal
            pin={resettingPin}
            onClose={() => setResettingPin(null)}
            onSubmit={(newPin) => {
              updateMutation.mutate({
                id: resettingPin.id,
                data: { pin_hash: newPin },
              });
              setResettingPin(null);
            }}
            isSubmitting={updateMutation.isPending}
            error={updateMutation.error?.message}
          />
        )}
      </div>
    </div>
  );
}

// Create PIN Modal Component
function CreatePINModal({
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: {
  onClose: () => void;
  onSubmit: (data: { employee_id: string; employee_name: string; pin: string; role: string }) => void;
  isSubmitting: boolean;
  error?: string;
}) {
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    pin: '',
    role: 'employee' as UserRole,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-slate-900">สร้าง PIN ใหม่</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">รหัสพนักงาน</label>
            <input
              type="text"
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">ชื่อ-สกุล</label>
            <input
              type="text"
              value={formData.employee_name}
              onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">PIN (4-6 หลัก)</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none"
              required
              minLength={4}
              maxLength={6}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">บทบาท</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="employee">พนักงาน (Employee)</option>
              <option value="sales">Sales</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
            <p className="font-semibold">เพื่อความปลอดภัย กรุณาจดจำ PIN ของคุณ</p>
            <p className="mt-1 text-blue-600">PIN จะถูกเข้ารหัสและไม่สามารถดูค่าจริงได้ในภายหลัง</p>
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
              disabled={isSubmitting}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'กำลังสร้าง...' : 'สร้าง'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit PIN Modal Component
function EditPINModal({
  pin,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: {
  pin: UserPin;
  onClose: () => void;
  onSubmit: (data: Partial<UserPin>) => void;
  isSubmitting: boolean;
  error?: string;
}) {
  const [formData, setFormData] = useState({
    employee_name: pin.employee_name,
    pin: '',
    role: pin.role as UserRole,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: Partial<UserPin> = {
      employee_name: formData.employee_name,
      role: formData.role,
    };
    if (formData.pin) {
      updates.pin_hash = formData.pin; // Will be hashed by API
    }
    onSubmit(updates);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-slate-900">แก้ไข PIN</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">รหัสพนักงาน</label>
            <input
              type="text"
              value={pin.employee_id}
              disabled
              className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">ชื่อ-สกุล</label>
            <input
              type="text"
              value={formData.employee_name}
              onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              PIN ใหม่ (เว้นว่างถ้าไม่ต้องการเปลี่ยน)
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none"
              minLength={4}
              maxLength={6}
              placeholder="••••"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">บทบาท</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="employee">พนักงาน (Employee)</option>
              <option value="sales">Sales</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
            <p className="font-semibold">เพื่อความปลอดภัย กรุณาจดจำ PIN ของคุณ</p>
            <p className="mt-1 text-amber-600">PIN จะถูกเข้ารหัสและไม่สามารถดูค่าจริงได้ในภายหลัง</p>
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
              disabled={isSubmitting}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reset PIN Modal Component
function ResetPINModal({
  pin,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: {
  pin: UserPin;
  onClose: () => void;
  onSubmit: (newPin: string) => void;
  isSubmitting: boolean;
  error?: string;
}) {
  const [newPin, setNewPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length >= 4 && newPin.length <= 6) {
      onSubmit(newPin);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-orange-100 p-3">
            <RotateCcw className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">รีเซ็ต PIN</h2>
            <p className="text-sm text-slate-600">
              {pin.employee_name} ({pin.employee_id})
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">เพื่อความปลอดภัย</p>
                <p className="mt-1 text-amber-600">
                  PIN เดิมถูกเข้ารหัสแล้ว ไม่สามารถแสดงได้ กรุณาตั้งค่า PIN ใหม่
                </p>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              PIN ใหม่ (4-6 หลัก)
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-widest focus:border-orange-500 focus:outline-none"
              required
              minLength={4}
              maxLength={6}
              placeholder="••••"
              autoFocus
            />
            <p className="mt-1 text-xs text-slate-500">
              ป้อน PIN ใหม่ {newPin.length}/6 หลัก
            </p>
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
              disabled={isSubmitting}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
              disabled={isSubmitting || newPin.length < 4}
            >
              {isSubmitting ? 'กำลังรีเซ็ต...' : 'รีเซ็ต PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirm Modal Component
function DeleteConfirmModal({
  pin,
  onClose,
  onConfirm,
  isDeleting,
}: {
  pin: UserPin;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-red-100 p-3">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">ยืนยันการลบ</h2>
            <p className="text-sm text-slate-600">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
          </div>
        </div>
        <div className="mb-6 rounded-lg bg-slate-50 p-4">
          <p className="text-sm text-slate-700">
            คุณต้องการลบ PIN ของ{' '}
            <span className="font-semibold">{pin.employee_name}</span>{' '}
            ({pin.employee_id}) หรือไม่?
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
            disabled={isDeleting}
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            disabled={isDeleting}
          >
            {isDeleting ? 'กำลังลบ...' : 'ลบ'}
          </button>
        </div>
      </div>
    </div>
  );
}
