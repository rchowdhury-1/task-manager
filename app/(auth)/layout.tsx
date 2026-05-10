import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo-light.png"
            alt="Personal OS"
            width={220}
            height={49}
            priority
            className="block dark:hidden h-12 w-auto"
          />
          <Image
            src="/logo-dark.png"
            alt="Personal OS"
            width={220}
            height={49}
            priority
            className="hidden dark:block h-12 w-auto"
          />
        </div>
        {children}
      </div>
    </main>
  );
}
