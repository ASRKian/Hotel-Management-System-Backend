import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

class MenuMasterService {
    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /**
        * Get menu items by property with pagination
        */
    async getByProperty({
        propertyId,
        page = 1,
        limit = 10,
    }) {
        const offset = (page - 1) * limit;

        const { rows } = await this.#DB.query(
            `
           SELECT 
                id,
                property_id,
                item_name,
                category,
                price,
                is_active,
                is_veg,
                description,
                prep_time,
                created_on,
                updated_on
            FROM menu_master
            WHERE property_id = $1
            ORDER BY item_name
            LIMIT $2 OFFSET $3
            `,
            [propertyId, limit, offset]
        );

        const { rows: countRows } = await this.#DB.query(
            `
            SELECT COUNT(*)::int AS total
            FROM menu_master
            WHERE property_id = $1
            `,
            [propertyId]
        );

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total: countRows[0].total,
                totalPages: Math.ceil(countRows[0].total / limit),
            },
        };
    }

    /**
     * Get menu item image by menu ID
     */
    async getImageById(id) {
        const { rows } = await this.#DB.query(
            `
            SELECT image, image_mime
            FROM menu_master
            WHERE id = $1
            `,
            [id]
        );

        return rows[0] || null;
    }

    /**
     * Get only id, item_name & is_active by property
     * (For dropdowns / toggles / lightweight lists)
     */
    async getIdNameStatusByProperty(propertyId) {
        const { rows } = await this.#DB.query(
            `
            SELECT
                id,
                item_name,
                is_active,
                price
            FROM menu_master
            WHERE property_id = $1
            ORDER BY item_name
            `,
            [propertyId]
        );

        return rows;
    }

    /**
     * Create a menu item
     */
    async create({
        propertyId,
        itemName,
        category,
        price,
        isActive = true,
        isVeg = false,
        description,
        image,
        imageMime,
        prepTime,
        userId,
    }) {
        const { rows } = await this.#DB.query(
            `
            INSERT INTO menu_master (
                property_id,
                item_name,
                category,
                price,
                is_active,
                is_veg,
                description,
                image,
                image_mime,
                prep_time,
                created_by
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10, $11
            )
            RETURNING *
            `,
            [
                propertyId,
                itemName,
                category,
                price,
                isActive,
                isVeg,
                description,
                image,
                imageMime,
                prepTime,
                userId,
            ]
        );

        await AuditService.log({
            property_id: propertyId,
            event_id: rows[0].id,
            table_name: "menu_master",
            event_type: "CREATE",
            task_name: "Create Menu Item",
            comments: "Menu item created",
            details: JSON.stringify({
                menu_id: rows[0].id,
                item_name: itemName,
                category,
                price,
                is_active: isActive,
                is_veg: isVeg,
                prep_time: prepTime
            }),
            user_id: userId
        });

        return rows[0];
    }

    /**
     * Update menu item by ID
     */
    async updateById(
        id,
        {
            itemName,
            category,
            price,
            isActive,
            isVeg,
            description,
            image,
            imageMime,
            prepTime,
            userId,
        }
    ) {
        const { rows } = await this.#DB.query(
            `
            UPDATE menu_master
            SET
                item_name   = COALESCE($1, item_name),
                category    = COALESCE($2, category),
                price       = COALESCE($3, price),
                is_active   = COALESCE($4, is_active),
                is_veg      = COALESCE($5, is_veg),
                description = COALESCE($6, description),
                image       = COALESCE($7, image),
                image_mime  = COALESCE($8, image_mime),
                prep_time   = COALESCE($9, prep_time),
                updated_by  = $10,
                updated_on  = NOW()
            WHERE id = $11
            RETURNING *
            `,
            [
                itemName,
                category,
                price,
                isActive,
                isVeg,
                description,
                image,
                imageMime,
                prepTime,
                userId,
                id,
            ]
        );

        await AuditService.log({
            property_id: rows[0].property_id,
            event_id: rows[0].id,
            table_name: "menu_master",
            event_type: "UPDATE",
            task_name: "Update Menu Item",
            comments: "Menu item updated",
            details: JSON.stringify({
                menu_id: rows[0].id,
                item_name: rows[0].item_name,
                category: rows[0].category,
                price: rows[0].price,
                is_active: rows[0].is_active,
                is_veg: rows[0].is_veg,
                prep_time: rows[0].prep_time
            }),
            user_id: userId
        });

        return rows[0];
    }

    /**
     * Bulk update menu items
     * Accepts array:
     * [{ id, price, is_active, prep_time }]
     */
    async bulkUpdate(items, userId) {
        if (!Array.isArray(items) || items.length === 0) {
            return [];
        }

        const ids = items.map(i => i.id);

        const priceCase = items
            .map((i, idx) => `WHEN id = $${idx + 1} THEN ${i.price}`)
            .join(" ");

        const activeCase = items
            .map((i, idx) => `WHEN id = $${idx + 1} THEN ${i.is_active}`)
            .join(" ");

        const prepTimeCase = items
            .map((i, idx) => `WHEN id = $${idx + 1} THEN ${i.prep_time}`)
            .join(" ");

        const { rows } = await this.#DB.query(
            `
            UPDATE menu_master
            SET
                price = CASE ${priceCase} ELSE price END,
                is_active = CASE ${activeCase} ELSE is_active END,
                prep_time = CASE ${prepTimeCase} ELSE prep_time END,
                updated_by = $${ids.length + 1},
                updated_on = NOW()
            WHERE id IN (${ids.map((_, i) => `$${i + 1}`).join(",")})
            RETURNING *
            `,
            [...ids, userId]
        );

        return rows;
    }

    /**
     * Delete menu item by ID
     */
    async deleteById(id, userId) {
        const { rows, rowCount } = await this.#DB.query(
            `
            DELETE FROM menu_master
            WHERE id = $1
            RETURNING id, property_id, item_name;
            `,
                [id]
            );

        if (rowCount > 0) {
            await AuditService.log({
                property_id: rows[0].property_id,
                event_id: rows[0].id,
                table_name: "menu_master",
                event_type: "DELETE",
                task_name: "Delete Menu Item",
                comments: "Menu item deleted",
                details: JSON.stringify({
                    menu_id: rows[0].id,
                    item_name: rows[0].item_name
                }),
                user_id: userId
            });

            return true;
        }

        return false;
    }

}

export default Object.freeze(new MenuMasterService());
