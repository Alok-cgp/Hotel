import axios from "axios";
import { useEffect, useState, useCallback } from "react";
import {useNavigate} from "react-router-dom";
import {useUser, useAuth} from "@clerk/clerk-react";
import { toast } from "react-hot-toast";
import { roomsDummyData } from "../assets/assets";
import { AppContext } from "./Context";

const rawBackendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const backendUrl = rawBackendUrl.startsWith("http://") || rawBackendUrl.startsWith("https://")
  ? rawBackendUrl
  : `https://${rawBackendUrl}`;

axios.defaults.baseURL = backendUrl;

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
                setRooms(roomsDummyData)
            }
        } catch (error) {
            setRooms(roomsDummyData)
        }
    },[])

    const fetchUser = useCallback(async ()=>{
        try {
            // More robust checks
            if (!isLoaded) {
                return;
            }
            
            if (!isSignedIn) {
                setIsOwner(false);
                setLoadingUser(false);
                return;
            }

            // Wait for token
            const token = await getToken();
            
            if (!token) {
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
            }else{
                setIsOwner(false);
            }
        } catch (error) {
            if (error?.response?.status === 401) {
                setIsOwner(false);
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
            }
        } catch (error) {
            // Ignore unauthenticated errors
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
            // Silently handle status fetch error
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