'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Loader2, Link as LinkIcon, Copy, CheckCircle } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  slug: string;
  settings: {
    show_all_submissions?: boolean;
    enable_notifications?: boolean;
    accent_color?: string;
  };
}

export default function SettingsPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);
  const [enableNotifications, setEnableNotifications] = useState(false);
  const [accentColor, setAccentColor] = useState('gold');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadEvent();
  }, []);

  const loadEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;

      setEvent(data);
      setTitle(data.title);
      setSlug(data.slug);
      setShowAllSubmissions(data.settings?.show_all_submissions || false);
      setEnableNotifications(data.settings?.enable_notifications || false);
      setAccentColor(data.settings?.accent_color || 'gold');
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('events')
        .update({
          title,
          slug,
          settings: {
            show_all_submissions: showAllSubmissions,
            enable_notifications: enableNotifications,
            accent_color: accentColor
          }
        })
        .eq('id', event!.id);

      if (error) throw error;

      alert('Settings saved successfully!');
      loadEvent();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const copyEventLink = () => {
    const link = `${window.location.origin}/event/${slug}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Settings</h1>
        <p className="text-gray-600">Configure your guestbook event and preferences</p>
      </div>

      <div className="max-w-3xl">
        {/* Event Link */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6 border border-purple-100">
          <div className="flex items-start gap-3 mb-3">
            <LinkIcon className="w-5 h-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Public Event Link</h3>
              <p className="text-sm text-gray-600 mb-3">
                Share this link with your guests to let them leave messages
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/event/${slug}`}
                  readOnly
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono"
                />
                <button
                  onClick={copyEventLink}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          {/* Event Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sarah & John Wedding"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Event Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Slug (URL)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="sarah-john-2025"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none font-mono"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Only lowercase letters, numbers, and hyphens allowed
            </p>
          </div>

          {/* Accent Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Accent Color
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setAccentColor('gold')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  accentColor === 'gold'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg mx-auto mb-2"></div>
                <p className="text-sm font-medium text-gray-900">Gold</p>
              </button>
              <button
                type="button"
                onClick={() => setAccentColor('coral')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  accentColor === 'coral'
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="w-12 h-12 bg-gradient-to-r from-coral-400 to-pink-500 rounded-lg mx-auto mb-2"></div>
                <p className="text-sm font-medium text-gray-900">Coral</p>
              </button>
            </div>
          </div>

          {/* Display Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Display Settings</h3>
            
            <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={showAllSubmissions}
                onChange={(e) => setShowAllSubmissions(e.target.checked)}
                className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <div>
                <p className="font-medium text-gray-900">Show All Submissions</p>
                <p className="text-sm text-gray-600">
                  Display all submissions on the public page, including unapproved ones
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={enableNotifications}
                onChange={(e) => setEnableNotifications(e.target.checked)}
                className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-600">
                  Receive email notifications when new submissions are received
                </p>
              </div>
            </label>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

