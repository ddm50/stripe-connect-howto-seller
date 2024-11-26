import {ActionFunctionArgs, json, LoaderFunctionArgs, redirect} from "@remix-run/node";
import {authenticator} from "~/services/authentication.server";
import {prisma} from "~/services/db.server";
import {Form, Link, useLoaderData} from "@remix-run/react";
import {stripe} from "~/libs/stripe.server";

export default function Onboarding() {
    const {stripe} = useLoaderData();

    return <div className={'text-center pt-[6%]'}>
    <h1 className={'text-xl'}>Account onboarded: {stripe?.is_onboarded ? stripe?.account_id : '🔴 Not connected'}</h1>
        <div className={'flex items-center  text-white text-sm  mt-5 justify-center gap-3'}>
            {!stripe ? <>
                <Form method={'post'}>
                    <button type={'submit'} className={'bg-blue-600 hover:cursor-pointer  rounded-[6px] px-4 py-1.5'}>Setup your seller
                        account
                    </button>

                </Form>
            </> : <>
                <Link to={`/portal`}>
                    <div className={'bg-blue-600 rounded-[6px] px-4 py-1.5'}>Seller dashboard</div>

                </Link>
            </>}
        </div>
    </div>
}

export async function action({request}: ActionFunctionArgs) {
    const authenticated = await authenticator.isAuthenticated(request, {
        failureRedirect: '/login'
    })
    const seller = await prisma.seller.findFirst({
        where: {
            id: authenticated.id
        }, include: {
            stripe: true
        }
    })
    if (seller && seller.stripe?.is_onboarded) {
        return json({
            message: 'User is onboarded already',
            error: true
        }, {
            status: 400
        })
    }
    const account = seller?.stripe?.account_id ? {
        id: seller.stripe?.account_id
    } : await stripe.accounts.create({
        email: seller?.email,
        controller: {
            fees: {
                payer: 'application',
            },
            losses: {
                payments: 'application',
            },
            stripe_dashboard: {
                type: 'express',
            },
        },
    });
    if (!seller?.stripe?.account_id) {
        await prisma.seller.update({
            where: {
                id: authenticated.id
            },
            data: {
                stripe: {
                    create: {
                        account_id: account.id
                    }
                }
            }, include: {
                stripe: true
            }
        })
    }
    const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: 'http://localhost:5173/onboarding',
        return_url: 'http://localhost:5173/onboarding',
        type: 'account_onboarding',
        collection_options: {
            fields: 'eventually_due',
        },
    });
    console.debug(`[ACCOUNT ID = ${account.id}] CREATED ACCOUNT ONBOARDING LINK, REDIRECTING...`)

    return redirect(accountLink.url)



}

export async function loader({request}: LoaderFunctionArgs) {
    const user = await authenticator.isAuthenticated(request, {
        failureRedirect: '/login'
    })

    const seller = await prisma.seller.findFirst({
        where: {
            id: user.id
        }, include: {
            stripe: true
        }
    })

    return {
        stripe: seller?.stripe
    }
}