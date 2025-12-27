import { Stripe } from "stripe";

export async function POST(request: Request) {
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

  let stripe: Stripe;
  try {
    stripe = new Stripe(secretKey);
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Invalid Stripe secret key. Check STRIPE_SECRET_KEY.",
        message: err?.message,
      }),
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const { name, email, amount } = body;

    if (!name || !email || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
        },
      );
    }

    let customer;
    const doesCustomerExist = await stripe.customers.list({
      email,
    });

    if (doesCustomerExist.data.length > 0) {
      customer = doesCustomerExist.data[0];
    } else {
      const newCustomer = await stripe.customers.create({
        name,
        email,
      });

      customer = newCustomer;
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2024-06-20" },
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(amount) * 100,
      currency: "usd",
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    return new Response(
      JSON.stringify({
        paymentIntent: paymentIntent,
        ephemeralKey: ephemeralKey,
        customer: customer.id,
      }),
    );
  } catch (error: any) {
    console.error("Error creating Stripe payment intent:", error);
    const status = (error as any)?.statusCode === 401 ? 401 : 500;
    const message =
      status === 401
        ? "Stripe authentication failed. Update STRIPE_SECRET_KEY."
        : "Internal Server Error";
    return new Response(
      JSON.stringify({
        error: message,
        detail: error?.message,
      }),
      { status },
    );
  }
}
