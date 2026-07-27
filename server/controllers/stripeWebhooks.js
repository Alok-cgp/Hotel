import stripe from 'stripe';
import Booking from '../models/Booking.js';

export const stripeWebhooks = async (req, res) => {
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { bookingId } = session.metadata;

        if (bookingId) {
            await Booking.findByIdAndUpdate(bookingId, { isPaid: true, paymentMethod: 'Stripe' });
        }
    }
    res.json({received: true});
}