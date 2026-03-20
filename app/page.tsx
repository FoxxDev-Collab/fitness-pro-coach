import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user) redirect("/login");

  if (session.user.role === "ADMIN") redirect("/admin/dashboard");
  if (session.user.role === "CLIENT") redirect("/dashboard");
  redirect("/clients");
}
