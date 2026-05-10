import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <Image
            src="/icon-mark.png"
            alt=""
            width={40}
            height={40}
            priority
            className="h-10 w-10"
          />
          <span className="text-2xl font-semibold tracking-tight text-primary">
            Personal OS
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}
