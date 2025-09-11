import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import {useNavigate} from "react-router-dom";
import {useUser, useAuth} from "@clerk/clerk-react";
import { toast } from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

const AppContext = createContext();

export const AppProvider = ({ children })=>{

    const currency = import.meta.env.VITE_CURRENCY || "$";
    const navigate = useNavigate();
    const {user} = useUser();
    const {getToken} = useAuth();

    const [isOwner,setIsOwner] = useState(false);
    const [showHotelReg,setShowHotelReg] = useState(false);
    const [searchedCities,setSearchedCities] = useState([]);
    const [rooms,setRooms] = useState([]);
    const [loadingUser, setLoadingUser] = useState(true);

    const fetchRooms = async ()=>{
        try {
            const {data} = await axios.get('/api/rooms')
            if(data.success){
                setRooms(data.rooms)
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const fetchUser = async ()=>{
        try {
            const {data} = await axios.get('/api/user', {headers: {Authorization: `Bearer ${await getToken()}`}})
            if(data.success){
                setIsOwner(data.role === "hotelOwner");
                setSearchedCities(data.recentSearchedCities)
                // Keep your existing role check as backup
            }else{
                setTimeout(()=>{
                    fetchUser()
                },5000)
            }
        } catch (error) {
            // console.log("fetchUser error:", error);
            toast.error(error.message)
        } 
        finally {
            setLoadingUser(false);
        }
    }

    // New function to check hotel ownership directly from hotels collection
    const checkHotelOwnership = async () => {
        try {
            if (!user) {
                setIsOwner(false);
                return;
            }

            const token = await getToken();
            if (token) {
                const { data } = await axios.get('/api/hotels/check-ownership', {
                    headers: { Authorization: `Bearer ${await getToken()}` }
                });
                
                if (data.success) {
                    setIsOwner(data.isOwner);
                    console.log("Hotel ownership check result:", data.isOwner);
                } else {
                    console.log("Hotel ownership check failed:", data.message);
                    // Fallback to user role if hotel check fails
                }
            }
        } catch (error) {
            console.log("Error checking hotel ownership:", error);
            // Don't show toast error for this as it might be called frequently
            // Keep existing isOwner state as fallback
        }
    };


    // Enhanced user fetch that also checks hotel ownership
    const fetchUserAndHotelStatus = async () => {
        if (!user) {
            setIsOwner(false);
            setLoadingUser(false);
            return;
        }

        try {
            // First fetch user data (your existing logic)
            await fetchUser();
            
            // Then check hotel ownership as additional verification
            await checkHotelOwnership();
        } catch (error) {
            console.log("Error in fetchUserAndHotelStatus:", error);
            setLoadingUser(false);
        }
    };

    useEffect(()=>{
        if(user){
            fetchUserAndHotelStatus(); // Call the enhanced function
            fetchUser();
        } 
        else {
            setIsOwner(false);
            setLoadingUser(false);
        }
    },[user])

    useEffect(()=>{
        fetchRooms();
    },[])

    const value = {
        currency, 
        navigate, 
        user, 
        getToken, 
        isOwner, 
        setIsOwner, 
        axios, 
        showHotelReg, 
        setShowHotelReg, 
        searchedCities, 
        setSearchedCities, 
        rooms, 
        setRooms,
        loadingUser,
        checkHotelOwnership, // Expose this function
        fetchUser // Expose fetchUser in case needed elsewhere
    }

    return(
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}

export const useAppContext = ()=> {
   return useContext(AppContext);
}