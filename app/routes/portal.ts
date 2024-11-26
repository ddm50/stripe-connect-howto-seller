import {LoaderFunctionArgs, redirect} from "@remix-run/node";
import {authenticator} from "~/services/authentication.server";
import {prisma} from "~/services/db.server";
import {stripe} from "~/libs/stripe.server";

export async function loader({request}: LoaderFunctionArgs) {
    const authenticated = await authenticator.isAuthenticated(request, {
        failureRedirect: '/login'
    })

    const seller = await prisma.seller.findFirstOrThrow({
        where: {
            id: authenticated.id
        }, include: {
            stripe: true
        }
    })
    if (!seller.stripe) throw new Response(null, {
        status: 400
    })
    const loginLink = await stripe.accounts.createLoginLink(seller.stripe.account_id);
    return redirect(loginLink.url)
}