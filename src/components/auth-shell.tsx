import Image from "next/image";

export const watmatchAuthAppearance = {
  layout: {
    logoPlacement: "none",
    unsafe_disableDevelopmentModeWarnings: true,
  },
  variables: {
    colorPrimary: "#0f172a",
    colorBackground: "#ffffff",
    colorText: "#0f172a",
    colorTextSecondary: "#475569",
    colorInputBackground: "#ffffff",
    colorInputText: "#0f172a",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "mx-auto w-full",
    cardBox: "mx-auto w-full max-w-md shadow-xl shadow-slate-900/10",
    card: "border border-slate-200 bg-white",
    headerTitle: "text-slate-950",
    headerSubtitle: "text-slate-500",
    formFieldInput:
      "rounded-md border-slate-200 bg-white text-slate-950 focus:ring-slate-300",
    formButtonPrimary:
      "rounded-md bg-slate-900 text-white shadow-sm hover:bg-slate-700",
    footerActionLink: "text-slate-900 hover:text-slate-700",
    identityPreviewEditButton: "text-slate-700",
  },
} as const;

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo-horizontal.png"
            alt="WatMatch"
            width={280}
            height={78}
            priority
            className="h-14 w-auto"
          />
        </div>

        {children}
      </section>
    </main>
  );
}
