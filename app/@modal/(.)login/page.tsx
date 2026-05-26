import { LoginModal } from "@/components/shared/login-modal";

export default async function InterceptedLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string; intent?: string }>;
}) {
  const { error, returnTo, intent } = await searchParams;
  return <LoginModal error={error} returnTo={returnTo} intent={intent} />;
}
