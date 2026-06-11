import "server-only";

import { currentUser } from "@clerk/nextjs/server";

const WATERLOO_EMAIL_SUFFIX = "@uwaterloo.ca";

export class AccessError extends Error {
  status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "AccessError";
    this.status = status;
  }
}

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export function getVerifiedWaterlooEmail(user: ClerkUser | null): string | null {
  if (!user) {
    return null;
  }

  const waterlooEmail = user.emailAddresses.find((email) => {
    const address = email.emailAddress.trim().toLowerCase();
    return (
      email.verification?.status === "verified" &&
      address.endsWith(WATERLOO_EMAIL_SUFFIX)
    );
  });

  return waterlooEmail?.emailAddress.trim().toLowerCase() ?? null;
}

export function hasVerifiedWaterlooEmail(user: ClerkUser | null): boolean {
  return getVerifiedWaterlooEmail(user) !== null;
}

export async function requireWaterlooUser(): Promise<ClerkUser> {
  const user = await currentUser();

  if (!user) {
    throw new AccessError(401, "Sign in is required.");
  }

  if (!hasVerifiedWaterlooEmail(user)) {
    throw new AccessError(
      403,
      "A verified University of Waterloo email is required."
    );
  }

  return user;
}

export async function requireWaterlooIdentity(): Promise<{
  user: ClerkUser;
  clerkUserId: string;
  waterlooEmail: string;
}> {
  const user = await requireWaterlooUser();
  const waterlooEmail = getVerifiedWaterlooEmail(user);

  if (!waterlooEmail) {
    throw new AccessError(
      403,
      "A verified University of Waterloo email is required."
    );
  }

  return {
    user,
    clerkUserId: user.id,
    waterlooEmail,
  };
}
