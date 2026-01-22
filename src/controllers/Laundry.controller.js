import LaundryService from "../services/Laundry.service.js";

class LaundryController {
    async getByProperty(req, res, next) {
        try {
            const { propertyId } = req.params;

            const data = await LaundryService.getByPropertyId(propertyId);
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }

    async create(req, res, next) {
        try {
            const {
                propertyId,
                itemName,
                description,
                itemRate
            } = req.body;

            const userId = req.user.user_id;

            const data = await LaundryService.createLaundry({
                propertyId,
                description,
                itemRate,
                userId,
                itemName
            });

            res.status(201).json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }

    async bulkUpdate(req, res, next) {
        try {
            const { updates } = req.body;
            const userId = req.user.id;

            const data = await LaundryService.bulkUpdate({
                updates,
                userId
            });

            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
}

export default Object.freeze(new LaundryController());
