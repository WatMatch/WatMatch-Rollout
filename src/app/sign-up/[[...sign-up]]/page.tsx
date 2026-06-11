import { SignUp } from "@clerk/nextjs";
import { AuthShell, watmatchAuthAppearance } from "@/components/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        appearance={watmatchAuthAppearance}
      />
    </AuthShell>
  );
}
