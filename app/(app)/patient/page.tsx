import { UserDashboard } from "@/components/recovery/UserDashboard";
import { auth } from "@/auth"
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth();

  if (session && !session.user.doneOnboarding) {
    redirect("/patient/info");
  }
  return <UserDashboard />;
}
