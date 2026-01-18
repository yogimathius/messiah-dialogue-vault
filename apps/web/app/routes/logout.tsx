import { type ActionFunctionArgs, redirect } from "react-router";
import { logout } from "~/services/auth";

export async function action({ request }: ActionFunctionArgs) {
  const result = await logout(request);
  return redirect("/login", {
    headers: result.headers,
  });
}

export async function loader() {
  return redirect("/");
}
