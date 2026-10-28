'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageSquare, UserPlus, Bell, CheckCheck } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { RowListSkeleton } from '@/components/ui/Skeletons';
import EmptyState from '@/components/ui/EmptyState';

interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'message' | 'follow' | 'mention';
  read: boolean;
  created_at: string;
  post_id?: string | null;
  actor: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string | null;
  } | null;
}

export default function NotificationsPage() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const listKey = ['notifications', userId];
  const unreadKey = ['unread', userId];

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: listKey,
    enabled: !!userId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, read, created_at, post_id, actor_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as any[];
      const actorIds = Array.from(new Set(rows.map((i) => i.actor_id).filter(Boolean)));
      const byId: Record<string, any> = {};
      if (actorIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', actorIds);
        for (const pr of (profs ?? []) as any[]) byId[pr.id] = pr;
      }
      return rows.map((item) => ({ ...item, actor: byId[item.actor_id] ?? null })) as NotificationItem[];
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('notifications-page-' + userId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId },
        () => {
          void queryClient.invalidateQueries({ queryKey: listKey });
          void queryClient.invalidateQueries({ queryKey: unreadKey });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userId, queryClient]);

  function revert() {
    void queryClient.invalidateQueries({ queryKey: listKey });
    void queryClient.invalidateQueries({ queryKey: unreadKey });
  }

  async function markOneRead(item: NotificationItem) {
    if (item.read || !userId) return;
    queryClient.setQueryData<NotificationItem[]>(listKey, (old) =>
      (old ?? []).map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    queryClient.setQueryData<number>(unreadKey, (old) => Math.max(0, (old ?? 1) - 1));
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', item.id);
    if (error) {
      console.error('Mark read failed:', error.message);
      revert();
    }
  }

  async function markAllAsRead() {
    if (!userId) return;
    queryClient.setQueryData<NotificationItem[]>(listKey, (old) =>
      (old ?? []).map((n) => ({ ...n, read: true }))
    );
    queryClient.setQueryData<number>(unreadKey, 0);
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) {
      console.error('Mark all read failed:', error.message);
      revert();
    }
  }

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500 fill-red-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-400" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-bbl-accent" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-400" />;
      case 'mention':
        return <span className="text-[11px] font-bold text-bbl-accent">@</span>;
      default:
        return <Bell className="h-4 w-4 text-stone-500" />;
    }
  };

  const getText = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'message':
        return 'sent you a message';
      case 'follow':
        return 'started following you';
      case 'mention':
        return 'mentioned you in a post';
      default:
        return 'interacted with you';
    }
  };

  function getHref(item: NotificationItem): string {
    if (item.type === 'message') return '/chat';
    if (item.type === 'follow') {
      return item.actor?.username ? '/users/' + item.actor.username : '/notifications';
    }
    if (item.post_id) return '/post/' + item.post_id;
    return item.actor?.username ? '/users/' + item.actor.username : '/notifications';
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const sameDay = d.toDateString() === new Date().toDateString();
    return sameDay
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between border-b border-stone-900/10 pb-4">
        <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Bell className="h-5 w-5 text-bbl-accent" />
          Notifications
        </h1>
        {notifications.some((n) => !n.read) && (
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="flex items-center gap-1.5 text-xs font-medium text-bbl-accent hover:underline"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      {isLoading && notifications.length === 0 ? (
        <RowListSkeleton />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-7 w-7" />}
          title="No notifications yet"
          description="When people like, reply to, or follow you, it will show up here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((item) => (
            <Link
              key={item.id}
              href={getHref(item)}
              onClick={() => void markOneRead(item)}
              className={
                'flex items-start justify-between rounded-xl border p-3.5 transition active:scale-[0.98] ' +
                (item.read
                  ? 'border-stone-900/5 bg-stone-900/[0.04] text-stone-700 hover:bg-stone-900/[0.05]'
                  : 'border-bbl-accent/30 bg-bbl-accent/5 text-stone-900 hover:bg-bbl-accent/[0.08]')
              }
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  {item.actor?.avatar_url ? (
                    <img
                      src={item.actor.avatar_url}
                      alt={item.actor.display_name}
                      className="h-10 w-10 rounded-full object-cover border border-stone-900/10"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900/5 text-sm font-bold text-stone-900">
                      {item.actor?.display_name ? item.actor.display_name[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-bbl-bg p-1 border border-stone-900/10">
                    {getIcon(item.type)}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 pt-0.5">
                  <p className="text-[14px] leading-[19px]">
                    <span className="font-semibold text-stone-900">
                      {item.actor?.display_name || item.actor?.username || 'Someone'}
                    </span>{' '}
                    <span className="text-stone-600">{getText(item.type)}</span>
                  </p>
                  <span className="text-[11px] text-stone-400">{formatTime(item.created_at)}</span>
                </div>
              </div>

              {!item.read && <span className="h-2 w-2 rounded-full bg-bbl-accent shrink-0 mt-2" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
