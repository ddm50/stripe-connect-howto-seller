import type {LoaderFunctionArgs, MetaFunction} from "@remix-run/node";
import {useLoaderData} from "@remix-run/react";
import {authenticator} from "~/services/authentication.server";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  const {user} = useLoaderData()
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-16">
        <header className="flex flex-col items-center gap-9">
          <h1 className="leading text-2xl font-bold text-gray-800">
            You are logged in as: {user?.email}
          </h1>
        </header>
     
      </div>
    </div>
  );
}

export async function loader({request}: LoaderFunctionArgs) {
  let user = await authenticator.isAuthenticated(request, {
    failureRedirect: '/login'
  })
  return {
    user
  }
}
