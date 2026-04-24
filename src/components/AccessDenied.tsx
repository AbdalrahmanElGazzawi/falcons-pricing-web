export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="min-h-screen grid place-items-center p-6 bg-bg">
      <div className="card card-p max-w-md text-center">
        <h2 className="text-lg font-semibold mb-2">Access denied</h2>
        <p className="text-sm text-label">{message || 'Your account is not yet activated or lacks the required role. Ask your admin.'}</p>
      </div>
    </div>
  );
}
