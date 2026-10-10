'use client';

import { useEffect, useRef, useState } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ITEM_H = 48;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function daysIn(monthIndex: number, year: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function ageFrom(y: number, m: number, d: number) {
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() < m || (now.getMonth() === m && now.getDate() < d)) age -= 1;
  return age;
}

function parse(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
}

function Wheel({ items, index, onChange }: { items: string[]; index: number; onChange: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && Math.abs(el.scrollTop - index * ITEM_H) > 1) {
      el.scrollTop = index * ITEM_H;
    }
  }, [index, items.length]);

  function handleScroll() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(Math.max(Math.round(el.scrollTop / ITEM_H), 0), items.length - 1);
      if (i !== index) onChange(i);
    }, 100);
  }

  return (
    <div className="relative flex-1" style={{ height: ITEM_H * 3 }}>
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-scroll [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        <div style={{ height: ITEM_H }} />
        {items.map((item, i) => (
          <div
            key={item}
            onClick={() => ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })}
            className={`flex snap-center items-center justify-center ${
              i === index ? 'text-lg font-semibold text-stone-900' : 'text-base text-stone-400'
            }`}
            style={{ height: ITEM_H }}
          >
            {item}
          </div>
        ))}
        <div style={{ height: ITEM_H }} />
      </div>
      <div
        className="pointer-events-none absolute inset-x-3 border-y-2 border-[#f97316]/70"
        style={{ top: ITEM_H, height: ITEM_H }}
      />
    </div>
  );
}

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function DateOfBirthPicker({ id, value, onChange, className }: Props) {
  const thisYear = new Date().getFullYear();
  const minYear = thisYear - 100;
  const years = Array.from({ length: 101 }, (_, i) => String(minYear + i));

  const parsed = parse(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState(1);
  const [year, setYear] = useState(thisYear - 25);

  function openPicker() {
    const p = parse(value);
    setMonth(p?.month ?? 0);
    setDay(p?.day ?? 1);
    setYear(p?.year ?? thisYear - 25);
    setOpen(true);
  }

  const totalDays = daysIn(month, year);
  const safeDay = Math.min(day, totalDays);
  const dayItems = Array.from({ length: totalDays }, (_, i) => pad(i + 1));

  function commit() {
    let y = year;
    let m = month;
    let d = safeDay;
    const now = new Date();
    if (new Date(y, m, d) > now) {
      y = now.getFullYear();
      m = now.getMonth();
      d = now.getDate();
    }
    onChange(`${y}-${pad(m + 1)}-${pad(d)}`);
    setOpen(false);
  }

  const label = parsed
    ? `Birthday (${ageFrom(parsed.year, parsed.month, parsed.day)} years old)`
    : 'Date of birth';
  const text = parsed ? `${MONTHS[parsed.month]} ${parsed.day}, ${parsed.year}` : 'Select your birthday';

  return (
    <>
      <button
        type="button"
        id={id}
        onClick={openPicker}
        className={
          className ??
          'w-full rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] px-4 py-3 text-left outline-none focus:border-[#f97316]/50'
        }
      >
        <span className="block text-[11px] text-stone-500">{label}</span>
        <span className={`block text-sm ${parsed ? 'text-stone-900' : 'text-stone-400'}`}>{text}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-6" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="border-b-2 border-[#f97316] px-6 py-5 text-xl text-stone-900">Set date</h2>
            <div className="flex px-4 py-6">
              <Wheel items={MONTHS} index={month} onChange={setMonth} />
              <Wheel items={dayItems} index={safeDay - 1} onChange={(i) => setDay(i + 1)} />
              <Wheel items={years} index={year - minYear} onChange={(i) => setYear(minYear + i)} />
            </div>
            <div className="grid grid-cols-2 border-t border-stone-200">
              <button type="button" onClick={() => setOpen(false)} className="py-4 text-sm text-stone-700">
                Cancel
              </button>
              <button type="button" onClick={commit} className="border-l border-stone-200 py-4 text-sm font-semibold text-stone-900">
                Set
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
