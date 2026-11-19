"use client";

import * as React from "react";
import { AppNavbar } from "@/components/shared/app-navbar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import type { Profile } from "@/types/inventory";

interface AppFrameProps {
  profile: Profile;
  branchName?: string;
  children: React.ReactNode;
}

export const AppFrame: React.FC<AppFrameProps> = ({
  profile,
  branchName,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppNavbar
        profile={profile}
        branchName={branchName}
        onOpenMenu={() => setMobileOpen(true)}
      />
      <div className="flex flex-1">
        <AppSidebar
          role={profile.role}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
        />
        <main className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
