import { ReactNode } from "react";

// Native apps are already installed; this feature is web-only.
export function PwaProvider({ children }: { children: ReactNode }) { return <>{children}</>; }
export function InstallButton(_props: { onSelect?: () => void }) { return null; }
export function InstallBanner() { return null; }
