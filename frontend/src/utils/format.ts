export function formatNGN(n: number): string {
  return `₦${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function isOverdue(dateStr: string): boolean {
  return daysUntil(dateStr) < 0;
}

export function tierColor(tier: string): string {
  switch (tier) {
    case 'UNVERIFIED': return 'bg-stone-200 text-stone-700';
    case 'VERIFIED': return 'bg-emerald-100 text-emerald-800';
    case 'COMMUNITY': return 'bg-amber-100 text-amber-800';
    default: return 'bg-stone-100 text-stone-600';
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'text-emerald-600';
    case 'FROZEN': return 'text-red-600';
    case 'SUSPENDED': return 'text-stone-400';
    default: return 'text-stone-600';
  }
}
