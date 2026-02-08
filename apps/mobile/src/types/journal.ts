export type JournalEntryType = 'legacy' | 'reflection' | 'note' | 'trip_plan' | string;

export interface JournalEntry {
  id: string;
  user_id?: string;
  hike_id?: string | null;
  entry_type: JournalEntryType;
  title?: string | null;
  content: string;
  // Backend has historically used both names; keep both to be resilient.
  meta_data?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

