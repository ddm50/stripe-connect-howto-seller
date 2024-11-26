# Creating a marketplace with Stripe Connect: The onboard process

Creating a marketplace probably would be too hard, or impossible considering that not many payment processors offer it, if they do not offer it then you would be likely booted off the platform the moment they got wind of it, and even without that it is risky to create a marketplace where you don't have a solid foundation to handle payments, refunds and payouts to the sellers using the platform.


Stripe Connect addresses these issues, it will allow us to create a basic marketplace where you can sign up to be  a seller, and customers can purchase items from these sellers with ease. As a platform owner you can also set your service fee, so when user X purchases from store Y then we'll get X% cut of that transaction but more on that later.


![images (1).png](https://collected-notes.s3.us-west-2.amazonaws.com/uploads/29005/37803b17-c7b8-44f1-8729-6ee17ebc3abb)

## Setting up the project

For handling the database connection we are using Prisma, authentication is being handled by remix-auth, for this part we are solely handling the seller's side of the marketplace.


```js

// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Store {
  id         String   @id // This will be the store's subdomain
  name       String
  updated_at DateTime @default(now()) @updatedAt
  seller     Seller?
}

model Seller {
  id           Int      @id @default(autoincrement())
  email        String
  password     String
  store        Store    @relation(fields: [store_id], references: [id])
  date_created DateTime @default(now())
  date_updated DateTime @updatedAt
  store_id     String   @unique
}
```

This is what our schema.prisma file looks like, we have a Seller model and a Store model related to it, the "id" field will serve as the subdomain so when we get to the buyer's side I will be able to visit at store.localhost.com and purchase the products from the seller there.
And we'll also add a Stripe model, which will store data about the seller's Connect account.

```
model Stripe {
  account_id String @id
  is_onboarded Boolean @default(false)
  user Users @relation(fields: [user_id], references: [discord_id])
  user_id String @unique
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}

model Seller {
  id           Int      @id @default(autoincrement())
  email        String
  password     String
  store        Store    @relation(fields: [store_id], references: [id])
  date_created DateTime @default(now())
  date_updated DateTime @updatedAt
  store_id     String   @unique
  stripe       Stripe?
}
```

Now we can deal with onboarding the user, so let's define another variable in our .env file. 

```
STRIPE_SK=your stripe secret key here
```
You may get the Stripe secret key by generating it in Stripe's dev page, it is a good idea to create a restricted key that will for now only allow the use of Stripe Connect.

Then you will need to create a new file which will export the Stripe client so it can be used by our routes

```js
// app/libs/stripe.server.ts
import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SK)
```

We'll create a new route that will be at "/onboarding"

```js
// app/routes/onboarding.tsx

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
                <div className={'bg-blue-600 rounded-[6px] px-4 py-1.5'}>Seller dashboard</div>

            </>}
        </div>
    </div>
}
```

We'll add a loader function which will pass the data concerning seller's onboarding status

```js
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
```

Now if you go to /onboarding it would say that you are not connected, and you'll be able to press a button to sign up, this is where our action function comes in

```js
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
```

When the seller presses the button we'll create an account with the email they signed up with, then we'll create an Account Link which will redirect them to an onboarding page, if the seller already has a Stripe account attached but is not onboarded, then we also redirect them to the onboarding link.

![Capture.PNG](https://collected-notes.s3.us-west-2.amazonaws.com/uploads/29005/21a9acff-f49b-4e8b-9ccf-b7e3c237ddbe)

From there the seller will enter his email/phone number, and the onboarding process will begin, Stripe will usually ask the seller for location of the business, business details, bank accounts etc... 

Now we can listen to webhooks for Stripe Connect events, so when a seller has onboarded successfully we'll add those attributes to the Seller's record in the database.

For testing, you can simply download Stripe CLI and from there you can forward any events to our new route /api/notifications which we will create now

```js
stripe listen --forward-to localhost:5173/api/notifications
```

When you run that command you will be given a webhook signature, so that we may verify the integrity of each webhook sent to us by Stripe, equally if you create a webhook on the developer portal on Stripe you'll have a secret.

```
Ready! You are using Stripe API Version [2020-03-02]. Your webhook signing secret is whsec_SECRET
```

We'll also add a new variable in the .env file

```
WEBHOOK_SECRET=whsec_SECRET
```

Now we can write the code to handle these events being sent to us by Stripe

```js
import {ActionFunctionArgs} from "@remix-run/node";
import {stripe} from "~/libs/stripe.server";
import Stripe from "stripe";

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

}
```

We verify that it's Stripe sending the request, if it is then we move on, now the event we want to look out for is account.updated, that event is related to the Account we created before redirecting the seller. 

When a seller starts the onboarding process, adds his phone number, or enters the email, or finally completes the onboarding process we'll get the 'account.updated' event and that will have this array sent with it
> account.requirements.currently_due

When 'currently_due' array's length is at zero then we know the user is fully onboarded, able to accept payments and so from our side we can update the database and allow the user to create products, but before we do that let's add this logic in the '/api/notifications' action

```js
if (event.type === 'account.updated') {
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
```

Once that is in place we can try onboarding and see if it works. As soon as you enter the address for example, you will see a message in the console of the project such as
```
[WEBHOOK] Handling account.updated event
```
So that means that the body is validated and we are successfully receiving events from Stripe, but let's see if onboarding will work. 

Once you get to the final step it'll probably say that your account details are incomplete, the last step is ID verification, since this is test mode we can simulate that

![Capture.PNG](https://collected-notes.s3.us-west-2.amazonaws.com/uploads/29005/bd6f0e75-4cef-4f80-9239-979cdc2deac0)

Okay so once we have done that we'll return to the previous page and we can press submit, press submit and we'll get in the console

```js
[WEBHOOK] Account acct_1QPUWnPunrQwLVEX is fully onboarded
```
That works, now Stripe will return us to the onboarding page and it'll show us our account ID which means we have successfully onboarded and we can start creating products.

![onboarding.PNG](https://collected-notes.s3.us-west-2.amazonaws.com/uploads/29005/af3559ec-33df-4487-a378-4cc086434e50)

Alright, let's just make that seller dashboard button functional before we move on to products, create a new route which will be at /portal 

```js
// app/routes/portal.ts

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
```

Very basic function, so now when you go to /portal if you are onboarded you'll be redirected to the one-use link we generate for the Stripe Account. 

In the onboarding route we'll make wrap the Seller dashboard div with a Link.

```js
<Link to={`/portal`}> <div className={'bg-blue-600 rounded-[6px] px-4 py-1.5'}>Seller dashboard</div> </Link>
```

When we visit /portal or press the button we'll be redirected to Stripe's Portal for Connect accounts, there the user can see his analytics, payouts etc...

![split.PNG](https://collected-notes.s3.us-west-2.amazonaws.com/uploads/29005/114f3d31-b753-41be-8ee1-574108940bc0)

This marks the end of part one of our creating a marketplace with Stripe Connect, part two will deal with products, payments and payouts, part three will be the final and there we'll deal with the customer facing side of the project.

You can see the source code of the project at https://github.com/ddm50/stripe-connect-howto-seller
