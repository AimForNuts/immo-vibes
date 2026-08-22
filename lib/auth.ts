import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username, admin } from "better-auth/plugins";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendPasswordResetEmail } from "@/lib/services/password-reset-email";

type AuthCloudflareEnv = {
  IMMO_SYNC_DB?: unknown;
};

function getAuthDatabase() {
  try {
    const d1 = (getCloudflareContext().env as AuthCloudflareEnv).IMMO_SYNC_DB;
    if (d1) return d1;
  } catch {
    // Node-based local development and build steps keep using the Neon adapter.
  }

  return drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  });
}

export const auth = betterAuth({
  database: getAuthDatabase(),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl: url,
      });
    },
    revokeSessionsOnPasswordReset: true,
  },
  plugins: [username(), admin()],
  user: {
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    additionalFields: {
      username: {
        type: "string",
        required: false,
        input: false,
      },
      displayUsername: {
        type: "string",
        required: false,
        input: false,
        fieldName: "display_username",
      },
      role: {
        type: "string",
        required: false,
        input: false,
      },
      idlemmoToken: {
        type: "string",
        required: false,
        input: false,
        fieldName: "idlemmo_token",
      },
      idlemmoCharacterId: {
        type: "string",
        required: false,
        input: false,
        fieldName: "idlemmo_character_id",
      },
    },
  },
  session: {
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      userId: "user_id",
    },
  },
  account: {
    fields: {
      accountId: "account_id",
      providerId: "provider_id",
      userId: "user_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
});

export type Session = typeof auth.$Infer.Session;
