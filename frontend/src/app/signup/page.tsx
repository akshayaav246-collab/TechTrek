import { redirect } from 'next/navigation';

// All auth is handled on /login page (toggle tabs)
export default function SignupRedirect({ searchParams }: { searchParams: { redirect?: string } }) {
  const r = searchParams.redirect ? `?redirect=${searchParams.redirect}` : '';
  redirect(`/login${r}`);
}
