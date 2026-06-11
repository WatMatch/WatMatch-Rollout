import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { PastCapstonesBrowser } from "@/components/past-capstones-browser";
import { hasVerifiedWaterlooEmail } from "@/lib/auth";

export default async function HomePage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (!hasVerifiedWaterlooEmail(user)) {
    redirect("/restricted");
  }

  return <PastCapstonesBrowser />;
}
