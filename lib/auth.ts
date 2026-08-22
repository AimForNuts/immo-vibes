import { betterAuth } from "better-auth";
import { username, admin } from "better-auth/plugins";
import { getD1 } from "@/lib/db/d1";
import { sendPasswordResetEmail } from "@/lib/services/password-reset-email";

function createAuth() {
  return betterAuth({
    database: getD1(),
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
}

type AuthInstance = ReturnType<typeof createAuth>;

let authInstance: AuthInstance | null = null;

function getAuthInstance(): AuthInstance {
  authInstance ??= createAuth();
  return authInstance;
}

export const auth = new Proxy({} as AuthInstance, {
  get(_target, prop, receiver) {
    return Reflect.get(getAuthInstance(), prop, receiver);
  },
});

export type Session = typeof auth.$Infer.Session;
