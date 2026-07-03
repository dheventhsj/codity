import { cn } from '@/lib/utils';

const variants: Record<string, string> = {
  QUEUED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  SCHEDULED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CLAIMED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  RUNNING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
  FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
  RETRYING: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  DEAD: 'bg-red-500/20 text-red-300 border-red-500/30',
  ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
  PAUSED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ONLINE: 'bg-green-500/10 text-green-400 border-green-500/20',
  BUSY: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  IDLE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  STALE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  OFFLINE: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  healthy: 'bg-green-500/10 text-green-400 border-green-500/20',
  degraded: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  down: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export function Badge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        variants[status] || variants.QUEUED,
        className
      )}
    >
      {status}
    </span>
  );
}
