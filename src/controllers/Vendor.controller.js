import VendorService from "../services/Vendor.service.js";

class VendorController {
    async getByPropertyId(req, res, next) {
        try {
            const { propertyId } = req.params;
            const { page } = req.query
            const data = await VendorService.getByPropertyId(propertyId, page);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    async create(req, res, next) {
        try {
            const userId = req.user.user_id;
            const data = await VendorService.create(req.body, userId);
            res.status(201).json(data);
        } catch (err) {
            next(err);
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.user_id;
            const data = await VendorService.update(id, req.body, userId);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }
}

export default Object.freeze(new VendorController());
