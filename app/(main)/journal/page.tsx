'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  BookOpen,
  Plus,
  Search,
  Tag,
  Filter,
  X,
  Download,
  FileText,
  Trash2,
  Pencil,
  Loader2,
  Smile,
  Frown,
  Meh,
  Zap,
  AlertTriangle,
  Heart,
  Brain,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Types ────────────────────────────────────────────────

import type { JournalEntryView } from '@/server/actions/journal';

interface JournalFilters {
  search: string;
  tag: string;
  emotionalState: string;
  assetSymbol: string;
}

const EMOTIONAL_STATES = [
  { value: 'calm', label: 'Calm', icon: Meh, color: 'text-blue-400' },
  {
    value: 'confident',
    label: 'Confident',
    icon: Heart,
    color: 'text-emerald-400',
  },
  { value: 'excited', label: 'Excited', icon: Zap, color: 'text-yellow-400' },
  {
    value: 'cautious',
    label: 'Cautious',
    icon: Brain,
    color: 'text-purple-400',
  },
  {
    value: 'stressed',
    label: 'Stressed',
    icon: Frown,
    color: 'text-orange-400',
  },
  {
    value: 'frustrated',
    label: 'Frustrated',
    icon: AlertTriangle,
    color: 'text-red-400',
  },
  { value: 'fearful', label: 'Fearful', icon: Smile, color: 'text-gray-400' },
  { value: 'greedy', label: 'Greedy', icon: Smile, color: 'text-pink-400' },
  {
    value: 'neutral',
    label: 'Neutral',
    icon: Meh,
    color: 'text-muted-foreground',
  },
];

const COMMON_TAGS = [
  'scalp',
  'swing',
  'day-trade',
  'breakout',
  'reversal',
  'momentum',
  'trend-following',
  'mean-reversion',
  'news',
  'earnings',
  'gap',
  'fomo',
  'revenge',
  'discipline',
];

// ─── Helpers ──────────────────────────────────────────────

function getEmotionMeta(value: string | null) {
  return EMOTIONAL_STATES.find(e => e.value === value) ?? null;
}

