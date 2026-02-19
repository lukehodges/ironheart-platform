import { redirect } from "next/navigation";
import { getSignInUrl } from "@workos-inc/authkit-nextjs";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ return_path?: string }>;
}) {
  const params = await searchParams;
  const returnPathname = params.return_path ?? "/";

  // getSignInUrl builds the WorkOS-hosted auth URL.
  // We encode returnPathname in state so that handleAuth() in the callback
  // route can redirect the user back to the page they were trying to reach.
  const signInUrl = await getSignInUrl({
    state: returnPathname,
  });

  redirect(signInUrl);
}
