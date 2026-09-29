export function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-8 rounded-full px-[13px] text-[15px] ${
        on ? "bg-accent text-on-accent" : "bg-card text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
