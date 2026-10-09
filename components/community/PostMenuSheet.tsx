'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  Ban, BarChart3, Eye, EyeOff, Flag, Heart, Link2, Megaphone, MessageCircle,
  Pin, PinOff, Repeat2, Trash2, UserMinus, UserPlus, VolumeX,
} from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Post } from '@/types/community';

const REPORT_REASONS = ['Spam', 'Scam or fraud', 'Harassment', 'Something else'];

interface Props {
  open: boolean;
  onClose: () => void;
  post: Post;
  isOwner: boolean;
  isQuote: boolean;
  currentUserId: string | null;
  supabase: SupabaseClient;
  stats: { views: number; likes: number; comments: number; reposts: number };
  onCopyLink: () => void;
  onDelete: () => void;
  onReport: () => void;
  onPromote: () => void;
  onNotInterested: () => void;
}

function Tile({
  icon, label, onClick, accent = false, disabled = false,
}: { icon: ReactNode; label: string; onClick: () => void; accent?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3.5 text-[12px] font-bold transition active:scale-95 disabled:opacity-50 ${
        accent ? 'bg-[#f97316] text-black' : 'border border-stone-900/10 bg-white text-stone-900'
      }`}
    >
      {icon}
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}

export function PostMenuSheet({
  open, onClose, post, isOwner, isQuote, currentUserId, supabase,
  stats, onCopyLink, onDelete, onReport, onPromote, onNotInterested,
}: Props) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [pinned, setPinned] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [notice, setNotice] = useState('');

  const authorId = post.user_id;
  const canFollow = !isOwner && !!currentUserId && !!authorId;
  const canAct = !isOwner && !!currentUserId && !!authorId && !isQuote;

  useEffect(() => {
    if (!open) {
      setShowStats(false);
      setReporting(false);
      setNotice('');
      return;
    }
    let cancelled = false;
    async function load() {
      if (canFollow) {
        const { data } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', currentUserId)
          .eq('following_id', authorId)
          .maybeSingle();
        if (!cancelled) setFollowing(!!data);
      }
      if (isOwner && !isQuote && currentUserId) {
        const { data } = await supabase
          .from('profiles')
          .select('pinned_post_id')
          .eq('id', currentUserId)
          .maybeSingle();
        if (!cancelled) setPinned(data?.pinned_post_id === post.id);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, canFollow, isOwner, isQuote, currentUserId, authorId, post.id, supabase]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(onClose, 900);
  }

  async function toggleFollow() {
    if (!currentUserId || busy) return;
    setBusy(true);
    if (following) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', authorId);
      if (!error) setFollowing(false);
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: authorId });
      if (!error) setFollowing(true);
    }
    setBusy(false);
    onClose();
  }

  async function togglePin() {
    if (!currentUserId || busy) return;
    const nowPinned = !pinned;
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ pinned_post_id: nowPinned ? post.id : null })
      .eq('id', currentUserId);
    setBusy(false);
    if (error) {
      setNotice('Could not update: ' + error.message);
      return;
    }
    setPinned(nowPinned);
    window.dispatchEvent(new Event('pin-changed'));
    flash(nowPinned ? 'Pinned to your profile' : 'Unpinned from your profile');
  }

  async function hideAuthor(kind: 'mute' | 'block') {
    if (!currentUserId || busy) return;
    const handleName = post.profiles?.username || 'user';
    if (kind === 'block' && !window.confirm(`Block @${handleName}? You will no longer see their posts.`)) return;
    setBusy(true);
    const { error } =
      kind === 'block'
        ? await supabase
            .from('user_blocks')
            .upsert({ blocker_id: currentUserId, blocked_id: authorId }, { ignoreDuplicates: true })
        : await supabase
            .from('user_mutes')
            .upsert({ muter_id: currentUserId, muted_id: authorId }, { ignoreDuplicates: true });
    setBusy(false);
    if (error) {
      setNotice('Could not save: ' + error.message);
      return;
    }
    window.dispatchEvent(new CustomEvent('user-hidden', { detail: authorId }));
    flash(kind === 'block' ? `Blocked @${handleName}` : `Muted @${handleName}`);
  }

  async function sendReport(reason: string) {
    if (busy) return;
    if (currentUserId && !isQuote) {
      setBusy(true);
      const { error } = await supabase
        .from('post_reports')
        .upsert(
          { post_id: post.id, reporter_id: currentUserId, reason },
          { onConflict: 'post_id,reporter_id', ignoreDuplicates: true }
        );
      setBusy(false);
      if (error) {
        setNotice('Could not send report: ' + error.message);
        return;
      }
    }
    onReport();
    onClose();
  }

  if (!open) return null;

  const name = post.profiles?.display_name || 'User';
  const handle = post.profiles?.username || 'user';
  const preview = (post.content || '').trim();

  const tiles: ReactNode[] = [];
  if (isOwner && !isQuote) {
    tiles.push(<Tile key="promote" accent icon={<Megaphone className="h-5 w-5" />} label="Promote" onClick={onPromote} />);
    tiles.push(<Tile key="insights" icon={<BarChart3 className="h-5 w-5" />} label="Insights" onClick={() => setShowStats((v) => !v)} />);
    tiles.push(
      <Tile
        key="pin"
        disabled={busy || pinned === null}
        icon={pinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
        label={pinned ? 'Unpin' : 'Pin to profile'}
        onClick={togglePin}
      />
    );
  }
  if (!isOwner && canFollow) {
    tiles.push(
      <Tile
        key="follow"
        accent={!following}
        disabled={busy || following === null}
        icon={following ? <UserMinus className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
        label={following ? 'Unfollow' : 'Follow'}
        onClick={toggleFollow}
      />
    );
  }
  tiles.push(
    <Tile
      key="copy"
      icon={<Link2 className="h-5 w-5" />}
      label="Copy link"
      onClick={() => {
        onCopyLink();
        onClose();
      }}
    />
  );
  if (!isOwner) {
    tiles.push(<Tile key="hide" icon={<EyeOff className="h-5 w-5" />} label="Not interested" onClick={onNotInterested} />);
  }
  if (canAct) {
    tiles.push(<Tile key="mute" disabled={busy} icon={<VolumeX className="h-5 w-5" />} label="Mute" onClick={() => hideAuthor('mute')} />);
    tiles.push(<Tile key="block" disabled={busy} icon={<Ban className="h-5 w-5" />} label="Block" onClick={() => hideAuthor('block')} />);
  }

  const statItems = [
    { key: 'views', icon: <Eye className="mx-auto h-4 w-4" />, label: 'Views', value: stats.views },
    { key: 'likes', icon: <Heart className="mx-auto h-4 w-4" />, label: 'Likes', value: stats.likes },
    { key: 'comments', icon: <MessageCircle className="mx-auto h-4 w-4" />, label: 'Comments', value: stats.comments },
    { key: 'reposts', icon: <Repeat2 className="mx-auto h-4 w-4" />, label: 'Reposts', value: stats.reposts },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-md rounded-t-3xl border border-stone-900/10 bg-[#f7f5f2] pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-stone-900/20" />

        <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-stone-900/10 bg-white p-3">
          {post.image_url && <img src={post.image_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-stone-900">
              {name} <span className="font-normal text-stone-500">@{handle}</span>
            </p>
            <p className="truncate text-xs text-stone-500">{preview || '(image post)'}</p>
          </div>
        </div>

        {reporting ? (
          <div className="mx-4 mt-3 space-y-2">
            <p className="text-xs font-bold text-stone-500">Why are you reporting this post?</p>
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                disabled={busy}
                onClick={() => sendReport(r)}
                className="w-full rounded-2xl border border-stone-900/10 bg-white py-3 text-sm font-semibold text-stone-900 disabled:opacity-50"
              >
                {r}
              </button>
            ))}
            <button type="button" onClick={() => setReporting(false)} className="w-full py-2 text-sm font-semibold text-stone-500">
              Back
            </button>
          </div>
        ) : (
          <>
            <div className="mx-4 mt-3 grid grid-cols-3 gap-2">{tiles}</div>

            {isOwner && !isQuote && showStats && (
              <div className="mx-4 mt-3 grid grid-cols-4 gap-2 rounded-2xl border border-stone-900/10 bg-white p-3 text-center">
                {statItems.map((s) => (
                  <div key={s.key} className="text-stone-500">
                    {s.icon}
                    <p className="mt-1 text-base font-black text-stone-900">{s.value}</p>
                    <p className="text-[10px]">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {notice && <p className="mx-4 mt-3 text-center text-xs font-semibold text-[#f97316]">{notice}</p>}

            <div className="mx-4 mt-3">
              {isOwner ? (
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 py-3 text-sm font-bold text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                  {isQuote ? 'Delete quote' : 'Delete post'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setReporting(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 py-3 text-sm font-bold text-rose-600"
                >
                  <Flag className="h-4 w-4" />
                  Report post
                </button>
              )}
              <button type="button" onClick={onClose} className="mt-1 w-full py-3 text-sm font-semibold text-stone-500">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
