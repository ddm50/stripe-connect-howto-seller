import {ActionFunctionArgs} from "@remix-run/node";
import {stripe} from "~/libs/stripe.server";
import Stripe from "stripe";
import {prisma} from "~/services/db.server";

export const action = async ({request}: ActionFunctionArgs) => {
    const sig = request.headers.get('stripe-signature')
    let event: Stripe.Event;
    const payload = await request.text()

    try {
        event = stripe.webhooks.constructEvent(payload, sig as string, process.env.WEBHOOK_SECRET as string)
    } catch(err) {
        return new Response('Something went wrong...', {
            status: 500,
        })
    }

    if (event.type ==='account.updated') {
        console.log(`[WEBHOOK] Handling account.updated event`);
        try {
            const account = event.data.object;
            const currently_due = account.requirements?.currently_due;
            if (currently_due?.length === 0) {
                console.log(`[WEBHOOK] Account ${account.id} is fully onboarded`);
               await prisma.stripe.update({
                    where: {
                        account_id: account.id,
                    },
                    data: {
                        is_onboarded: true
                    },
                });

            }
        } catch (e) {
            console.error('[WEBHOOK] Error while handling account.updated event:', e);
        }

    }


    return new Response(null, {
        status: 200
    })
}
