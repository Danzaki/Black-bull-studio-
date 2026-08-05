type AuthPageNoticeProps = {
  children: string;
};

export function AuthPageNotice({ children }: AuthPageNoticeProps) {
  return (
    <div className="rounded-3xl border border-amber-400/15 bg-amber-400/5 px-5 py-4 text-sm text-amber-100 shadow-sm shadow-amber-500/10">
      {children}
    </div>
  );
}
