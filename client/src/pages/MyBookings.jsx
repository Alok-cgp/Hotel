import React, { useEffect, useState, useCallback } from 'react'
import Title from '../components/Title'
import { assets } from '../assets/assets'
import toast from 'react-hot-toast'
import { useAppContext } from '../context/Context'

const MyBookings = () => {

    const {axios, getToken, user, isLoaded, isSignedIn} = useAppContext();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUserBookings = useCallback(async()=>{
        try {
            if (!isLoaded || !isSignedIn) {
                setLoading(false);
                return;
            }

            const token = await getToken();
            
            if (!token) {
                setLoading(false);
                return;
            }

            const {data} = await axios.get('/api/bookings/user',{
                headers:{
                    Authorization: `Bearer ${token}`
                }
            });
            
            if(data.success){
                setBookings(data.bookings);
            }else{
                toast.error(data.message);
            }
        } catch (error) {
            if (error?.response?.status === 401) {
                toast.error("Please sign in to view bookings");
            } else {
                toast.error("Failed to load bookings");
            }
        } finally {
            setLoading(false);
        }
    },[axios, getToken, isLoaded, isSignedIn])

    const handlePayment = async(bookingId)=>{
        try {
            const token = await getToken();
            if (!token) {
                toast.error("Please sign in");
                return;
            }

            const {data} = await axios.post('/api/bookings/stripe-payment',
                {bookingId},
                {
                    headers:{   
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            
            if(data.success){
                window.location.href = data.url;
            }else{
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    const checkPaymentStatus = useCallback(async () => {
        const sessionId = new URLSearchParams(window.location.search).get('session_id');
        if (sessionId) {
            try {
                const token = await getToken();
                if (!token) return;

                const {data} = await axios.get(
                    `/api/bookings/payment-success?session_id=${sessionId}`, 
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
                
                if (data.success) {
                    toast.success("Payment successful!");
                    fetchUserBookings();
                }
            } catch {
                toast.error("Could not verify payment status");
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    },[axios, getToken, fetchUserBookings]);

    useEffect(()=>{
        if(isLoaded && isSignedIn && user){
            fetchUserBookings();
            checkPaymentStatus();
        } else if (isLoaded && !isSignedIn) {
            setLoading(false);
        }
    },[isLoaded, isSignedIn, user])

    if (loading) {
        return (
            <div className='py-28 md:pb-35 md:pt-32 px-4 md:px-16 lg:px-24 xl:px-32'>
                <p>Loading bookings...</p>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className='py-28 md:pb-35 md:pt-32 px-4 md:px-16 lg:px-24 xl:px-32'>
                <p>Please sign in to view your bookings.</p>
            </div>
        );
    }

    return (
        <div className='py-28 md:pb-35 md:pt-32 px-4 md:px-16 lg:px-24 xl:px-32'>
            <Title 
                title='My Bookings' 
                subTitle='Easily manage your past, current and upcoming hotel reservations in one place. Plan your trips seamlessly with just a few clicks' 
                align='left'
            />

            <div className='max-w-6xl mt-8 w-full text-gray-800'>
                <div className='hidden md:grid md:grid-cols-[3fr_2fr_1fr] w-full border-b border-gray-300 font-medium text-base py-3'>
                    <div className='w-1/3'>Hotels</div>
                    <div className='w-1/3'>Date & Timings</div>
                    <div className='w-1/3'>Payment</div>
                </div>

                {bookings.length === 0 ? (
                    <p className='py-8 text-gray-500'>No bookings found</p>
                ) : (
                    bookings.map((booking, index) => (
                        <div key={booking._id} className='grid grid-cols-1 md:grid-cols-[3fr_2fr_1fr] w-full border-b border-gray-300 py-6 first:border-t'>
                            <div className='flex flex-col md:flex-row'>
                                <img
                                    src={
                                        booking.room?.images?.[index % (booking.room?.images?.length || 1)] || 
                                        assets.roomImg1
                                    }
                                    alt={`${booking.hotel?.name} - ${booking.room?.roomType}`}
                                    className='w-full md:w-44 h-32 rounded shadow object-cover'
                                />
                                <div className='flex flex-col gap-1.5 max-md:mt-3 md:ml-4'>
                                    <p className='font-playFair text-2xl'>
                                      {booking.hotel?.name || 'N/A'}
                                      <span className='font-inter text-sm'> {booking.room?.roomType || 'N/A'}</span>
                                    </p>
                                    <div className='flex items-center gap-1 text-sm text-gray-500'>
                                        <img src={assets.locationIcon} alt="location-icon" />
                                        <span>{booking.hotel?.address || 'N/A'}</span>
                                    </div>
                                    <div className='flex items-center gap-1 text-sm text-gray-500'>
                                        <img src={assets.guestsIcon} alt="guests-icon" />
                                        <span>{booking.guests} {booking.guests === 1 ? 'Guest' : 'Guests'}</span>
                                    </div>
                                    <p className='text-base font-medium'>Total: Rs.{booking.totalPrice}</p>
                                </div>
                            </div>
                            <div className='flex flex-row md:items-center md:gap-12 mt-3 gap-8'>
                                <div>
                                    <p className='font-medium'>Check-In</p>
                                    <p className='text-gray-500 text-sm'>
                                        {new Date(booking.checkInDate).toDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className='font-medium'>Check-Out</p>
                                    <p className='text-gray-500 text-sm'>
                                        {new Date(booking.checkOutDate).toDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className='flex flex-col items-start justify-center pt-3'>
                                <div className='flex items-center gap-2'>
                                    <div className={`h-3 w-3 rounded-full ${booking.isPaid ? "bg-green-500" : "bg-red-500"}`}></div>
                                    <p className={`text-sm font-medium ${booking.isPaid ? "text-green-500" : "text-red-500"}`}>
                                        {booking.isPaid ? "Paid" : "Unpaid"}
                                    </p>
                                </div>
                                {!booking.isPaid && (
                                    <button 
                                        onClick={() => handlePayment(booking._id)} 
                                        className='px-4 py-1.5 mt-4 text-xs border border-gray-400 rounded-full hover:bg-gray-50 transition-all cursor-pointer'
                                    >
                                        Pay Now
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default MyBookings