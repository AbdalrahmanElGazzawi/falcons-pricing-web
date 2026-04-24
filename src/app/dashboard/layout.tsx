// Deliberate passthrough — auth handled per-page via requireStaff().
export default function Passthrough({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
