import { Stripe } from "stripe";

export async function POST(request: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || secretKey.startsWith("your_")) {
      return new Response(
        JSON.stringify({
          error:
            "Stripe secret key is missing. Set STRIPE_SECRET_KEY to a valid key from your Stripe dashboard.",
        }),
        { status: 500 },
      );
    }

    const stripe = new Stripe(secretKey);
    const body = await request.json();
    const { payment_method_id, payment_intent_id, customer_id, client_secret } =
      body;

    if (!payment_method_id || !payment_intent_id || !customer_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 },
      );
    }

    const paymentMethod = await stripe.paymentMethods.attach(
      payment_method_id,
      { customer: customer_id },
    );

    const result = await stripe.paymentIntents.confirm(payment_intent_id, {
      payment_method: paymentMethod.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment successful",
        result: result,
      }),
    );
  } catch (error: any) {
    console.error("Error paying:", error);
    const status = (error as any)?.statusCode === 401 ? 401 : 500;
    const message =
      status === 401
        ? "Stripe authentication failed. Update STRIPE_SECRET_KEY."
        : "Internal Server Error";
    return new Response(
      JSON.stringify({ error: message, detail: error?.message }),
      {
        status,
      },
    );
  }
}
