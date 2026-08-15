export function MentionText({ text }: { text: string }) {
  const parts = text.split(/(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('@') || part.startsWith('#')) {
          return (
            <span key={i} className="cursor-pointer font-medium text-[#f5b942] hover:underline">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
