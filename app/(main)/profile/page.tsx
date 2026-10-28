'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { RowListSkeleton } from '@/components/ui/Skeletons';

export default function ProfileRedirect() {
  const router = useRouter();
  const { userId, profile } = useAuth();

  useEffect(() => {
    if (profile?.username) {
      router.replace(`/users/${profile.username}`);
    } else if (userId === null) {
      router.replace('/auth/sign-in');
    }
  }, [userId, profile?.username, router]);

  return <RowListSkeleton count={3} />;
}
