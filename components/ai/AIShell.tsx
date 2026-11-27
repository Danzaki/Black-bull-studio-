'use client';
import { usePathname } from 'next/navigation';
import { AIProvider } from './AIProvider';
import AIButton from './AIButton';
import AISheet from './AISheet';

const HIDDEN = ['/auth', '/offline'];

export default function AIShell() {
  const path = usePathname() || '/';
  if (HIDDEN.some((p) => path.startsWith(p))) return null;
  return (
    <AIProvider>
      <AIButton />
      <AISheet />
    </AIProvider>
  );
}
