import KitchenInventoryService from "../services/KitchenInventory.service.js";

class KitchenInventoryController {

    /* ===========================
       GET BY PROPERTY (PAGINATED)
    ============================ */
    async getByPropertyId(req, res, next) {
        try {
            const { propertyId } = req.params;
            const { page = 1, limit = 10 } = req.query;

            if (!propertyId) {
                return res.status(400).json({
                    success: false,
                    message: "propertyId is required"
                });
            }

            const result = await KitchenInventoryService.getByPropertyId({
                propertyId: Number(propertyId),
                page: Number(page),
                limit: Number(limit)
            });

            res.json({
                ...result
            });
        } catch (err) {
            next(err);
        }
    }

    /* ===========================
       LIGHT LIST
    ============================ */
    async getLightByPropertyId(req, res, next) {
        try {
            const { propertyId } = req.params;

            if (!propertyId) {
                return res.status(400).json({
                    success: false,
                    message: "propertyId is required"
                });
            }

            const data = await KitchenInventoryService.getLightByPropertyId(
                Number(propertyId)
            );

            res.json({
                success: true,
                data
            });
        } catch (err) {
            next(err);
        }
    }

    /* ===========================
       CREATE
    ============================ */
    async create(req, res, next) {
        try {
            const userId = req.user.user_id || null;

            const {
                property_id,
                item_name,
                category,
                stock_qty,
                unit,
                reorder_level,
                cost_price,
                is_active
            } = req.body;

            if (!property_id || !item_name) {
                return res.status(400).json({
                    success: false,
                    message: "property_id and item_name are required"
                });
            }

            const created = await KitchenInventoryService.create({
                property_id,
                item_name,
                category,
                stock_qty,
                unit,
                reorder_level,
                cost_price,
                is_active,
                created_by: userId
            });

            res.status(201).json({
                success: true,
                data: created
            });
        } catch (err) {
            next(err);
        }
    }

    /* ===========================
       UPDATE BY ID
    ============================ */
    async updateById(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.user_id || null;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "id is required"
                });
            }

            const {
                item_name,
                category,
                stock_qty,
                unit,
                reorder_level,
                cost_price,
                is_active
            } = req.body;

            const updated = await KitchenInventoryService.updateById(Number(id), {
                item_name,
                category,
                stock_qty,
                unit,
                reorder_level,
                cost_price,
                is_active,
                updated_by: userId
            });

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    message: "Inventory item not found"
                });
            }

            res.json({
                success: true,
                data: updated
            });
        } catch (err) {
            next(err);
        }
    }

    /* ===========================
       BULK CREATE
    ============================ */
    async createBulk(req, res, next) {
        try {
            const userId = req.user.user_id || null;

            const { property_id, items } = req.body;

            if (!property_id || !Array.isArray(items)) {
                return res.status(400).json({
                    success: false,
                    message: "property_id and items[] are required"
                });
            }

            const created = await KitchenInventoryService.createBulk({
                property_id,
                items,
                created_by: userId
            });

            res.status(201).json({
                success: true,
                count: created.length,
                data: created
            });
        } catch (err) {
            next(err);
        }
    }

    /* ===========================
       BULK UPDATE
    ============================ */
    async updateBulk(req, res, next) {
        try {
            const userId = req.user.user_id || null;

            const { updates } = req.body;

            if (!Array.isArray(updates)) {
                return res.status(400).json({
                    success: false,
                    message: "updates[] array is required"
                });
            }

            const updated = await KitchenInventoryService.updateBulk({
                updates,
                updated_by: userId
            });

            res.json({
                success: true,
                count: updated.length,
                data: updated
            });
        } catch (err) {
            next(err);
        }
    }
}

export default Object.freeze(new KitchenInventoryController());
