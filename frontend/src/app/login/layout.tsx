import type { ReactNode } from 'react';

// Auth pages get their own layout — no Navbar or Footer
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
