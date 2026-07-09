'use client';

import { useEffect, useState, useCallback } from 'react';
import { setLocaleCookie } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import {
  Sun,
  Moon,
  Globe,
  DollarSign,
  PiggyBank,
  Trash2,
  AlertTriangle,
  Check,
  Loader2,
  Wifi,
  WifiOff,
  User,
  Lock,
  Eye,
  EyeOff,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';

interface AppSettings {
  darkMode: boolean;
  language: string;
  displayCurrency: string;
  startingBalance: number;
  priceFeedMode: 'simulated' | 'live';
  orderConfirmation: boolean;
}

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hu', label: 'Magyar' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'zh', label: '中文' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
];

const BALANCE_PRESETS = [1000, 5000, 10000, 25000, 50000, 100000];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { restartTour } = useOnboarding();
  const [mounted, setMounted] = useState(false);

  const [settings, setSettings] = useState<AppSettings>({
    darkMode: true,
    language: 'en',
    displayCurrency: 'USD',
    startingBalance: 10000,
    priceFeedMode: 'simulated',
    orderConfirmation: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [customBalance, setCustomBalance] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Sync darkMode from next-themes to settings
  useEffect(() => {
    if (mounted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings(prev => ({ ...prev, darkMode: theme === 'dark' }));
    }
  }, [theme, mounted]);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, profileRes] = await Promise.all([
        fetch('/api/settings', { cache: 'no-store' }),
        fetch('/api/settings/profile', { cache: 'no-store' }),
      ]);
      const settingsData = await settingsRes.json();
      const profileData = await profileRes.json();
      if (settingsData.settings) {
        setSettings(settingsData.settings);
      }
      if (profileData.profile) {
        setProfile(profileData.profile);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, [fetchSettings]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    if (!profile.name.trim()) {
      setProfileError('Name cannot be empty');
      return;
    }
    setProfileSaving(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name }),
      });
      const data = await res.json();
      if (data.success) {
        setProfileSuccess('Name updated');
        setTimeout(() => setProfileSuccess(null), 3000);
      } else {
        setProfileError(data.error || 'Failed to update name');
      }
    } catch {
      setProfileError('Network error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordSuccess('Password updated');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(null), 3000);
      } else {
        setPasswordError(data.error || 'Failed to update password');
      }
    } catch {
      setPasswordError('Network error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleUpdate = async (key: keyof AppSettings, value: unknown) => {
    setSaving(key);
    setSettings(prev => ({ ...prev, [key]: value as never }));
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      // Revert on failure
      fetchSettings();
    } finally {
      setSaving(null);
    }
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    handleUpdate('darkMode', newTheme === 'dark');
  };

  const handleBalanceSelect = async (balance: number) => {
    setCustomBalance('');
    await handleUpdate('startingBalance', balance);
  };

  const handleCustomBalance = async () => {
    const parsed = parseFloat(customBalance);
    if (isNaN(parsed) || parsed <= 0) return;
    await handleUpdate('startingBalance', parsed);
    setCustomBalance('');
  };

  const handleResetSimulation = async () => {
    setResetting(true);
    setResetError(null);
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startingBalance: settings.startingBalance,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowResetDialog(false);
        fetchSettings();
      } else {
        setResetError(data.error || 'Reset failed');
      }
    } catch {
      setResetError('Network error — please try again');
    } finally {
      setResetting(false);
    }
  };

  const handleSaveCustomBalance = (e: React.FormEvent) => {
    e.preventDefault();
    handleCustomBalance();
  };

  return (
    <div className='flex h-full flex-col overflow-y-auto p-4 pb-8 md:p-6'>
      <div className='mx-auto flex w-full max-w-3xl flex-1 flex-col space-y-4 md:space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <h1 className='font-display text-lg font-semibold tracking-tight text-foreground md:text-xl'>
            Settings
          </h1>
        </div>

        {loading ? (
          <div className='flex items-center justify-center py-16'>
            <p className='text-sm text-muted-foreground'>
              Loading settings...
            </p>
          </div>
        ) : (
          <div aria-busy='false'>
            {/* Account - Profile */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-sm font-semibold'>
                  <User className='h-4 w-4 text-accent' />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='rounded-lg border border-border/50 p-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <User className='h-5 w-5 text-muted-foreground' />
                      <div>
                        <p className='text-sm font-medium text-foreground'>Email</p>
                        <p className='text-xs text-muted-foreground'>{profile.email || 'Loading...'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdateName}>
                  <div className='rounded-lg border border-border/50 p-3'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <User className='h-5 w-5 text-accent' />
                        <div>
                          <p className='text-sm font-medium text-foreground'>
                            Display Name
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            How your name appears in the app
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className='mt-3 flex items-center gap-2'>
                      <input
                        type='text'
                        value={profile.name}
                        onChange={e =>
                          setProfile(p => ({ ...p, name: e.target.value }))
                        }
                        placeholder='Your name'
                        maxLength={50}
                        className='flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      />
                      <button
                        type='submit'
                        disabled={profileSaving || !profile.name.trim()}
                        className='flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      >
                        {profileSaving ? (
                          <Loader2 className='h-3 w-3 animate-spin' />
                        ) : (
                          <Check className='h-3 w-3' />
                        )}
                        Save
                      </button>
                    </div>
                    {profileError && (
                      <p className='mt-1.5 text-[11px] text-negative'>{profileError}</p>
                    )}
                    {profileSuccess && (
                      <p className='mt-1.5 text-[11px] text-positive'>{profileSuccess}</p>
                    )}
                  </div>
                </form>

                {/* Change Password */}
                <form onSubmit={handleUpdatePassword}>
                  <div className='rounded-lg border border-border/50 p-3'>
                    <div className='mb-3 flex items-center gap-3'>
                      <Lock className='h-5 w-5 text-amber-500' />
                      <div>
                        <p className='text-sm font-medium text-foreground'>
                          Change Password
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          Must be at least 6 characters
                        </p>
                      </div>
                    </div>
                    <div className='space-y-2.5'>
                      <div className='relative'>
                        <input
                          type={showCurrent ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          placeholder='Current password'
                          className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 pr-8 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                        />
                        <button
                          type='button'
                          onClick={() => setShowCurrent(!showCurrent)}
                          className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                        >
                          {showCurrent ? (
                            <EyeOff className='h-3.5 w-3.5' />
                          ) : (
                            <Eye className='h-3.5 w-3.5' />
                          )}
                        </button>
                      </div>
                      <div className='relative'>
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder='New password'
                          className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 pr-8 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                        />
                        <button
                          type='button'
                          onClick={() => setShowNew(!showNew)}
                          className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                        >
                          {showNew ? (
                            <EyeOff className='h-3.5 w-3.5' />
                          ) : (
                            <Eye className='h-3.5 w-3.5' />
                          )}
                        </button>
                      </div>
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder='Confirm new password'
                        className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      />
                    </div>
                    <div className='mt-3 flex items-center justify-between'>
                      <div>
                        {passwordError && (
                          <p className='text-[11px] text-negative'>{passwordError}</p>
                        )}
                        {passwordSuccess && (
                          <p className='text-[11px] text-positive'>{passwordSuccess}</p>
                        )}
                      </div>
                      <button
                        type='submit'
                        disabled={
                          passwordSaving ||
                          !currentPassword ||
                          !newPassword ||
                          !confirmPassword
                        }
                        className='flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      >
                        {passwordSaving ? (
                          <Loader2 className='h-3 w-3 animate-spin' />
                        ) : (
                          <Lock className='h-3 w-3' />
                        )}
                        Update Password
                      </button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-sm font-semibold'>
                  <Sun className='h-4 w-4 text-amber-500' />
                  Appearance + Confirmation
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                {/* Dark Mode */}
                <div className='flex items-center justify-between rounded-lg border border-border/50 p-3'>
                  <div className='flex items-center gap-3'>
                    {mounted && theme === 'dark' ? (
                      <Moon className='h-5 w-5 text-blue-400' />
                    ) : (
                      <Sun className='h-5 w-5 text-amber-500' />
                    )}
                    <div>
                      <p className='text-sm font-medium text-foreground'>
                        Dark Mode
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {mounted && theme === 'dark'
                          ? 'Dark theme is active'
                          : 'Switch to dark theme'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleThemeToggle}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                      theme === 'dark'
                        ? 'bg-accent'
                        : 'bg-muted-foreground/30',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
                        theme === 'dark'
                          ? 'translate-x-[22px]'
                          : 'translate-x-[2px]',
                      )}
                    />
                  </button>
                </div>

                {/* Language */}
                <div className='rounded-lg border border-border/50 p-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Globe className='h-5 w-5 text-accent' />
                      <div>
                        <p className='text-sm font-medium text-foreground'>
                          Language
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          Interface language
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <select
                        value={settings.language}
                        onChange={e => {
                          handleUpdate('language', e.target.value);
                          setLocaleCookie(e.target.value).then(() => window.location.reload());
                        }}
                        className='rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      >
                        {LANGUAGES.map(l => (
                          <option key={l.value} value={l.value}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                      {saving === 'language' && (
                        <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-sm font-semibold'>
                  <DollarSign className='h-4 w-4 text-emerald-500' />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                {/* Onboarding Tour Restart */}
                <div className='rounded-lg border border-border/50 p-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <MapPin className='h-5 w-5 text-violet-500' />
                      <div>
                        <p className='text-sm font-medium text-foreground'>
                          Onboarding Tour
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          Replay the guided tour to learn about key features
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={restartTour}
                      className='flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-panel-raised/50 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                    >
                      <MapPin className='h-3.5 w-3.5' />
                      Show me around again
                    </button>
                  </div>
                </div>

                {/* Order Confirmation Toggle */}
                <div className='rounded-lg border border-border/50 p-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Check className='h-5 w-5 text-emerald-500' />
                      <div>
                        <p className='text-sm font-medium text-foreground'>
                          Order Confirmation
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          Show confirmation dialog before submitting orders
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() =>
                          handleUpdate(
                            'orderConfirmation',
                            !settings.orderConfirmation,
                          )
                        }
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                          settings.orderConfirmation
                            ? 'bg-accent'
                            : 'bg-muted-foreground/30',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
                            settings.orderConfirmation
                              ? 'translate-x-[22px]'
                              : 'translate-x-[2px]',
                          )}
                        />
                      </button>
                      {saving === 'orderConfirmation' && (
                        <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
                      )}
                    </div>
                  </div>
                </div>

                {/* Display Currency */}
                <div className='rounded-lg border border-border/50 p-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <DollarSign className='h-5 w-5 text-emerald-500' />
                      <div>
                        <p className='text-sm font-medium text-foreground'>
                          Display Currency
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          Currency format throughout the app
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <select
                        value={settings.displayCurrency}
                        onChange={e =>
                          handleUpdate('displayCurrency', e.target.value)
                        }
                        className='rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      >
                        {CURRENCIES.map(c => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      {saving === 'displayCurrency' && (
                        <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Simulation */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-sm font-semibold'>
                  <PiggyBank className='h-4 w-4 text-amber-500' />
                  Simulation
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                {/* Starting Balance */}
                <div className='rounded-lg border border-border/50 p-3'>
                  <div className='mb-3 flex items-center gap-3'>
                    <PiggyBank className='h-5 w-5 text-amber-500' />
                    <div>
                      <p className='text-sm font-medium text-foreground'>
                        Starting Balance
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        Used when resetting the simulation
                      </p>
                    </div>
                  </div>

                  {/* Preset buttons */}
                  <div className='flex flex-wrap gap-2'>
                    {BALANCE_PRESETS.map(b => (
                      <button
                        key={b}
                        onClick={() => handleBalanceSelect(b)}
                        disabled={saving === 'startingBalance'}
                        className={cn(
                          'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                          settings.startingBalance === b
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border text-muted-foreground hover:border-accent/50 hover:text-foreground',
                        )}
                      >
                        ${b.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  {/* Custom balance input */}
                  <form
                    onSubmit={handleSaveCustomBalance}
                    className='mt-3 flex items-center gap-2'
                  >
                    <input
                      type='number'
                      value={customBalance}
                      onChange={e => setCustomBalance(e.target.value)}
                      placeholder='Custom amount...'
                      min='100'
                      step='100'
                      className='w-40 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                    />
                    <button
                      type='submit'
                      disabled={!customBalance || saving === 'startingBalance'}
                      className='flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                    >
                      <Check className='h-3 w-3' />
                      Set
                    </button>
                    {saving === 'startingBalance' && (
                      <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
                    )}
                  </form>

                  {/* Current value */}
                  <p className='mt-2 text-[11px] text-muted-foreground'>
                    Current: ${settings.startingBalance.toLocaleString()}
                  </p>
                </div>

                {/* Price Feed Source */}
                <div className='rounded-lg border border-border/50 p-3'>
                  <div className='mb-3 flex items-center gap-3'>
                    {settings.priceFeedMode === 'live' ? (
                      <Wifi className='h-5 w-5 text-emerald-500' />
                    ) : (
                      <WifiOff className='h-5 w-5 text-muted-foreground' />
                    )}
                    <div>
                      <p className='text-sm font-medium text-foreground'>
                        Price Feed Source
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {settings.priceFeedMode === 'live'
                          ? 'Live prices via Binance (no API key required)'
                          : 'Simulated prices (GBM random walk)'}
                      </p>
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => handleUpdate('priceFeedMode', 'simulated')}
                      disabled={saving === 'priceFeedMode'}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                        settings.priceFeedMode === 'simulated'
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-muted-foreground hover:border-accent/50 hover:text-foreground',
                      )}
                    >
                      <WifiOff className='h-3.5 w-3.5' />
                      Simulated
                    </button>
                    <button
                      onClick={() => handleUpdate('priceFeedMode', 'live')}
                      disabled={saving === 'priceFeedMode'}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                        settings.priceFeedMode === 'live'
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-muted-foreground hover:border-accent/50 hover:text-foreground',
                      )}
                    >
                      <Wifi className='h-3.5 w-3.5' />
                      Live (Binance)
                    </button>
                    {saving === 'priceFeedMode' && (
                      <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
                    )}
                  </div>
                  <p className='mt-2 text-[11px] text-muted-foreground'>
                    {settings.priceFeedMode === 'live'
                      ? 'Prices sourced from Binance public API. Internet connection required.'
                      : 'Prices generated locally via Geometric Brownian Motion simulation.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className='border-negative/20'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-sm font-semibold text-negative'>
                  <AlertTriangle className='h-4 w-4' />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='rounded-lg border border-negative/20 bg-negative/5 p-4'>
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <p className='text-sm font-medium text-foreground'>
                        Reset Simulation
                      </p>
                      <p className='mt-0.5 text-xs text-muted-foreground'>
                        Permanently delete all orders, positions, trades,
                        transactions, and tutorial progress. The wallet will be
                        reset to the starting balance.
                      </p>
                    </div>

                    <AlertDialog
                      open={showResetDialog}
                      onOpenChange={setShowResetDialog}
                    >
                      <AlertDialogTrigger className='flex shrink-0 items-center gap-1.5 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-xs font-medium text-negative transition-colors hover:bg-negative/20'>
                        <Trash2 className='h-3.5 w-3.5' />
                        Reset Simulation
                      </AlertDialogTrigger>

                      <AlertDialogContent className='border-negative/20'>
                        <AlertDialogHeader>
                          <AlertDialogTitle className='flex items-center gap-2 text-negative'>
                            <AlertTriangle className='h-5 w-5' />
                            Reset Simulation?
                          </AlertDialogTitle>
                          <AlertDialogDescription className='space-y-2'>
                            <p>
                              This will permanently delete ALL of the following:
                            </p>
                            <ul className='list-inside list-disc space-y-1 text-xs'>
                              <li>All open and historical orders</li>
                              <li>All open and closed positions</li>
                              <li>All trade history</li>
                              <li>All transactions</li>
                              <li>All crypto holdings</li>
                              <li>All tutorial progress</li>
                            </ul>
                            <p className='pt-2 font-medium'>
                              The wallet will be reset to $
                              {settings.startingBalance.toLocaleString()}.
                            </p>
                            <p className='text-negative'>This cannot be undone.</p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        {resetError && (
                          <div className='rounded-md bg-negative/10 px-3 py-2 text-xs text-negative'>
                            {resetError}
                          </div>
                        )}

                        <AlertDialogFooter>
                          <AlertDialogCancel className='border-border text-xs'>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleResetSimulation}
                            disabled={resetting}
                            className='border-negative/30 bg-negative/20 text-negative hover:bg-negative/30 text-xs'
                          >
                            {resetting ? (
                              <>
                                <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                                Resetting...
                              </>
                            ) : (
                              <>
                                <Trash2 className='mr-1 h-3 w-3' />
                                Reset Everything
                              </>
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
