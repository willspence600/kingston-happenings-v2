'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Edit2, Shield, Trash2, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components';

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
        // Refresh the page to get updated user data
        window.location.reload();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Success - logout and redirect
        await logout();
        // Force a hard redirect to clear all state
        window.location.href = '/';
      } else {
        // Show error message with details
        const errorMsg = data.details 
          ? `${data.error || 'Failed to delete account'}. ${data.details}`
          : data.error || 'Failed to delete account';
        setMessage({ type: 'error', text: errorMsg });
        setDeleting(false);
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.error('Delete account error:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again or contact support.' });
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getRoleBadge = () => {
    switch (user.role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
            <Shield size={14} />
            Administrator
          </span>
        );
      case 'organizer':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
            <User size={14} />
            Event Organizer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
            <User size={14} />
            Event-Goer
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-br from-muted to-background py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={32} className="text-primary" />
            </div>
            <div>
              <h1 className="font-display text-4xl sm:text-5xl text-foreground">
                My Account
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your profile and account settings
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Profile Section */}
        <section className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl text-foreground">Profile Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <Edit2 size={14} />
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email changes are not supported. Contact support if needed.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setName(user.name);
                    setEmail(user.email);
                  }}
                  className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="text-foreground font-medium">{user.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-foreground font-medium">{user.email}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Account Status Section */}
        <section className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="font-display text-xl text-foreground mb-4">Account Status</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Role</p>
              {getRoleBadge()}
            </div>
            
            {user.role === 'user' && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-foreground font-medium mb-1">Want to become an organizer?</p>
                <p className="text-sm text-muted-foreground">
                  Organizers can submit events and manage their listings. Contact us to upgrade your account.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-card border border-red-200 rounded-xl p-6">
          <h2 className="font-display text-xl text-red-600 mb-4">Danger Zone</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              <Trash2 size={16} />
              Delete Account
            </button>
          </div>
        </section>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
        type="warning"
        confirmText={deleting ? 'Deleting...' : 'Delete Account'}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}

