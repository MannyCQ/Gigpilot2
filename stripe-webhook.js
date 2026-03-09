// api/stripe-webhook.js
// Vercel serverless function — handles Stripe webhook events
//
// Setup:
// 1. In Stripe Dashboard → Developers → Webhooks → Add endpoint
//    URL: https://your-app.vercel.app/api/stripe-webhook
//    Events: checkout.session.completed, customer.subscription.deleted, customer.subscription.updated
// 2. Copy the webhook signing secret → STRIPE_WEBHOOK_SECRET in Vercel env vars
// 3. Add STRIPE_SECRET_KEY to Vercel env vars

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for server-side writes
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  if (!STRIPE_SECRET || !WEBHOOK_SECRET) {
    return res.status(500).json({ error: "Stripe not configured" });
  }

  let stripe;
  try {
    const { default: Stripe } = await import("stripe");
    stripe = new Stripe(STRIPE_SECRET);
  } catch (e) {
    return res.status(500).json({ error: "Failed to load Stripe" });
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerEmail = session.customer_email || session.customer_details?.email;
        const plan = session.metadata?.plan || "artist";

        if (customerEmail) {
          // Find user by email and update their subscription
          const { data: authUser } = await supabase.auth.admin.listUsers();
          const user = authUser?.users?.find(u => u.email === customerEmail);

          if (user) {
            await supabase.from("subscriptions").upsert({
              user_id: user.id,
              plan,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabase.from("subscriptions")
          .update({ plan: "free", stripe_subscription_id: null })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const status = sub.status;
        if (status === "active") {
          // Subscription renewed or changed — status stays as is
        } else if (status === "canceled" || status === "unpaid") {
          await supabase.from("subscriptions")
            .update({ plan: "free" })
            .eq("stripe_subscription_id", sub.id);
        }
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
}
