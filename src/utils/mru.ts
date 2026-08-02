export interface MRUEntry {
  name: string;
  timestamp: number;
  size: number;
}

const MRU_STORAGE_KEY = 'SIMPLEDOCS_MRU';
const MAX_MRU_ENTRIES = 5;

export function getMRUList(): MRUEntry[] {
  try {
    const raw = localStorage.getItem(MRU_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as MRUEntry[];
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

export function addMRUEntry(entry: Omit<MRUEntry, 'timestamp'>): MRUEntry[] {
  let list = getMRUList();
  // Remove existing entry with same name
  list = list.filter((e) => e.name !== entry.name);
  // Add new entry at the top
  const newEntry: MRUEntry = {
    ...entry,
    timestamp: Date.now(),
  };
  list.unshift(newEntry);
  // Trim to max
  list = list.slice(0, MAX_MRU_ENTRIES);
  // Persist
  localStorage.setItem(MRU_STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function removeMRUEntry(name: string): MRUEntry[] {
  let list = getMRUList();
  list = list.filter((e) => e.name !== name);
  localStorage.setItem(MRU_STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function clearMRUList(): void {
  localStorage.removeItem(MRU_STORAGE_KEY);
}

export function formatMRUTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
