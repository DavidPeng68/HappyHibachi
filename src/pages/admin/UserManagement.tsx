import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminUser, AdminRole, FieldVisibility } from '../../types/admin';
import { ConfirmDialog } from '../../components/admin';
import * as adminApi from '../../services/adminApi';
import { useAdmin } from './AdminLayout';

type SafeUser = Omit<AdminUser, 'passwordHash'>;

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const { token, showToast } = useAdmin();

  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createData, setCreateData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    role: 'order_manager' as AdminRole,
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; user: SafeUser | null }>({
    open: false,
    user: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch users
  const fetchAllUsers = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.fetchUsers(token);
    if (res.success) {
      setUsers(res.users);
    } else {
      showToast(t('admin.toast.fetchFailed'), 'error');
    }
    setLoading(false);
  }, [token, showToast, t]);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Pending users
  const pendingUsers = users.filter((u) => u.status === 'pending');
  const approvedUsers = users.filter((u) => u.status !== 'pending');

  // Create user
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!createData.username.trim() || !createData.password || !createData.displayName.trim()) {
      setCreateError(t('admin.users.missingFields'));
      return;
    }
    if (createData.password !== createData.confirmPassword) {
      setCreateError(t('admin.users.passwordMismatch'));
      return;
    }
    if (createData.password.length < 6) {
      setCreateError(t('admin.login.passwordTooShort'));
      return;
    }

    setCreateLoading(true);
    const res = await adminApi.createUser(token, {
      username: createData.username.trim(),
      password: createData.password,
      displayName: createData.displayName.trim(),
      role: createData.role,
    });
    setCreateLoading(false);

    if (res.success) {
      showToast(t('admin.toast.userCreated'), 'success');
      setShowCreateForm(false);
      setCreateData({
        username: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        role: 'order_manager',
      });
      fetchAllUsers();
    } else {
      setCreateError(res.error || t('admin.toast.createFailed'));
    }
  };

  // Approve / Reject
  const handleApprove = async (userId: string) => {
    const res = await adminApi.updateUser(token, { id: userId, status: 'approved' });
    if (res.success) {
      showToast(t('admin.toast.userApproved'), 'success');
      fetchAllUsers();
    } else {
      showToast(t('admin.toast.updateFailed'), 'error');
    }
  };

  const handleReject = async (userId: string) => {
    const res = await adminApi.updateUser(token, { id: userId, status: 'rejected' });
    if (res.success) {
      showToast(t('admin.toast.userRejected'), 'success');
      fetchAllUsers();
    } else {
      showToast(t('admin.toast.updateFailed'), 'error');
    }
  };

  // Toggle enabled
  const handleToggleEnabled = async (user: SafeUser) => {
    const res = await adminApi.updateUser(token, { id: user.id, enabled: !user.enabled });
    if (res.success) {
      showToast(
        user.enabled ? t('admin.toast.userDisabled') : t('admin.toast.userEnabled'),
        'success'
      );
      fetchAllUsers();
    } else {
      showToast(t('admin.toast.updateFailed'), 'error');
    }
  };

  // Edit user
  const startEdit = (user: SafeUser) => {
    setEditingUser(user);
    setEditDisplayName(user.displayName);
    setEditPassword('');
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setEditLoading(true);
    const data: Parameters<typeof adminApi.updateUser>[1] = { id: editingUser.id };
    if (editDisplayName.trim() && editDisplayName !== editingUser.displayName) {
      data.displayName = editDisplayName.trim();
    }
    if (editPassword) {
      data.password = editPassword;
    }
    const res = await adminApi.updateUser(token, data);
    setEditLoading(false);
    if (res.success) {
      showToast(t('admin.toast.userUpdated'), 'success');
      setEditingUser(null);
      fetchAllUsers();
    } else {
      showToast(res.error || t('admin.toast.updateFailed'), 'error');
    }
  };

  // Change visibility
  const handleVisibilityChange = async (userId: string, visibility: string) => {
    const res = await adminApi.updateUser(token, {
      id: userId,
      visibility: visibility as FieldVisibility,
    });
    if (res.success) {
      showToast(t('admin.toast.visibilityUpdated'), 'success');
      fetchAllUsers();
    } else {
      showToast(t('admin.toast.updateFailed'), 'error');
    }
  };

  // Delete user
  const handleDelete = async () => {
    if (!deleteConfirm.user) return;
    setDeleteLoading(true);
    const res = await adminApi.deleteUser(token, deleteConfirm.user.id);
    setDeleteLoading(false);
    if (res.success) {
      showToast(t('admin.toast.userDeleted'), 'success');
      setDeleteConfirm({ open: false, user: null });
      fetchAllUsers();
    } else {
      showToast(res.error || t('admin.toast.deleteFailed'), 'error');
    }
  };

  if (loading) {
    return <div className="loading-screen">{t('admin.dashboard.loading')}</div>;
  }

  return (
    <div className="admin-page">
      {/* Pending Approval Section */}
      {pendingUsers.length > 0 && (
        <div className="admin-card admin-card--warning-left mb-12">
          <h3 className="bm-card-title">
            {t('admin.users.pendingApproval')} ({pendingUsers.length})
          </h3>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.users.displayName')}</th>
                  <th>{t('admin.users.username')}</th>
                  <th>{t('admin.users.registeredAt')}</th>
                  <th>{t('admin.booking.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.displayName}</td>
                    <td>{user.username}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex-row gap-4">
                        <button
                          className="admin-btn admin-btn-primary"
                          onClick={() => handleApprove(user.id)}
                          type="button"
                        >
                          {t('admin.users.approve')}
                        </button>
                        <button
                          className="admin-btn bm-delete-btn"
                          onClick={() => handleReject(user.id)}
                          type="button"
                        >
                          {t('admin.users.reject')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Header + Add Button */}
      <div className="flex-between mb-8">
        <h2>{t('admin.users.title')}</h2>
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => setShowCreateForm(true)}
          type="button"
        >
          {t('admin.users.addUser')}
        </button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="admin-card mb-12">
          <h3 className="bm-card-title">{t('admin.users.addUser')}</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group mb-4">
              <label>{t('admin.users.displayName')}</label>
              <input
                type="text"
                className="admin-input"
                value={createData.displayName}
                onChange={(e) => setCreateData((d) => ({ ...d, displayName: e.target.value }))}
                placeholder={t('admin.users.displayNamePlaceholder')}
              />
            </div>
            <div className="form-group mb-4">
              <label>{t('admin.users.username')}</label>
              <input
                type="text"
                className="admin-input"
                value={createData.username}
                onChange={(e) => setCreateData((d) => ({ ...d, username: e.target.value }))}
                placeholder={t('admin.users.usernamePlaceholder')}
              />
            </div>
            <div className="form-group mb-4">
              <label>{t('admin.users.password')}</label>
              <input
                type="password"
                className="admin-input"
                value={createData.password}
                onChange={(e) => setCreateData((d) => ({ ...d, password: e.target.value }))}
                placeholder={t('admin.users.passwordPlaceholder')}
              />
            </div>
            <div className="form-group mb-4">
              <label>{t('admin.users.confirmPassword')}</label>
              <input
                type="password"
                className="admin-input"
                value={createData.confirmPassword}
                onChange={(e) => setCreateData((d) => ({ ...d, confirmPassword: e.target.value }))}
                placeholder={t('admin.users.confirmPasswordPlaceholder')}
              />
            </div>
            <div className="form-group mb-4">
              <label>{t('admin.users.role')}</label>
              <select
                className="admin-select"
                value={createData.role}
                onChange={(e) =>
                  setCreateData((d) => ({ ...d, role: e.target.value as AdminRole }))
                }
              >
                <option value="order_manager">{t('admin.roles.orderManager')}</option>
                <option value="super_admin">{t('admin.roles.superAdmin')}</option>
              </select>
            </div>
            {createError && <div className="form-error mb-4">{createError}</div>}
            <div className="flex-row gap-4">
              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                disabled={createLoading}
              >
                {createLoading ? t('admin.users.creating') : t('admin.users.create')}
              </button>
              <button
                type="button"
                className="admin-btn"
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateError('');
                }}
              >
                {t('admin.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      {approvedUsers.length === 0 ? (
        <div className="admin-card admin-card--empty">
          <p className="text-muted">{t('admin.users.noUsers')}</p>
        </div>
      ) : (
        <div className="admin-card">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.users.displayName')}</th>
                  <th>{t('admin.users.username')}</th>
                  <th>{t('admin.users.role')}</th>
                  <th>{t('admin.users.status')}</th>
                  <th>{t('admin.users.enabled')}</th>
                  <th>{t('admin.users.visibility')}</th>
                  <th>{t('admin.users.createdAt')}</th>
                  <th>{t('admin.booking.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {approvedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {editingUser?.id === user.id ? (
                        <input
                          type="text"
                          className="admin-input admin-input--sm"
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                        />
                      ) : (
                        user.displayName
                      )}
                    </td>
                    <td>{user.username}</td>
                    <td>
                      <span
                        className={`role-badge ${user.role === 'super_admin' ? 'role-badge--admin' : 'role-badge--manager'}`}
                      >
                        {user.role === 'super_admin'
                          ? t('admin.roles.superAdmin')
                          : t('admin.roles.orderManager')}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${user.status === 'approved' ? 'status-pill--approved' : 'status-pill--rejected'}`}
                      >
                        {user.status === 'approved'
                          ? t('admin.users.statusApproved')
                          : t('admin.users.statusRejected')}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`admin-btn admin-btn--sm ${user.enabled ? 'admin-btn-primary' : ''}`}
                        onClick={() => handleToggleEnabled(user)}
                        type="button"
                      >
                        {user.enabled ? t('admin.users.enabled') : t('admin.users.disabled')}
                      </button>
                    </td>
                    <td>
                      {user.role === 'order_manager' ? (
                        <select
                          className="admin-select admin-select--sm"
                          value={user.visibility || 'standard'}
                          onChange={(e) => handleVisibilityChange(user.id, e.target.value)}
                        >
                          <option value="full">{t('admin.users.visibilityFull')}</option>
                          <option value="standard">{t('admin.users.visibilityStandard')}</option>
                          <option value="minimal">{t('admin.users.visibilityMinimal')}</option>
                        </select>
                      ) : (
                        <span className="text-xs text-muted">
                          {t('admin.users.visibilityFull')}
                        </span>
                      )}
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex-row gap-2">
                        {editingUser?.id === user.id ? (
                          <>
                            <input
                              type="password"
                              className="admin-input admin-input--pw"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder={t('admin.users.newPassword')}
                            />
                            <button
                              className="admin-btn admin-btn-primary admin-btn--sm"
                              onClick={handleSaveEdit}
                              disabled={editLoading}
                              type="button"
                            >
                              {t('admin.booking.save')}
                            </button>
                            <button
                              className="admin-btn admin-btn--sm"
                              onClick={() => setEditingUser(null)}
                              type="button"
                            >
                              {t('admin.cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="admin-btn admin-btn--sm"
                              onClick={() => startEdit(user)}
                              type="button"
                            >
                              {t('admin.users.edit')}
                            </button>
                            <button
                              className="admin-btn bm-delete-btn admin-btn--sm"
                              onClick={() => setDeleteConfirm({ open: true, user })}
                              type="button"
                            >
                              {t('admin.users.delete')}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title={t('admin.users.deleteUser')}
        message={t('admin.users.deleteConfirm', { name: deleteConfirm.user?.displayName || '' })}
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, user: null })}
      />
    </div>
  );
};

export default UserManagement;
