import { Suspense } from "react";
import { PortalLoginForm } from "@/components/portal/portal-login-form";

export const metadata = {
  title: "Log In — Client Portal",
};

export default function PortalLoginPage() {
  return (
    <Suspense>
      <PortalLoginForm />
    </Suspense>
  );
}
