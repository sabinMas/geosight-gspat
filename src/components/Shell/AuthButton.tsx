"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div
        className="inline-flex h-8 items-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 opacity-50"
        aria-hidden="true"
      >
        <span className="text-xs text-[var(--muted-foreground)]">...</span>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="rounded-full"
        onClick={() => void signIn()}
        title="Sign in to sync saved sites across devices"
      >
        <LogIn className="mr-1.5 h-3.5 w-3.5" />
        Sign in to sync
      </Button>
    );
  }

  // authenticated
  const displayName =
    session?.user?.name?.split(" ")[0] ?? session?.user?.email ?? "Signed in";

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="inline-flex h-8 items-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)] px-3 text-xs text-[var(--foreground-soft)] cursor-default select-none"
        title={session?.user?.email ?? undefined}
      >
        {displayName}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-full"
        onClick={() => void signOut()}
        title="Sign out"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="sr-only">Sign out</span>
      </Button>
    </div>
  );
}
