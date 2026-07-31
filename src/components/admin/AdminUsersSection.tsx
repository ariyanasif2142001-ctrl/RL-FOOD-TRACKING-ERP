import React, { useState, useRef } from 'react';
import { User } from '../../types';
import { Users, UserPlus, Image as ImageIcon, Trash2, X, Plus, Check } from 'lucide-react';

interface AdminUsersSectionProps {
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  currentUser: User | null;
  setUserToDelete: (user: User | null) => void;
}

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  users,
  onUpdateUsers,
  currentUser,
  setUserToDelete
}) => {
  // Add User State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<User['role']>('purchaser');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserAvatar, setNewUserAvatar] = useState('');

  // Editing User Photo Modal State
  const [editingUserForAvatar, setEditingUserForAvatar] = useState<User | null>(null);
  const [editAvatarUrlInput, setEditAvatarUrlInput] = useState('');

  const newUserAvatarFileRef = useRef<HTMLInputElement>(null);
  const editUserAvatarFileRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setAvatarState: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarState(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      username: newUserUsername.trim() || newUserEmail.split('@')[0],
      password: newUserPassword || '123',
      role: newUserRole,
      phone: newUserPhone.trim(),
      avatar: newUserAvatar.trim() || undefined,
      active: true,
      status: 'Active',
      createdDate: new Date().toISOString().split('T')[0],
      lastLogin: 'Never'
    };

    onUpdateUsers([...users, newUser]);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserUsername('');
    setNewUserPhone('');
    setNewUserAvatar('');
    setIsAddUserOpen(false);
  };

  const handleSaveEditedUserAvatar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserForAvatar) return;
    const updated = users.map(u => u.id === editingUserForAvatar.id ? { ...u, avatar: editAvatarUrlInput.trim() || undefined } : u);
    onUpdateUsers(updated);
    setEditingUserForAvatar(null);
    setEditAvatarUrlInput('');
  };

  const handleToggleUser = (userId: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, active: !u.active, status: !u.active ? ('Active' as const) : ('Inactive' as const) } : u);
    onUpdateUsers(updated);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              <span>System Users & Staff Permissions</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage user credentials, profile photos, phone contacts, and active status.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddUserOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        </div>

        {/* Users Roster Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">User Profile</th>
                <th className="p-3">Role</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative group shrink-0">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-xs" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-extrabold flex items-center justify-center text-xs">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUserForAvatar(u);
                            setEditAvatarUrlInput(u.avatar || '');
                          }}
                          className="absolute -bottom-1 -right-1 p-1 bg-slate-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                          title="Change Profile Photo"
                        >
                          <ImageIcon className="w-3 h-3" />
                        </button>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{u.name}</p>
                        <p className="text-[11px] text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                      u.role === 'purchaser' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                      u.role === 'warehouse' ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                      'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">
                    <p className="font-mono">{u.phone || 'No phone'}</p>
                    <p className="text-[11px] text-slate-400">@{u.username || u.email.split('@')[0]}</p>
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => handleToggleUser(u.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        u.active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      }`}
                    >
                      {u.active ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setUserToDelete(u)}
                      disabled={currentUser?.id === u.id}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30 cursor-pointer"
                      title={currentUser?.id === u.id ? "Cannot delete your own active account" : "Delete User"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">Add New Staff / System User</h3>
              </div>
              <button type="button" onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full p-2 border border-slate-300 rounded-lg mt-1 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    placeholder="sarah@radiant.com"
                    className="w-full p-2 border border-slate-300 rounded-lg mt-1 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">System Role *</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as User['role'])}
                    className="w-full p-2 border border-slate-300 rounded-lg mt-1 bg-white outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="purchaser">Purchaser</option>
                    <option value="warehouse">Warehouse Manager</option>
                    <option value="dispatch">Dispatch / Delivery</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Phone Number</label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={e => setNewUserPhone(e.target.value)}
                    placeholder="+1 555-0192"
                    className="w-full p-2 border border-slate-300 rounded-lg mt-1 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Login Password</label>
                  <input
                    type="text"
                    value={newUserPassword}
                    onChange={e => setNewUserPassword(e.target.value)}
                    placeholder="Default: 123"
                    className="w-full p-2 border border-slate-300 rounded-lg mt-1 outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Profile Photo Input & Upload */}
              <div>
                <label className="font-bold text-slate-700">Profile Photo (URL or File Upload)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={newUserAvatar}
                    onChange={e => setNewUserAvatar(e.target.value)}
                    placeholder="https://... image URL or upload file"
                    className="flex-1 p-2 border border-slate-300 rounded-lg outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => newUserAvatarFileRef.current?.click()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-300 flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Upload</span>
                  </button>
                  <input
                    ref={newUserAvatarFileRef}
                    type="file"
                    accept="image/*"
                    onChange={e => handleAvatarFileUpload(e, setNewUserAvatar)}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER PHOTO MODAL */}
      {editingUserForAvatar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Update Photo for {editingUserForAvatar.name}</h3>
              <button type="button" onClick={() => setEditingUserForAvatar(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedUserAvatar} className="space-y-3 text-xs">
              <div className="flex justify-center my-2">
                {editAvatarUrlInput ? (
                  <img src={editAvatarUrlInput} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-amber-500 shadow-md" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                    No Photo
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700">Image URL or Upload Device File</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={editAvatarUrlInput}
                    onChange={e => setEditAvatarUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 p-2 border border-slate-300 rounded-lg outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => editUserAvatarFileRef.current?.click()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-300 flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Upload</span>
                  </button>
                  <input
                    ref={editUserAvatarFileRef}
                    type="file"
                    accept="image/*"
                    onChange={e => handleAvatarFileUpload(e, setEditAvatarUrlInput)}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUserForAvatar(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Photo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
