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
      className={`h-9 rounded-full border px-3.5 text-sm ${
        on
          ? "border-foreground bg-foreground text-white"
          : "border-line bg-white text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
