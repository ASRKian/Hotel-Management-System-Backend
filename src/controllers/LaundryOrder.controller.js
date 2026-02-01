import LaundryOrderService from "../services/LaundryOrder.service.js";

class LaundryOrderController {

    async create(req, res) {
        try {
            const {
                laundryId,
                roomId,
                bookingId,
                propertyId,
                vendorId,
                itemCount,
                pickupDate,
                deliveryDate
            } = req.body;

            const userId = req.user.user_id;

            const data = await LaundryOrderService.createOrder({
                laundryId,
                roomId,
                bookingId,
                propertyId,
                vendorId,
                itemCount,
                pickupDate,
                deliveryDate,
                userId
            });

            res.status(201).json({ success: true, data });
        } catch (err) {
            console.log("🚀 ~ LaundryOrderController ~ create ~ err:", err)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }

    async getByProperty(req, res) {
        try {
            const { propertyId } = req.params;
            const { page } = req.query

            const data = await LaundryOrderService.getByPropertyId({ propertyId, page });
            res.json(data);
        } catch (err) {
            console.log("🚀 ~ LaundryOrderController ~ getByProperty ~ err:", err)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }

    async getByBooking(req, res) {
        try {
            const { bookingId } = req.params;

            const data = await LaundryOrderService.getByBookingId(bookingId);
            res.json(data);
        } catch (err) {
            console.log("🚀 ~ LaundryOrderController ~ getByBooking ~ err:", err)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const {
                itemCount,
                laundryStatus,
                pickupDate,
                deliveryDate
            } = req.body;

            const userId = req.user.user_id;

            const data = await LaundryOrderService.updateOrder({
                id,
                itemCount,
                laundryStatus,
                pickupDate,
                deliveryDate,
                userId
            });

            res.json({ success: true, data });
        } catch (err) {
            console.log("🚀 ~ LaundryOrderController ~ update ~ err:", err)
            return res.status(500).json({ message: "Some error occurred" })
        }
    }
}

export default Object.freeze(new LaundryOrderController());