// ─── Page ─────────────────────────────────────────────────

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<JournalFilters>({
    search: '',
    tag: '',
    emotionalState: '',
    assetSymbol: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntryView | null>(
    null,
  );

  // ── Fetch ──

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.tag) params.set('tag', filters.tag);
      if (filters.emotionalState)
        params.set('emotionalState', filters.emotionalState);
      if (filters.assetSymbol) params.set('assetSymbol', filters.assetSymbol);

      const res = await fetch(`/api/journal?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.entries) setEntries(data.entries);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEntries();
  }, [fetchEntries]);

  // ── Export ──

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.emotionalState)
      params.set('emotionalState', filters.emotionalState);
    if (filters.assetSymbol) params.set('assetSymbol', filters.assetSymbol);
    params.set('export', 'csv');
    window.open(`/api/journal?${params.toString()}`, '_blank');
  };

  const handleExportText = () => {
    const params = new URLSearchParams();
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.emotionalState)
      params.set('emotionalState', filters.emotionalState);
    if (filters.assetSymbol) params.set('assetSymbol', filters.assetSymbol);
    params.set('export', 'text');
    window.open(`/api/journal?${params.toString()}`, '_blank');
  };

  // ── Delete ──

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this journal entry?')) return;
    try {
      const res = await fetch(`/api/journal/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEntries(prev => prev.filter(e => e.id !== id));
      }
    } catch {
      // Silent
    }
  };

  // ── Open editor for editing ──

  const handleEdit = (entry: JournalEntryView) => {
    setEditingEntry(entry);
    setShowEditor(true);
  };

  return (
    <div className='flex h-full flex-col overflow-y-auto p-4 pb-8 md:p-6'>
      <div className='mx-auto flex w-full max-w-5xl flex-1 flex-col space-y-4 md:space-y-6'>
        {/* Header */}
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <BookOpen className='h-5 w-5 text-accent' />
            <h1 className='font-display text-lg font-semibold tracking-tight text-foreground md:text-xl'>
              Trading Journal
            </h1>
            <Badge
              variant='outline'
              className='ml-2 text-[11px] text-muted-foreground'
            >
              {entries.length} entries
            </Badge>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleExportCsv}
              className='h-8 gap-1.5 text-xs'
              title='Export as CSV'
            >
              <Download className='h-3.5 w-3.5' />
              CSV
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleExportText}
              className='h-8 gap-1.5 text-xs'
              title='Export as text report'
            >
              <FileText className='h-3.5 w-3.5' />
              Export
            </Button>
            <Button
              size='sm'
              onClick={() => {
                setEditingEntry(null);
                setShowEditor(true);
              }}
              className='h-8 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold'
            >
              <Plus className='h-3.5 w-3.5' />
              New Note
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className='space-y-3'>
          {/* Search bar + filter toggle */}
          <div className='flex items-center gap-2'>
            <div className='relative flex-1'>
              <Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <input
                type='text'
                value={filters.search}
                onChange={e =>
                  setFilters(f => ({ ...f, search: e.target.value }))
                }
                placeholder='Search notes...'
                className='w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                showFilters
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted-foreground hover:border-accent/50 hover:text-foreground',
              )}
            >
              <Filter className='h-3.5 w-3.5' />
              Filters
              {(filters.tag ||
                filters.emotionalState ||
                filters.assetSymbol) && (
                <span className='ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground'>
                  {
                    [
                      filters.tag,
                      filters.emotionalState,
                      filters.assetSymbol,
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className='grid grid-cols-1 gap-3 rounded-lg border border-border/50 bg-panel-raised/30 p-3 sm:grid-cols-3'>
              {/* Tag filter */}
              <div>
                <label className='mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
                  <Tag className='h-3 w-3' />
                  Tag
                </label>
                <div className='flex flex-wrap gap-1.5'>
                  <button
                    onClick={() => setFilters(f => ({ ...f, tag: '' }))}
                    className={cn(
                      'rounded-md border px-2 py-0.5 text-[11px] transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                      !filters.tag
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    All
                  </button>
                  {COMMON_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() =>
                        setFilters(f => ({
                          ...f,
                          tag: f.tag === tag ? '' : tag,
                        }))
                      }
                      className={cn(
                        'rounded-md border px-2 py-0.5 text-[11px] transition-colors',
                        filters.tag === tag
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emotional state filter */}
              <div>
                <label className='mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
                  <Smile className='h-3 w-3' />
                  Emotional State
                </label>
                <div className='flex flex-wrap gap-1.5'>
                  <button
                    onClick={() =>
                      setFilters(f => ({ ...f, emotionalState: '' }))
                    }
                    className={cn(
                      'rounded-md border px-2 py-0.5 text-[11px] transition-colors',
                      !filters.emotionalState
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    All
                  </button>
                  {EMOTIONAL_STATES.map(state => {
                    const Icon = state.icon;
                    return (
                      <button
                        key={state.value}
                        onClick={() =>
                          setFilters(f => ({
                            ...f,
                            emotionalState:
                              f.emotionalState === state.value
                                ? ''
                                : state.value,
                          }))
                        }
                        className={cn(
                        'flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                        filters.emotionalState === state.value
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                      >
                        <Icon className={cn('h-3 w-3', state.color)} />
                        {state.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Asset symbol filter */}
              <div>
                <label className='mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
                  Asset
                </label>
                <input
                  type='text'
                  value={filters.assetSymbol}
                  onChange={e =>
                    setFilters(f => ({ ...f, assetSymbol: e.target.value }))
                  }
                  placeholder='e.g. BTC/USD'
                className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
              />
            </div>
          </div>
          )}
        </div>

        {/* Journal entries */}
        {loading ? (
          <div className='flex items-center justify-center py-16'>
            <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12'>
              <BookOpen className='mb-3 h-10 w-10 text-muted-foreground/30' />
              <p className='text-sm text-muted-foreground'>
                {filters.search || filters.tag || filters.emotionalState
                  ? 'No entries match your filters.'
                  : 'No journal entries yet. Start documenting your trades!'}
              </p>
              {!filters.search && !filters.tag && !filters.emotionalState && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setEditingEntry(null);
                    setShowEditor(true);
                  }}
                  className='mt-3 gap-1.5 text-xs'
                >
                  <Plus className='h-3.5 w-3.5' />
                  First Entry
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-3'>
            {entries.map(entry => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Journal Editor Dialog */}
        {showEditor && (
          <JournalEditor
            entry={editingEntry}
            onClose={() => {
              setShowEditor(false);
              setEditingEntry(null);
            }}
            onSaved={() => {
              setShowEditor(false);
              setEditingEntry(null);
              fetchEntries();
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Journal Entry Card ───────────────────────────────

function JournalEntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: JournalEntryView;
  onEdit: (entry: JournalEntryView) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const emotion = getEmotionMeta(entry.emotionalState);

  return (
    <Card className='group transition-colors hover:border-accent/30'>
      <CardContent className='p-0'>
        {/* Header row */}
        <div className='flex items-start justify-between gap-3 px-4 pt-3 pb-2'>
          <div className='flex min-w-0 flex-1 items-center gap-2.5'>
            {/* Asset badge */}
            {entry.assetSymbol && (
              <Badge
                variant='outline'
                className='shrink-0 text-[11px] font-mono'
              >
                {entry.assetSymbol}
              </Badge>
            )}

            {/* Emotional state */}
            {emotion && (
              <div className='flex shrink-0 items-center gap-1 rounded-full bg-muted/30 px-2 py-0.5'>
                <emotion.icon className={cn('h-3 w-3', emotion.color)} />
                <span className={cn('text-[11px] font-medium', emotion.color)}>
                  {emotion.label}
                </span>
              </div>
            )}

            {/* Tags */}
            {entry.tags.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {entry.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant='secondary'
                    className='text-[11px] px-1.5 py-0'
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className='flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
            <button
              onClick={() => onEdit(entry)}                className='rounded p-1 text-muted-foreground hover:bg-panel-raised hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                              title='Edit'
            >
              <Pencil className='h-3.5 w-3.5' />
            </button>
            <button
              onClick={() => onDelete(entry.id)}                className='rounded p-1 text-muted-foreground hover:bg-negative/10 hover:text-negative focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                              title='Delete'
            >
              <Trash2 className='h-3.5 w-3.5' />
            </button>
          </div>

          {/* Date + expand */}
          <div className='flex shrink-0 items-center gap-2'>
            <span className='whitespace-nowrap text-[11px] text-muted-foreground'>
              {format(new Date(entry.createdAt), 'MMM d, HH:mm')}
            </span>
            {entry.notes.length > 150 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className='rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
              >
                {expanded ? (
                  <ChevronUp className='h-3.5 w-3.5' />
                ) : (
                  <ChevronDown className='h-3.5 w-3.5' />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Notes body */}
        <div className='px-4 pb-3'>
          <p
            className={cn(
              'whitespace-pre-wrap text-xs text-foreground/90 leading-relaxed',
              !expanded && entry.notes.length > 150 && 'line-clamp-3',
            )}
          >
            {entry.notes}
          </p>

          {/* Screenshot */}
          {entry.screenshot && (
            <div className='mt-2'>
              <button
                onClick={() =>
                  window.open(entry.screenshot!, '_blank', 'noopener')
                }
                className='flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
              >
                <Eye className='h-3 w-3' />
                View Screenshot
              </button>
            </div>
          )}

          {/* Trade reference */}
          {entry.tradeId && (
            <p className='mt-1.5 text-[11px] text-muted-foreground'>
              Linked to trade: {entry.tradeId.slice(0, 8)}...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Journal Editor Dialog ────────────────────────────

const TAG_COLORS = [
  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
];

function JournalEditor({
  entry,
  onClose,
  onSaved,
}: {
  entry: JournalEntryView | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [emotionalState, setEmotionalState] = useState<string | null>(
    entry?.emotionalState ?? null,
  );
  const [assetSymbol, setAssetSymbol] = useState(entry?.assetSymbol ?? '');
  const [screenshot, setScreenshot] = useState(entry?.screenshot ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddTag = (tag: string) => {
    const clean = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (clean && !tags.includes(clean) && tags.length < 10) {
      setTags(prev => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleSave = async () => {
    if (!notes.trim()) {
      setError('Notes are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        notes: notes.trim(),
        tags,
        emotionalState: emotionalState || null,
        assetSymbol: assetSymbol.toUpperCase() || null,
        screenshot: screenshot || null,
      };

      let res: Response;
      if (entry) {
        res = await fetch(`/api/journal/${entry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (data.success) {
        onSaved();
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
      role='dialog'
      aria-modal='true'
      onClick={onClose}
    >
      <div
        className='w-full max-w-lg rounded-lg border border-border bg-popover shadow-xl'
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between border-b border-border px-4 py-3'>
          <h2 className='text-sm font-semibold text-foreground'>
            {entry ? 'Edit Journal Entry' : 'New Journal Entry'}
          </h2>
          <button
            onClick={onClose}
            className='rounded p-1 text-muted-foreground hover:bg-panel-raised hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
          >
            <X className='h-4 w-4' />
          </button>
        </div>

        {/* Body */}
        <div className='space-y-3 px-4 py-3'>
          {/* Asset symbol */}
          <div>
            <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
              Asset (optional)
            </label>
            <input
              type='text'
              value={assetSymbol}
              onChange={e => setAssetSymbol(e.target.value)}
              placeholder='e.g. BTC/USD'
              className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent'
            />
          </div>

          {/* Notes */}
          <div>
            <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
              Notes *
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='Describe your trade, what you were thinking, what you learned...'
              rows={5}
              maxLength={5000}
              className='w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent'
            />
            <p className='mt-0.5 text-right text-[11px] text-muted-foreground'>
              {notes.length}/5000
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
              Tags (up to 10)
            </label>
            <div className='flex flex-wrap gap-1.5 mb-2'>
              {tags.map((tag, i) => (
                <span
                  key={tag}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]',
                    TAG_COLORS[i % TAG_COLORS.length],
                  )}
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className='hover:text-foreground'
                  >
                    <X className='h-2.5 w-2.5' />
                  </button>
                </span>
              ))}
            </div>
            <div className='flex gap-1.5'>
              <input
                type='text'
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder='Type tag and press Enter'
                disabled={tags.length >= 10}
                className='flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent disabled:opacity-50'
              />
              <button
                onClick={() => handleAddTag(tagInput)}
                disabled={!tagInput.trim() || tags.length >= 10}
                className='rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
              >
                Add
              </button>
            </div>

            {/* Quick tag suggestions */}
            <div className='mt-2'>
              <p className='mb-1 text-[11px] text-muted-foreground'>
                Quick add:
              </p>
              <div className='flex flex-wrap gap-1'>
                {COMMON_TAGS.filter(t => !tags.includes(t))
                  .slice(0, 8)
                  .map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleAddTag(tag)}
                      disabled={tags.length >= 10}
                      className='rounded-md border border-border/50 px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                    >
                      +{tag}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Emotional state */}
          <div>
            <label className='mb-1.5 block text-[11px] font-medium text-muted-foreground'>
              Emotional State (optional)
            </label>
            <div className='flex flex-wrap gap-1.5'>
              {EMOTIONAL_STATES.map(state => {
                const Icon = state.icon;
                const isActive = emotionalState === state.value;
                return (
                  <button
                    key={state.value}
                    onClick={() =>
                      setEmotionalState(isActive ? null : state.value)
                    }
                    className={cn(
                      'flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                      isActive
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('h-3 w-3', state.color)} />
                    {state.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Screenshot URL */}
          <div>
            <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
              Screenshot URL (optional)
            </label>
            <input
              type='text'
              value={screenshot}
              onChange={e => setScreenshot(e.target.value)}
              placeholder='https://... or data:image/...'
              maxLength={50000}
              className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent'
            />
          </div>

          {error && (
            <div className='rounded-md bg-negative/10 px-3 py-2 text-xs text-negative'>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-2 border-t border-border px-4 py-3'>
          <button
            onClick={onClose}
            className='rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !notes.trim()}
            className='flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
          >
            {saving ? (
              <Loader2 className='h-3 w-3 animate-spin' />
            ) : (
              <Plus className='h-3 w-3' />
            )}
            {entry ? 'Update' : 'Create Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
