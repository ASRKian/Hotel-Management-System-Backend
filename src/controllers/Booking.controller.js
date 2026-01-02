import BookingService from "../services/Booking.service.js"

class Booking {
    async getBookings(req, res) {
        try {
            const { propertyId, fromDate, toDate } = req.query
            const bookings = await BookingService.getBookings({ fromDate, propertyId, toDate });
            return res.json({ message: "Success", bookings })
        } catch (error) {
            console.log("🚀 ~ Booking ~ getBookings ~ error:", error)
            res.status(500).json({ message: "Error fetching bookings" })
        }
    }

    async createBooking(req, res) {
        try {
            const created_by = req.user.user_id
            const { property_id, package_id, rooms, booking_type, booking_status, booking_date, estimated_arrival, estimated_departure, adult, child, discount_type, discount } = req.body;
            const booking = await BookingService.createBooking({ adult, booking_date,rooms, booking_status, booking_type, child, created_by, discount, discount_type, estimated_arrival, estimated_departure, package_id, property_id })
            return res.status(201).json({ message: "Success", booking })
        } catch (error) {
            console.log("🚀 ~ Booking ~ createBooking ~ error:", error)
            return res.status(500).json({ message: "Error creating booking" })
        }
    }
}

export default Object.freeze(new Booking())