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
      className={`h-9 rounded-full px-3.5 text-[15px] ${
        on ? "bg-accent text-on-accent" : "bg-card text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
