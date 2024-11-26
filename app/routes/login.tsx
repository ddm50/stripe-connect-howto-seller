import {Form, Link} from "@remix-run/react";
import {authenticator} from "~/services/authentication.server";
import {ActionFunctionArgs} from "@remix-run/node";

export default function Login( ) {
    return <>
        <h1 className={'text-2xl font-bold text-center pt-16'}>Stripe Connect Example</h1>
        <div
            className="w-full bg-white m-auto mt-[2%] rounded-lg shadow sm:max-w-md xl:p-0 ">

            <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
                <h1 className="text-xl font-semibold leading-tight tracking-tight text-gray-900 md:text-2xl ">
                    Sign in to your account
                </h1>
                <Form method={'post'} className="space-y-4 md:space-y-6" action="#">
                    <div>
                        <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 ">Your
                            email</label>
                        <input type="email" name="email" id="email"
                               className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full text-sm p-2.5 "
                               placeholder="name@company.com" required=""/>
                    </div>
                    <div>
                        <label htmlFor="password"
                               className="block mb-2 text-sm font-medium text-gray-900">Password</label>
                        <input type="password" name="password" id="password" placeholder="••••••••"
                               className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full text-sm p-2.5"
                               required=""/>
                    </div>

                    <button type="submit"
                            className="w-full text-white bg-blue-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center ">Sign
                        in
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

export async function action({  request }: ActionFunctionArgs) {
    return await authenticator.authenticate("form", request, {
        successRedirect: "/",
        failureRedirect: "/login",
    });
}