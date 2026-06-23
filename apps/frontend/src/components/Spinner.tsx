export function Spinner({ full = false }: { full?: boolean }) {
  const spinner = (
    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-brand-600" />
  );
  if (full) {
    return <div className="flex h-screen items-center justify-center bg-slate-100">{spinner}</div>;
  }
  return <div className="flex justify-center p-8">{spinner}</div>;
}
