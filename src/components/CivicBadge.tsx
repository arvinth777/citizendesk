import React from 'react';
import { ShieldCheck, Award, Star } from 'lucide-react';

export function getBadgeProps(count: number) {
  if (count >= 50) {
    return {
      name: "Gold Civic Hero",
      className: "bg-[#fffbeb] text-[#b45309] border-[#fde68a]",
      Icon: Star,
    };
  }
  if (count >= 20) {
    return {
      name: "Silver Civic Hero",
      className: "bg-slate-100 text-slate-600 border-slate-300",
      Icon: Award,
    };
  }
  if (count >= 5) {
    return {
      name: "Bronze Civic Hero",
      className: "bg-orange-50 text-orange-700 border-orange-200",
      Icon: ShieldCheck,
    };
  }
  return null;
}

export default function CivicBadge({ count }: { count: number }) {
  const badge = getBadgeProps(count);
  
  if (!badge) return null;
  
  const { name, className, Icon } = badge;

  return (
    <div title={`${count} resolved reports`} className={`flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-bold tracking-wide ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {name}
    </div>
  );
}
