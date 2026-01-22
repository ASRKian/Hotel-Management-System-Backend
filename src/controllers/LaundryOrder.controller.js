import LaundryOrderService from "../services/LaundryOrder.service.js";

class LaundryOrderController {

    async create(req, res, next) {
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
            next(err);
        }
    }

    async getByProperty(req, res, next) {
        try {
            const { propertyId } = req.params;
            const { page } = req.query

            const data = await LaundryOrderService.getByPropertyId({ propertyId, page });
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    async update(req, res, next) {
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
            next(err);
        }
    }
}

export default Object.freeze(new LaundryOrderController());
