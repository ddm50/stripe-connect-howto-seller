import {Form, Link} from "@remix-run/react";
import {zx} from "zodix";
import {z} from "zod";
import {ActionFunctionArgs, redirect} from "@remix-run/node";
import {prisma} from "~/services/db.server";
import {commitSession, sessionStorage} from "~/services/session.server";

export default function Login( ) {
    return <>
        <h1 className={'text-2xl font-bold text-center pt-16'}>Stripe Connect Example</h1>
        <div
            className="w-full bg-white m-auto mt-[2%] rounded-lg shadow sm:max-w-md xl:p-0 ">

            <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
                <h1 className="text-xl font-semibold leading-tight tracking-tight text-gray-900 md:text-2xl ">
                    Create a seller account
                </h1>
                <Form method={'post'} className="space-y-4 md:space-y-6" action="#">
                    <div>
                        <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 ">Your
                            email</label>
                        <input type="email" name="username" id="email"
                               className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full text-sm p-2.5 "
                               placeholder="name@company.com" required=""/>
                    </div>
                    <div>
                        <label htmlFor="password"
                               className="block mb-2 text-sm font-medium text-gray-900">Password</label>
                        <input type="password" name="password" id="password" placeholder="••••••••"
                               className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full text-sm p-2.5"
                               />
                    </div>
                    <div>
                        <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 ">Store name</label>
                        <input name="store_name"
                               className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full text-sm p-2.5 "
                               placeholder="Store123" />
                    </div>

                    <button type="submit"
                            className="w-full text-white bg-blue-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center ">
                        Register
                    </button>
                    <p className="text-sm text-center font-light text-gray-500">
                        Don’t have an account yet? <Link to="/register"
                                                         className="font-medium text-blue-600 hover:underline">Sign
                        up</Link>
                    </p>
                </Form>
            </div>
        </div>
    </>
}

export async function action({request}: ActionFunctionArgs) {
    const {username, password, store_name} = await zx.parseForm(request, {
        username: z.string().email(),
        password: z.string().min(6),
        store_name: z.string()
    });

    const seller = await prisma.seller.create({
        data: {
            email:username,
            password,
           store: {
                create: {
                    id: store_name,
                    name: store_name
                }
           }
        }, select: {
            email: true,
            id: true
        }
    })

    const session = await sessionStorage.getSession(request.headers.get("cookie"));
    session.set("user", seller);

    // commit the session
    const headers = new Headers({ "Set-Cookie": await commitSession(session) });

    return redirect("/dashboard", { headers });

};