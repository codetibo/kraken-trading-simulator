'use client';

import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  BookOpen, Plus, Loader2, Trash2, Pencil, X, ChevronDown, ChevronUp,
  Smile, Frown, Meh, Zap, AlertTriangle, Heart, Brain, Eye,
} from 'lucide-react';
import Link from 'next/link';


import type { JournalEntryView } from '@/server/actions/journal';

const EMOTIONAL_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  calm: { icon: Meh, color: 'text-blue-400' },
  confident: { icon: Heart, color: 'text-emerald-400' },
  excited: { icon: Zap, color: 'text-yellow-400' },
  cautious: { icon: Brain, color: 'text-purple-400' },
  stressed: { icon: Frown, color: 'text-orange-400' },
  frustrated: { icon: AlertTriangle, color: 'text-red-400' },
  fearful: { icon: Smile, color: 'text-gray-400' },
  greedy: { icon: Smile, color: 'text-pink-400' },
  neutral: { icon: Meh, color: 'text-muted-foreground' },
};

export function JournalTab() {
  const [entries, setEntries] = useState<JournalEntryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntryView | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/journal', { cache: 'no-store' });
      const data = await res.json();
      if (data.entries) setEntries(data.entries.slice(0, 10));
    } catch (err) {
      console.warn('Failed to fetch journal entries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEntries();
  }, [fetchEntries]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/journal/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      } else {
        fetchEntries();
      }
    } catch {
      fetchEntries();
    }
  };

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b border-border px-3 py-1.5'>
        <span className='text-[11px] font-medium text-muted-foreground'>
          {entries.length} entries
        </span>
        <button
          onClick={() => {
            setEditingEntry(null);
            setShowEditor(true);
          }}
          className='flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11px] font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
        >
          <Plus className='h-3 w-3' />
          Quick Note
        </button>
      </div>

      {/* List */}
      <div className='flex-1 overflow-auto'>
        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          </div>
        ) : entries.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-8'>
            <BookOpen className='mb-2 h-6 w-6 text-muted-foreground/30' />
            <p className='text-[11px] text-muted-foreground'>No journal entries yet</p>
            <button
              onClick={() => {
                setEditingEntry(null);
                setShowEditor(true);
              }}
              className='mt-2 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
            >
              Add your first note
            </button>
          </div>
        ) : (
          <div className='divide-y divide-border/50'>
            {entries.map((entry) => {
              const emotion = entry.emotionalState ? EMOTIONAL_MAP[entry.emotionalState] : null;
              const EmotionIcon = emotion?.icon;
              const isExpanded = expandedId === entry.id;

              return (
                <div key={entry.id} className='group px-3 py-2 transition-colors hover:bg-panel-raised/30'>
                  {/* Header row */}
                  <div className='mb-1 flex items-center justify-between'>
                    <div className='flex min-w-0 items-center gap-1.5'>
                      {entry.assetSymbol && (
                        <span className='rounded bg-muted/40 px-1 py-0 font-mono text-[11px] text-muted-foreground'>
                          {entry.assetSymbol}
                        </span>
                      )}
                      {EmotionIcon && emotion && (
                        <EmotionIcon className={cn('h-3 w-3', emotion.color)} />
                      )}
                      {entry.tags.length > 0 && (
                        <span className='truncate text-[11px] text-muted-foreground'>
                          {entry.tags.slice(0, 2).join(', ')}
                          {entry.tags.length > 2 && '...'}
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                      <button
                        onClick={() => { setEditingEntry(entry); setShowEditor(true); }}
                        className='rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
                      >
                        <Pencil className='h-3 w-3' />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className='rounded p-0.5 text-muted-foreground hover:text-negative'
                      >
                        <Trash2 className='h-3 w-3' />
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <p
                      className={cn(
                        'whitespace-pre-wrap text-[11px] text-foreground/80 leading-relaxed',
                        !isExpanded && 'line-clamp-2',
                      )}
                    >
                      {entry.notes}
                    </p>
                    {entry.notes.length > 120 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className='mt-0.5 flex items-center gap-0.5 text-[11px] text-accent hover:text-accent/80'
                      >
                        {isExpanded ? (
                          <><ChevronUp className='h-3 w-3' /> Less</>
                        ) : (
                          <><ChevronDown className='h-3 w-3' /> More</>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Footer */}
                  <div className='mt-1 flex items-center justify-between'>
                    <span className='text-[11px] text-muted-foreground'>
                      {format(new Date(entry.createdAt), 'MMM d, HH:mm')}
                    </span>
                    {entry.screenshot && (
                      <span className='flex items-center gap-0.5 text-[11px] text-accent'>
                        <Eye className='h-2.5 w-2.5' />
                        SS
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Open full journal link */}
      <Link
        href='/journal'
        className='flex items-center justify-center gap-1.5 border-t border-border py-2 text-[11px] text-accent hover:underline hover:text-accent/80 transition-colors'
      >
        <BookOpen className='h-3 w-3' />
        Open full Trading Journal
      </Link>

      {/* Inline Quick Journal Editor */}
      {showEditor && (
        <JournalInlineEditor
          entry={editingEntry}
          onClose={() => { setShowEditor(false); setEditingEntry(null); }}
          onSaved={() => { setShowEditor(false); setEditingEntry(null); fetchEntries(); }}
        />
      )}
    </div>
  );
}

// ── Inline Journal Editor ──

function JournalInlineEditor({
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
  const [emotionalState, setEmotionalState] = useState<string | null>(entry?.emotionalState ?? null);
  const [assetSymbol, setAssetSymbol] = useState(entry?.assetSymbol ?? '');
  const [saving, setSaving] = useState(false);

  const handleAddTag = () => {
    const clean = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (clean && !tags.includes(clean) && tags.length < 5) {
      setTags((prev) => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleSave = async () => {
    if (!notes.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        notes: notes.trim(),
        tags,
        emotionalState: emotionalState || null,
        assetSymbol: assetSymbol.toUpperCase() || null,
      };

      const res = entry
        ? await fetch(`/api/journal/${entry.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

      const data = await res.json();
      if (data.success) onSaved();
    } catch (err) {
      console.warn('Failed to save journal entry:', err);
    } finally {
      setSaving(false);
    }
  };

  const quickEmotions = [
    { value: 'calm', label: '😌', color: 'text-blue-400' },
    { value: 'confident', label: '💪', color: 'text-emerald-400' },
    { value: 'excited', label: '🔥', color: 'text-yellow-400' },
    { value: 'stressed', label: '😰', color: 'text-orange-400' },
    { value: 'frustrated', label: '😤', color: 'text-red-400' },
  ];

  return (
    <div className='border-t border-border bg-popover p-3'>
      <div className='mb-2 flex items-center justify-between'>
        <span className='text-[11px] font-medium text-foreground'>
          {entry ? 'Edit Note' : 'Quick Note'}
        </span>
        <button onClick={onClose} className='text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'>
          <X className='h-3.5 w-3.5' />
        </button>
      </div>

      <div className='space-y-2'>
        {/* Asset + Emotion row */}
        <div className='flex gap-2'>
          <input
            type='text'
            value={assetSymbol}
            onChange={(e) => setAssetSymbol(e.target.value)}
            placeholder='Asset'
            className='w-20 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent'
          />
          <div className='flex gap-0.5'>
            {quickEmotions.map((em) => (
              <button
                key={em.value}
                onClick={() => setEmotionalState(emotionalState === em.value ? null : em.value)}
                className={cn(
                  'rounded px-1.5 py-1 text-xs transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                  emotionalState === em.value ? 'bg-accent/20' : 'hover:bg-panel-raised',
                )}
                title={em.value}
              >
                {em.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='What did you learn from this trade?'
          rows={3}
          className='w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
        />

        {/* Tags */}
        <div className='flex gap-1.5'>
          <div className='flex flex-1 items-center gap-1 rounded-md border border-border bg-background px-2'>
            <input
              type='text'
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder='Add tag...'
              disabled={tags.length >= 5}
              className='min-w-0 flex-1 bg-transparent py-1 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/40 disabled:opacity-50'
            />
            {tags.length > 0 && (
              <div className='flex gap-0.5'>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className='inline-flex items-center gap-0.5 rounded bg-muted/40 px-1 py-0.5 text-[11px] text-muted-foreground'
                  >
                    {tag}
                    <button onClick={() => setTags((prev) => prev.filter((t) => t !== tag))} className='hover:text-foreground'>
                      <X className='h-2 w-2' />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !notes.trim()}
            className='shrink-0 rounded-md bg-accent px-3 py-1 text-[11px] font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
          >
            {saving ? <Loader2 className='h-3 w-3 animate-spin' /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
