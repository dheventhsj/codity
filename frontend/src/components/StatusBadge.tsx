interface StatusBadgeProps {
  status: string;
}

const statusColors: Record<string, string> = {
  QUEUED: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  CLAIMED: 'bg-indigo-100 text-indigo-700',
  RUNNING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  RETRYING: 'bg-orange-100 text-orange-700',
  DEAD: 'bg-red-200 text-red-800',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  DRAINING: 'bg-orange-100 text-orange-700',
  ONLINE: 'bg-green-100 text-green-700',
  BUSY: 'bg-yellow-100 text-yellow-700',
  IDLE: 'bg-blue-100 text-blue-700',
  STALE: 'bg-orange-100 text-orange-700',
  OFFLINE: 'bg-gray-100 text-gray-700',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
}
