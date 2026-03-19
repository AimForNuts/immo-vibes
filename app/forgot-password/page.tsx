import { redirect } from "next/navigation";

// Password recovery is not yet implemented — send to the WIP page.
export default function ForgotPasswordPage() {
  redirect("/wip");
}
