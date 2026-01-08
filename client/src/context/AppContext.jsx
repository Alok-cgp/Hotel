import axios from "axios";
import { useEffect, useState, useCallback } from "react";
import {useNavigate} from "react-router-dom";
import {useUser, useAuth} from "@clerk/clerk-react";
import { toast } from "react-hot-toast";
import { roomsDummyData } from "../assets/assets";
import { AppContext } from "./Context";

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

export const AppProvider = ({ children })=>{

    const currency = import.meta.env.VITE_CURRENCY || "$";
    const navigate = useNavigate();
    const {user} = useUser();
    const {getToken, isLoaded, isSignedIn} = useAuth();

    const [isOwner,setIsOwner] = useState(false);
    const [showHotelReg,setShowHotelReg] = useState(false);
    const [searchedCities,setSearchedCities] = useState([]);
    const [rooms,setRooms] = useState([]);
    const [loadingUser, setLoadingUser] = useState(true);

    const fetchRooms = useCallback(async ()=>{
        try {
            const {data} = await axios.get('/api/rooms')
            if(data.success){
                setRooms(data.rooms)
            }else{
                toast.error(data.message)
                setRooms(roomsDummyData)
            }
        } catch (error) {
            toast.error(error.message)
            setRooms(roomsDummyData)
        }
    },[])

    const fetchUser = useCallback(async ()=>{
        try {
            // More robust checks
            if (!isLoaded) {
                console.log("Clerk not loaded yet");
                return;
            }
            
            if (!isSignedIn) {
                console.log("User not signed in");
                setIsOwner(false);
                setLoadingUser(false);
                return;
            }

            // Wait for token
            const token = await getToken();
            console.log("Token obtained:", token ? "✓" : "✗");
            
            if (!token) {
                console.log("No token available");
                setIsOwner(false);
                setLoadingUser(false);
                return;
            }

            const {data} = await axios.get('/api/user', {
                headers: {Authorization: `Bearer ${token}`}
            })
            
            if(data.success){
                setIsOwner(data.role === "hotelOwner");
                setSearchedCities(data.recentSearchedCities)
                console.log("User fetched successfully, role:", data.role);
            }else{
                setIsOwner(false);
            }
        } catch (error) {
            console.log("fetchUser error:", error.response?.status, error.message);
            if (error?.response?.status === 401) {
                setIsOwner(false);
            } else {
                toast.error("Failed to load user data")
            }
        } 
        finally {
            setLoadingUser(false);
        }
    },[getToken, isLoaded, isSignedIn])

    const checkHotelOwnership = useCallback(async () => {
        try {
            if (!isLoaded || !isSignedIn) {
                return;
            }

            const token = await getToken();
            if (!token) {
                return;
            }

            const { data } = await axios.get('/api/hotels/check-ownership', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (data.success) {
                setIsOwner(data.isOwner);
                console.log("Hotel ownership check:", data.isOwner);
            }
        } catch (error) {
            if (error?.response?.status !== 401) {
                console.log("Error checking hotel ownership:", error);
            }
        }
    },[getToken, isLoaded, isSignedIn]);

    const fetchUserAndHotelStatus = useCallback(async () => {
        if (!isSignedIn || !isLoaded) {
            setIsOwner(false);
            setLoadingUser(false);
            return;
        }

        setLoadingUser(true);
        
        try {
            await fetchUser();
            await checkHotelOwnership();
        } catch (error) {
            console.log("Error in fetchUserAndHotelStatus:", error);
        } finally {
            setLoadingUser(false);
        }
    },[isSignedIn, isLoaded, fetchUser, checkHotelOwnership]);

    useEffect(()=>{
        if(isLoaded){
            if(isSignedIn) {
                fetchUserAndHotelStatus();
            } else {
                setIsOwner(false);
                setLoadingUser(false);
            }
        }
    },[isLoaded, isSignedIn])

    useEffect(()=>{
        fetchRooms();
    },[fetchRooms])

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
        checkHotelOwnership,
        fetchUser,
        isLoaded,      // ✅ Expose these
        isSignedIn     // ✅ Expose these
    }

    return(
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}