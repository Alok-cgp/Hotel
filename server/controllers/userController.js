import User from "../models/User.js";

export const getUserData = async (req,res)=>{
    try {
        const user = await User.findById(req.userId).lean();
        if (!user) {
            return res.json({success: false, message: "User not found"});
        }
        const { role, recentSearchedCities } = user;
        res.json({success: true, role, recentSearchedCities})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const storeRecentSearchedCities = async (req,res)=>{
    try {
        const {recentSearchedCity} = req.body
        const user = await User.findById(req.userId);
        if (!user) {
            return res.json({success: false, message: "User not found"});
        }

        if (user.recentSearchedCities.length < 3){
            user.recentSearchedCities.push(recentSearchedCity)
        }else{
            user.recentSearchedCities.shift();
            user.recentSearchedCities.push(recentSearchedCity)

        }
        await user.save();
        res.json({success: true, message: "City added"})

    } catch (error) {
                res.json({success: false, message: error.message})

    }
}
