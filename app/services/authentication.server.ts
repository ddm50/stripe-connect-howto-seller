import { FormStrategy } from "remix-auth-form";
import bcrypt from 'bcryptjs'
import {Authenticator} from "remix-auth";
import {Seller} from '@prisma/client';
import {sessionStorage} from "~/services/session.server";
import {prisma} from "~/services/db.server";

export type LoginForm = {
    username: string;
    password: string;
};

export async function login({ username, password }: LoginForm) {
    const user = await prisma.seller.findUnique({ where: { email: username } });
    if (!user) return null;
    const isCorrectPassword = await bcrypt.compare(password, user.password);
    if (!isCorrectPassword) return null;
    return user;
}

export let authenticator = new Authenticator<Seller>(sessionStorage);

// Tell the Authenticator to use the form strategy
authenticator.use(
    new FormStrategy(async ({ form }) => {
        let email = form.get("email");
        let password = form.get("password");
        // the type of this user must match the type you pass to the Authenticator
        // the strategy will automatically inherit the type if you instantiate
        // directly inside the `use` method
        return await login(email, password);
    }),
    // each strategy has a name and can be changed to use another one
    // same strategy multiple times, especially useful for the OAuth2 strategy.
    "user-pass"
);