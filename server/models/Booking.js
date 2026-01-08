import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: { 
      type: String, // Clerk userId (e.g. "user_123xyz") - Keep as String
      required: true 
    },
    room: { 
      type: mongoose.Schema.Types.ObjectId, // ✅ Changed from String to ObjectId
      ref: "Room", 
      required: true 
    },
    hotel: { 
      type: mongoose.Schema.Types.ObjectId, // ✅ Changed from String to ObjectId
      ref: "Hotel", 
      required: true 
    },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    totalPrice: { type: Number, required: true },
    guests: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      required: true,
      default: "Pay At Hotel",
    },
    isPaid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;