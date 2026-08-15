type PasswordResetEmail = {
  to: string;
  resetUrl: string;
};

function getAppName() {
  return "ImmoWeb Suite";
}

async function sendWithResend({ to, resetUrl }: PasswordResetEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PASSWORD_RESET_EMAIL_FROM;

  if (!apiKey || !from) {
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `${getAppName()} password reset`,
      text: [
        "We received a request to reset your password.",
        "",
        `Reset your password: ${resetUrl}`,
        "",
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend password reset email failed (${res.status}): ${body}`);
  }

  return true;
}

export async function sendPasswordResetEmail(email: PasswordResetEmail) {
  if (await sendWithResend(email)) {
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(`[auth] Password reset link for ${email.to}: ${email.resetUrl}`);
    return;
  }

  throw new Error("Password reset email is not configured. Set RESEND_API_KEY and PASSWORD_RESET_EMAIL_FROM.");
}
