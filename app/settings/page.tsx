'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronRight, User, Shield, Key, Bell, Save, X, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { useToast } from '@/components/Toast';

type EditState = {
  field: string;
  value: string;
} | null;

export default function SettingsPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'account' | 'profile' | 'privacy' | 'notifications'>('account');
  const [editing, setEditing] = useState<EditState>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Editable state for each setting
  const [email, setEmail] = useState(session?.user?.email || 'alex@audiothread.com');
  const [displayName, setDisplayName] = useState(session?.user?.name || 'Alex Dev');
  const [bio, setBio] = useState('Moondrop Blessing 3 • iFi Gryphon');
  const [country, setCountry] = useState('United States');
  const [dmPermission, setDmPermission] = useState<'everyone' | 'followers' | 'nobody'>('everyone');
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [postReplies, setPostReplies] = useState(true);

  const username = session?.user?.name || 'alex_dev';

  const startEdit = (field: string, currentValue: string) => {
    setEditing({ field, value: currentValue });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    setIsSaving(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 500));

    switch (editing.field) {
      case 'email':    setEmail(editing.value);       break;
      case 'displayName': setDisplayName(editing.value); break;
      case 'bio':      setBio(editing.value);          break;
      case 'country':  setCountry(editing.value);      break;
      case 'password':
        showToast('Password changed successfully!', 'success');
        setEditing(null);
        setIsSaving(false);
        return;
    }
    showToast('Setting saved!', 'success');
    setEditing(null);
    setIsSaving(false);
  };

  const handleToggle = (field: string, current: boolean, setter: (v: boolean) => void) => {
    setter(!current);
    showToast(`${field} ${!current ? 'enabled' : 'disabled'}`, 'success');
  };

  // A reusable row that opens an inline editor
  const SettingRow = ({
    field, label, subtitle, value, type = 'text', options,
  }: {
    field: string;
    label: string;
    subtitle: string;
    value: string;
    type?: 'text' | 'email' | 'password' | 'select';
    options?: { label: string; value: string }[];
  }) => {
    const isEditing = editing?.field === field;

    return (
      <div className="border-b border-gray-100 last:border-0">
        {/* Row Header */}
        <div
          onClick={() => !isEditing && startEdit(field, value)}
          className={`flex items-center justify-between p-4 transition-colors ${
            isEditing ? 'bg-[#f8faf9]' : 'bg-white hover:bg-[#f8faf9] cursor-pointer'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-[#111827] block">{label}</span>
            <span className="text-[11px] text-gray-400 font-normal">{subtitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 max-w-[140px] truncate">
              {type === 'password' ? '••••••••' : value}
            </span>
            {isEditing ? (
              <X className="w-4 h-4 text-gray-400" onClick={(e) => { e.stopPropagation(); cancelEdit(); }} />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Inline Editor */}
        {isEditing && (
          <div className="px-4 pb-4 bg-[#f8faf9] space-y-3 border-t border-[#eaefec]">
            <p className="text-[11px] text-gray-400 pt-3 font-medium">Editing: {label}</p>
            {type === 'select' && options ? (
              <select
                value={editing.value}
                onChange={(e) => setEditing({ field, value: e.target.value })}
                className="w-full bg-white text-sm text-[#111827] rounded-xl px-4 py-2.5 border border-[#eaefec] focus:outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all font-sans"
              >
                {options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : type === 'password' ? (
              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="New password"
                  value={editing.value}
                  onChange={(e) => setEditing({ field, value: e.target.value })}
                  className="w-full bg-white text-sm text-[#111827] placeholder-gray-400 rounded-xl px-4 py-2.5 border border-[#eaefec] focus:outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all font-sans"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full bg-white text-sm text-[#111827] placeholder-gray-400 rounded-xl px-4 py-2.5 border border-[#eaefec] focus:outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all font-sans"
                />
              </div>
            ) : (
              <input
                type={type}
                value={editing.value}
                onChange={(e) => setEditing({ field, value: e.target.value })}
                autoFocus
                className="w-full bg-white text-sm text-[#111827] rounded-xl px-4 py-2.5 border border-[#eaefec] focus:outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all font-sans"
              />
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={saveEdit}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-4 py-2 rounded-full transition-all duration-200 disabled:opacity-50 active:scale-95"
              >
                {isSaving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 bg-[#f3f5f4] hover:bg-[#e8ebea] text-[#111827] font-bold text-xs px-4 py-2 rounded-full transition-all duration-200 active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Toggle row
  const ToggleRow = ({
    label, subtitle, value, onToggle,
  }: {
    label: string;
    subtitle: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <div className="flex items-center justify-between p-4 bg-white hover:bg-[#f8faf9] cursor-pointer transition-colors border-b border-gray-100 last:border-0">
      <div>
        <span className="text-xs font-bold text-[#111827] block">{label}</span>
        <span className="text-[11px] text-gray-400 font-normal">{subtitle}</span>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
          value ? 'bg-[#10b981]' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const TABS = [
    { id: 'account',       label: 'Account',        Icon: User },
    { id: 'profile',       label: 'Profile',         Icon: Key },
    { id: 'privacy',       label: 'Privacy & Safety', Icon: Shield },
    { id: 'notifications', label: 'Notifications',   Icon: Bell },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-[#111827]">User Settings</h1>
        <p className="text-xs text-gray-500 font-normal">
          Manage your account preferences, profile details, and privacy controls.
        </p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white border border-[#eaefec] rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[480px]">

        {/* Left Sidebar Navigation */}
        <div className="w-full md:w-56 border-r border-[#eaefec] bg-[#f8faf9] p-3 space-y-1 flex-shrink-0">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setEditing(null); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 ease-in-out ${
                activeTab === id
                  ? 'bg-white text-[#10b981] shadow-xs border border-gray-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-[#111827]'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Right Pane */}
        <div className="flex-1 p-6 space-y-6 overflow-auto">

          {/* ── ACCOUNT ── */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account Settings</h2>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <SettingRow
                  field="email"
                  label="Email Address"
                  subtitle="Primary contact for notifications"
                  value={email}
                  type="email"
                />
                <SettingRow
                  field="password"
                  label="Change Password"
                  subtitle="Update security credentials"
                  value=""
                  type="password"
                />
                <SettingRow
                  field="country"
                  label="Country / Region"
                  subtitle="Regional audiophile gear marketplace"
                  value={country}
                  type="select"
                  options={[
                    { label: 'United States', value: 'United States' },
                    { label: 'United Kingdom', value: 'United Kingdom' },
                    { label: 'Canada',         value: 'Canada' },
                    { label: 'Australia',      value: 'Australia' },
                    { label: 'Japan',          value: 'Japan' },
                    { label: 'India',          value: 'India' },
                    { label: 'Germany',        value: 'Germany' },
                    { label: 'Singapore',      value: 'Singapore' },
                  ]}
                />
              </div>

              {/* Danger Zone */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider">Danger Zone</h3>
                <div className="border border-red-100 rounded-xl overflow-hidden">
                  <div
                    onClick={() => showToast('Account deactivation requires email confirmation. Check your inbox.', 'info')}
                    className="flex items-center justify-between p-4 bg-white hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-red-600 block">Deactivate Account</span>
                      <span className="text-[11px] text-gray-400">Your account will be hidden from public view</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Profile Details</h2>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <SettingRow
                  field="username"
                  label="Username"
                  subtitle="Your public handle (cannot be changed)"
                  value={`u/${username}`}
                  type="text"
                />
                <SettingRow
                  field="displayName"
                  label="Display Name"
                  subtitle="Shown on profile cards and posts"
                  value={displayName}
                  type="text"
                />
                <SettingRow
                  field="bio"
                  label="Gear Signature / Bio"
                  subtitle="Listed under your posts"
                  value={bio}
                  type="text"
                />
              </div>
            </div>
          )}

          {/* ── PRIVACY ── */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Privacy & Safety</h2>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <SettingRow
                  field="dmPermission"
                  label="Who can send Direct Messages"
                  subtitle="Control private message permissions"
                  value={dmPermission === 'everyone' ? 'Everyone' : dmPermission === 'followers' ? 'Followers only' : 'Nobody'}
                  type="select"
                  options={[
                    { label: 'Everyone',       value: 'everyone' },
                    { label: 'Followers only', value: 'followers' },
                    { label: 'Nobody',         value: 'nobody' },
                  ]}
                />
                <ToggleRow
                  label="Show Online Status"
                  subtitle="Display green indicator when active"
                  value={showOnlineStatus}
                  onToggle={() => handleToggle('Online status', showOnlineStatus, setShowOnlineStatus)}
                />
                <ToggleRow
                  label="Allow Indexing by Search Engines"
                  subtitle="Let search engines find your public profile"
                  value={true}
                  onToggle={() => showToast('Search engine indexing preference saved', 'success')}
                />
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Notification Preferences</h2>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <ToggleRow
                  label="Email Notifications"
                  subtitle="Get email alerts for replies and mentions"
                  value={emailNotifications}
                  onToggle={() => handleToggle('Email notifications', emailNotifications, setEmailNotifications)}
                />
                <ToggleRow
                  label="Post Replies"
                  subtitle="Notify when someone replies to your post"
                  value={postReplies}
                  onToggle={() => handleToggle('Post reply notifications', postReplies, setPostReplies)}
                />
                <ToggleRow
                  label="New Upvotes"
                  subtitle="Notify on significant upvote milestones"
                  value={true}
                  onToggle={() => showToast('Upvote notification preference saved', 'success')}
                />
                <ToggleRow
                  label="Direct Messages"
                  subtitle="Notify when you receive a new DM"
                  value={true}
                  onToggle={() => showToast('DM notification preference saved', 'success')}
                />
                <ToggleRow
                  label="Community Announcements"
                  subtitle="Get updates from subreddits you've joined"
                  value={false}
                  onToggle={() => showToast('Community announcement notifications enabled', 'success')}
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
