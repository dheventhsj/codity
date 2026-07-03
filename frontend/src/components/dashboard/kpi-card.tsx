'use client';

import { motion } from 'framer-motion';
import { cn, formatNumber } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: 'text-[#3B82F6]',
  success: 'text-[#22C55E]',
  warning: 'text-[#F59E0B]',
  danger: 'text-[#EF4444]',
};

export function KpiCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-surface p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-[#A1A1AA]">{subtitle}</p>}
          {trend !== undefined && (
            <p className={cn('mt-1 text-xs', trend >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs last hour
            </p>
          )}
        </div>
        <div className={cn('rounded-md border border-[#262626] p-2', variantStyles[variant])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </motion.div>
  );
}
