import { Outlet, redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { validateRequest } from "~/services/auth";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await validateRequest(request);
  if (!user) {
    const url = new URL(request.url);
    const redirectTo = url.pathname + url.search;
    throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }
  return { user };
}

export default function ProtectedLayout() {
  return <Outlet />;
}
