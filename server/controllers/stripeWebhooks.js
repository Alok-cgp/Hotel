import stripe from 'stripe';
import Booking from '../models/Booking.js';

export const stripeWebhooks = async (req, res) => {
    console.log("Stripe webhook received");
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log("Event type:", event.type);
    } catch (error) {
        console.error("Webhook signature verification failed:", error.message);
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { bookingId } = session.metadata;

        if (bookingId) {
            await Booking.findByIdAndUpdate(bookingId, { isPaid: true, paymentMethod: 'Stripe' });
            console.log(`Booking ${bookingId} marked as paid.`);
        } else {
            console.log("No bookingId in session metadata.");
        }
    } else {
        console.log("Unhandled event type:", event.type);
    }
    res.json({received: true});
    

    //     if (bookingId) {
    //         await Booking.findByIdAndUpdate(bookingId, { isPaid: true, paymentMethod: 'Stripe' });
    //         console.log(`Booking ${bookingId} marked as paid.`);
    //     } else {
    //         console.log("No bookingId in session metadata.");
    //     }
    // } else {
    //     console.log("Unhandled event type:", event.type);
    // }
    // res.json({received: true});
}