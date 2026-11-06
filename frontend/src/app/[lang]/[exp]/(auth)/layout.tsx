/** Sign-in, sign-up, verify and reset: a focused page with no site header or footer. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main id="main">{children}</main>;
}
