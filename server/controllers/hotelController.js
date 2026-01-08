import Hotel from "../models/Hotel.js";
import User from "../models/User.js";

export const registerHotel = async (req,res)=>{
    try {
        const {name,address,contact,city} = req.body;
        
        // Debug logging to see what's available
        // console.log("req.user:", req.user);
        // console.log("req.auth:", req.auth);
        
        // Use userId set by protect middleware
        const owner = req.userId;
        
        if (!owner) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        const hotel = await Hotel.findOne({owner})
        if(hotel){
            return res.json({success: false,message: "Hotel Already Registered"})
        }

        await Hotel.create({name,address,contact,city,owner: owner});

        await User.findOneAndUpdate({ clerkId: owner }, { role: "hotelOwner" });
        res.json({success: true, message: "Hotel Registered Successfully"})

    } catch (error) {
        // console.error("registerHotel error:", error);
        res.json({success: false, message: error.message})
    }
}

export const getMyHotel = async (req, res) => {
    try {
        // Use userId set by protect middleware
        const owner = req.userId;
        
        if (!owner) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }
        
        const hotel = await Hotel.findOne({ owner });

        if (!hotel) {
            return res.json({ success: false, message: "No hotel found" });
        }

        res.json({ success: true, hotel });
    } catch (error) {
        console.error("getMyHotel error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// New function to check if user is hotel owner
export const checkHotelOwnership = async (req, res) => {
    try {
        // Debug logging
        console.log("req.user:", req.user);
        console.log("req.auth:", req.auth);
        
        // Use userId set by protect middleware
        const owner = req.userId;
        
        if (!owner) {
            return res.status(401).json({ 
                success: false, 
                message: "User not authenticated" 
            });
        }

        const hotel = await Hotel.findOne({ owner });
        
        res.json({ 
            success: true, 
            isOwner: !!hotel,
            hotel: hotel || null 
        });
    } catch (error) {
        console.error("checkHotelOwnership error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
