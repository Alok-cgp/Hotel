import mongoose from 'mongoose';

const hotelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    owner: {
        type: String, // Clerk user ID
        required: true,
        ref: "User"
    },
    city: {
        type: String,
        required: true
    },
    images: {
        type: [String], // ✅ Array of image URLs
        default: []
    },
    description: {
        type: String,
        default: ''
    },
    amenities: {
        type: [String],
        default: []
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    }
}, {
    timestamps: true
});

const Hotel = mongoose.model('Hotel', hotelSchema);
export default Hotel;