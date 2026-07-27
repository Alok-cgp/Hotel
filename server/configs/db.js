import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () =>  console.log("Database Connected ✅"));
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "hotel-booking",
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
