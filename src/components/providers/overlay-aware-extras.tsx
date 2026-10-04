"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { CallProviderGate } from "@/components/call/call-provider-gate";
import { isObsOverlayPath } from "@/lib/obs-overlay-path";

const PlatformBootstrapClient = dynamic(
  () =>
    import("@/components/platform-bootstrap-client").then((m) => m.PlatformBootstrapClient),
  { ssr: false }
);

const AddAccountFlowHandler = dynamic(
  () => import("@/components/auth/add-account-flow-handler").then((m) => m.AddAccountFlowHandler),
  { ssr: false }
);

const PushRegistration = dynamic(
  () => import("@/components/push/push-registration").then((m) => m.PushRegistration),
  { ssr: false }
);

const CheckoutResumeHandler = dynamic(
  () =>
    import("@/components/payments/checkout-resume-handler").then((m) => m.CheckoutResumeHandler),
  { ssr: false }
);

const OperatorSiteMfaGate = dynamic(
  () => import("@/components/auth/operator-site-mfa-gate").then((m) => m.OperatorSiteMfaGate),
  { ssr: false }
);

const AdminSessionAutoLogout = dynamic(
  () =>
    import("@/components/auth/admin-session-auto-logout").then((m) => m.AdminSessionAutoLogout),
  { ssr: false }
);

const NativePushRegistration = dynamic(
  () =>
    import("@/components/push/native-push-registration").then((m) => m.NativePushRegistration),
  { ssr: false }
);

const StaleDeploymentRecovery = dynamic(
  () =>
    import("@/components/providers/stale-deployment-recovery").then((m) => m.StaleDeploymentRecovery),
  { ssr: false }
);

/** Site chrome (calls, MFA, toasts) must not paint over OBS overlays. */
export function OverlayAwareExtras({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isObsOverlayPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <StaleDeploymentRecovery />
      <PushRegistration />
      <NativePushRegistration />
      <CheckoutResumeHandler />
      <CallProviderGate>
        <PlatformBootstrapClient />
        <AddAccountFlowHandler />
        <AdminSessionAutoLogout />
        <OperatorSiteMfaGate />
        {children}
      </CallProviderGate>
    </>
  );
}
