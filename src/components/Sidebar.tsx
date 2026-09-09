'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/profitability', label: 'Profitability Analysis', icon: '📈' },
  { href: '/upload', label: 'Upload Laporan', icon: '⬆️' },
  { href: '/data-quality', label: 'Data Quality', icon: '✅' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-neutral-200 bg-white min-h-screen">
      <div className="px-5 py-6 flex items-center gap-2 border-b border-neutral-100">
        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-lg">🍞</div>
        <div>
          <div className="font-semibold text-sm leading-tight">Bakery Business</div>
          <div className="text-[11px] text-neutral-500 leading-tight">Profitability Tools</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
