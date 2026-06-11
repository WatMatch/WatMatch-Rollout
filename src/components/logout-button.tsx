"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function LogoutButton({
  className,
  children = "Logout",
}: LogoutButtonProps) {
  const { signOut } = useClerk();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      className={className}
      onClick={async () => {
        setLoading(true);
        await signOut({ redirectUrl: "/sign-in" });
      }}
    >
      {loading ? "Logging out..." : children}
    </button>
  );
}
