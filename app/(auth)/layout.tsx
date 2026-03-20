import { Dumbbell } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12">
      <div className="flex items-center gap-2 mb-8">
        <Dumbbell className="size-6 text-foreground" />
        <span className="text-xl font-semibold tracking-tight">FitCoach Pro</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
