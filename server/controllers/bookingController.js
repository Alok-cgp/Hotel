import transporter from "../configs/nodemailer.js";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import stripe from "stripe";

// Utility to check if a room is available
const checkAvailability = async ({ checkInDate, checkOutDate, room }) => {
  try {
    const bookings = await Booking.find({
      room,
      checkInDate: { $lte: checkOutDate },
      checkOutDate: { $gte: checkInDate },
    });
    const IsAvailable = bookings.length === 0;
    return IsAvailable;
  } catch (error) {
    return false;
  }
};

// API: Check if room is available
export const checkAvailabiltyAPI = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate } = req.body;
    const isAvailable = await checkAvailability({
      checkInDate,
      checkOutDate,
      room,
    });
    res.json({ success: true, isAvailable });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// API: Create a new booking
export const createBooking = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate, guests } = req.body;
    const user = req.userId; // Clerk user id from middleware

    // Availability check
    const isAvailable = await checkAvailability({
      checkInDate,
      checkOutDate,
      room,
    });
    if (!isAvailable) {
      return res.json({
        success: false,
        message: "Room is not available"
        // isAvailable,
      });
    }

    // Room + hotel details
    const roomData = await Room.findById(room).populate("hotel");
    // if (!roomData) {
    //   return res.json({ success: false, message: "Room not found" });
    // }
    // if (!roomData.hotel) {
    //   return res.json({ success: false, message: "No hotel linked to this room" });
    // }
    
    let totalPrice = roomData.pricePerNight;

    // Price calculation
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const timeDiff = checkOut.getTime() - checkIn.getTime();
    const nights = Math.ceil((timeDiff / (1000 * 3600 * 24)));
    totalPrice = totalPrice * nights;

    // Save booking
    const booking = await Booking.create({
      user,
      room,
      hotel: roomData.hotel._id,
      guests: +guests,
      checkInDate,
      checkOutDate,
      totalPrice,
    });

    // Use req.userEmail and req.userName, fallback to test email if missing
    const recipientEmail = req.userEmail || process.env.TEST_EMAIL || "test@example.com";
    const recipientName = req.userName || "Guest";

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: recipientEmail,
      subject: "Hotel Booking Details",
      html:
      `<h2>Your booking Details</h2>
      <p>Dear ${recipientName},</p>
      <p>Thank you for booking with us! Here are your booking details:</p>
      <ul>
      <li><strong>Booking ID:</strong> ${booking._id}</li>
      <li><strong>Hotel:</strong> ${roomData.hotel.name}</li>
      <li><strong>location:</strong> ${roomData.hotel.address}</li>
      <li><strong>Date:</strong> ${booking.checkInDate.toDateString()}</li>
      <li><strong>Booking Amount:</strong> ${process.env.CURRENCY || '$'} ${booking.totalPrice} /night</li>
      </ul>
      <p>We look forward to hosting you!</p>
      <p>If you need to make any changes, feel free to contact us.</p>
      `
    }

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      // Silently handle email sending error
    }

    res.json({
      success: true,
      message: "Booking created successfully"
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};


// API: Get bookings for logged-in user
export const getUserBookings = async (req, res) => {
  try {
    const user = req.userId; // Clerk userId
    
    const bookings = await Booking.find({ user })
      .populate({
        path: "room",
        select: "images roomType pricePerNight", // Select the fields you need
      })
      .populate({
        path: "hotel",
        select: "name address images", // Populate hotel separately
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    res.json({ success: false, message: "Failed to fetch bookings" });
  }
};

// API: Get bookings for logged-in hotel owner
export const getHotelBookings = async (req, res) => {
  try {
    // Use req.userId set by authMiddleware
    const hotel = await Hotel.findOne({ owner: req.userId }); // Clerk userId
    if (!hotel) {
      return res.json({ success: false, message: "No hotel found" });
    }

    const bookings = await Booking.find({ hotel: hotel._id }).populate("room hotel user").sort({ createdAt: -1 })

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce(
      (acc, booking) => acc + booking.totalPrice,
      0
    );

    res.json({
      success: true,
      dashboardData: { totalBookings, totalRevenue, bookings },
    });
  } catch (error) {
    res.json({ success: false, message: "Failed to fetch bookings: " + error.message });
  }
};

export const stripePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.json({ success: false, message: "Booking ID is required" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    if (!booking.room) {
      return res.json({ success: false, message: "Room information missing for this booking" });
    }

    const roomData = await Room.findById(booking.room).populate("hotel");
    if (!roomData || !roomData.hotel) {
      return res.json({ success: false, message: "Room or hotel data not found" });
    }

    const hotelPrice = booking.totalPrice;
    if (!hotelPrice || hotelPrice <= 0) {
      return res.json({ success: false, message: "Invalid booking amount" });
    }

    const { origin } = req.headers;
    if (!origin) {
      return res.json({ success: false, message: "Origin header missing" });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.json({ success: false, message: "Payment configuration error" });
    }

    const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

    const line_items = [
      {
        price_data:{
          currency: "INR",
          product_data:{
            name: roomData.hotel.name,
          },
          unit_amount: hotelPrice * 100,
      },
      quantity: 1,
      }
    ];

    const session = await stripeInstance.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/my-bookings?session_id={CHECKOUT_SESSION_ID}`, // Modified this line
      cancel_url: `${origin}/my-bookings`,
      metadata: {
        bookingId,
      }
    });
    res.json({ success: true, url: session.url });
  } catch (error) {
    res.json({ success: false, message: "Payment failed: " + error.message });
  }
};

export const verifyPaymentSuccess = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return res.json({ success: false, message: "No session ID provided" });
    }

    const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripeInstance.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status === "paid") {
      const booking = await Booking.findByIdAndUpdate(
        session.metadata.bookingId,
        {
          isPaid: true,
          status: "confirmed"
        },
        { new: true } // Return updated document
      );
      
      if (!booking) {
        return res.json({ success: false, message: "Booking not found" });
      }
      
      res.json({ success: true, booking });
    } else {
      res.json({ success: false, message: "Payment incomplete" });
    }
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
