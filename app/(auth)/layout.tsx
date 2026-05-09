export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Personal OS</h1>
          <p className="mt-1 text-sm text-secondary">Your personal operating system</p>
        </div>
        {children}
      </div>
    </main>
  );
}
