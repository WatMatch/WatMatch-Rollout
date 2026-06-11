import { SignIn } from "@clerk/nextjs";
import { AuthShell, watmatchAuthAppearance } from "@/components/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        appearance={watmatchAuthAppearance}
      />
    </AuthShell>
  );
}
