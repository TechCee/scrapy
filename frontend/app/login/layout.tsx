import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Trustle",
  description: "Sign in to access the Trustle portal",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
