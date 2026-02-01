import { getDb } from "../../utils/getDb.js";

class KitchenInventoryService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /* ===========================
       GET BY PROPERTY (PAGINATED)
    ============================ */
    async getByPropertyId({ propertyId, page = 1, limit = 10 }) {
        const offset = (page - 1) * limit;

        const { rows } = await this.#DB.query(
            `
            SELECT *
            FROM kitchen_inventory
            WHERE property_id = $1
            ORDER BY item_name ASC
            LIMIT $2 OFFSET $3
            `,
            [propertyId, limit, offset]
        );

        const { rows: countRows } = await this.#DB.query(
            `
            SELECT COUNT(*)::int AS total
            FROM kitchen_inventory
            WHERE property_id = $1
            `,
            [propertyId]
        );

        const total = countRows[0].total;
        const totalPages = Math.ceil(total / limit);

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        };
    }

    /* ===========================
       LIGHT LIST (FOR DROPDOWNS / LINKING)
    ============================ */
    async getLightByPropertyId(propertyId) {
        const { rows } = await this.#DB.query(
            `
            SELECT id, item_name, stock_qty, unit, is_active
            FROM kitchen_inventory
            WHERE property_id = $1
              AND is_active = true
            ORDER BY item_name ASC
            `,
            [propertyId]
        );

        return rows;
    }

    /* ===========================
       CREATE
    ============================ */
    async create({
        property_id,
        item_name,
        category = null,
        stock_qty = 0,
        unit = null,
        reorder_level = 0,
        cost_price = 0,
        is_active = true,
        created_by
    }) {
        const { rows } = await this.#DB.query(
            `
            INSERT INTO kitchen_inventory (
                property_id,
                item_name,
                category,
                stock_qty,
                unit,
                reorder_level,
                cost_price,
                is_active,
                created_by
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *
            `,
            [
                property_id,
                item_name,
                category,
                stock_qty,
                unit,
                reorder_level,
                cost_price,
                is_active,
                created_by
            ]
        );

        return rows[0];
    }

    /* ===========================
       UPDATE BY ID
    ============================ */
    async updateById(id, {
        item_name,
        category,
        stock_qty,
        unit,
        reorder_level,
        cost_price,
        is_active,
        updated_by
    }) {
        const fields = [];
        const values = [];
        let i = 1;

        if (item_name !== undefined) {
            fields.push(`item_name = $${i++}`);
            values.push(item_name);
        }
        if (category !== undefined) {
            fields.push(`category = $${i++}`);
            values.push(category);
        }
        if (stock_qty !== undefined) {
            fields.push(`stock_qty = $${i++}`);
            values.push(stock_qty);
        }
        if (unit !== undefined) {
            fields.push(`unit = $${i++}`);
            values.push(unit);
        }
        if (reorder_level !== undefined) {
            fields.push(`reorder_level = $${i++}`);
            values.push(reorder_level);
        }
        if (cost_price !== undefined) {
            fields.push(`cost_price = $${i++}`);
            values.push(cost_price);
        }
        if (is_active !== undefined) {
            fields.push(`is_active = $${i++}`);
            values.push(is_active);
        }

        fields.push(`updated_by = $${i++}`);
        values.push(updated_by);

        fields.push(`updated_on = NOW()`);

        const { rows } = await this.#DB.query(
            `
            UPDATE kitchen_inventory
            SET ${fields.join(", ")}
            WHERE id = $${i}
            RETURNING *
            `,
            [...values, id]
        );

        return rows[0];
    }

    /* ===========================
       BULK CREATE
    ============================ */
    async createBulk({ property_id, items, created_by }) {
        if (!Array.isArray(items) || items.length === 0) return [];

        const values = [];
        const bindings = [];
        let i = 1;

        for (const item of items) {
            values.push(`(
                $${i++}, -- property_id
                $${i++}, -- item_name
                $${i++}, -- category
                $${i++}, -- stock_qty
                $${i++}, -- unit
                $${i++}, -- reorder_level
                $${i++}, -- cost_price
                $${i++}, -- is_active
                $${i++}  -- created_by
            )`);

            bindings.push(
                property_id,
                item.item_name,
                item.category ?? null,
                item.stock_qty ?? 0,
                item.unit ?? null,
                item.reorder_level ?? 0,
                item.cost_price ?? 0,
                item.is_active ?? true,
                created_by
            );
        }

        const { rows } = await this.#DB.query(
            `
            INSERT INTO kitchen_inventory (
                property_id,
                item_name,
                category,
                stock_qty,
                unit,
                reorder_level,
                cost_price,
                is_active,
                created_by
            )
            VALUES ${values.join(",")}
            RETURNING *
            `,
            bindings
        );

        return rows;
    }

    /* ===========================
       BULK UPDATE
    ============================ */
    async updateBulk({ updates, updated_by }) {
        if (!Array.isArray(updates) || updates.length === 0) return [];

        const results = [];

        for (const u of updates) {
            const updated = await this.updateById(u.id, {
                item_name: u.item_name,
                category: u.category,
                stock_qty: u.stock_qty,
                unit: u.unit,
                reorder_level: u.reorder_level,
                cost_price: u.cost_price,
                is_active: u.is_active,
                updated_by
            });

            results.push(updated);
        }

        return results;
    }
}

export default Object.freeze(new KitchenInventoryService());
