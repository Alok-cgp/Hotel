import express, { json } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { registerHotel, getMyHotel, checkHotelOwnership } from "../controllers/hotelController.js";
import Hotel from "../models/Hotel.js";

const hotelRouter = express.Router();

hotelRouter.get("/", (req,res) =>{
    res.json({message: "Hotel List endpoint working."})
})

hotelRouter.post('/',protect,registerHotel);

// Use the controller function instead of inline code for consistency
hotelRouter.get("/my-hotel", protect, getMyHotel);

// Add new route to check hotel ownership
hotelRouter.get("/check-ownership", protect, checkHotelOwnership);

export default hotelRouter;