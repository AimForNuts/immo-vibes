import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [username()],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        input: false,
      },
      idlemmoToken: {
        type: "string",
        required: false,
        input: false,
      },
      idlemmoCharacterId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
