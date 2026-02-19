import { redirect } from "next/navigation";
import { signOut } from "@workos-inc/authkit-nextjs";

export default async function SignOutPage() {
  // signOut() invalidates the WorkOS session and clears the session cookie.
  // returnTo is omitted here — the explicit redirect below handles navigation.
  await signOut();
  redirect("/sign-in");
}
