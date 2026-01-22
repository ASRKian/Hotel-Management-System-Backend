import { getDb } from "../../utils/getDb.js";

class RoomTypeRateService {

    #DB

    constructor() {
        this.#DB = getDb();
    }

    async getByProperty(propertyId) {
        const { rows } = await this.#DB.query(
            `
            SELECT
                id,
                property_id,
                room_category_name,
                bed_type_name,
                ac_type_name,
                CASE
                    WHEN base_price = 0 THEN 0
                    ELSE base_price
                END AS base_price,
                created_at,
                updated_at
            FROM room_type_rates
            WHERE property_id = $1
            ORDER BY
                room_category_name,
                ac_type_name,
                bed_type_name                
            `,
            [propertyId]
        );

        return rows;
    }

    async updatePricesBulk(propertyId, rates, userId) {
        if (!Array.isArray(rates) || rates.length === 0) {
            return [];
        }

        // Normalize & validate
        const ids = [];
        const prices = [];

        for (const r of rates) {
            if (!r.id || r.base_price === undefined) continue;

            ids.push(Number(r.id));
            prices.push(Number(r.base_price));
        }

        if (!ids.length) return [];

        const { rows } = await this.#DB.query(
            `
            UPDATE room_type_rates rtr
            SET
                base_price = v.base_price,
                updated_by = $2,
                updated_at = NOW()
            FROM (
                SELECT
                    unnest($1::bigint[])  AS id,
                    unnest($3::numeric[]) AS base_price
            ) v
            WHERE rtr.id = v.id
            AND rtr.property_id = $4
            RETURNING
                rtr.id,
                rtr.property_id,
                rtr.room_category_name,
                rtr.bed_type_name,
                rtr.ac_type_name,
                rtr.base_price,
                rtr.updated_at
            `,
            [
                ids,
                userId,
                prices,
                propertyId
            ]
        );

        return rows;
    }

    async generateRoomTypeRatesForAllProperties(userId) {
        const { rows } = await this.#DB.query(`
        SELECT COUNT(*) AS count
        FROM ref_room_types
    `);

        if (Number(rows[0].count) === 0) {
            return {
                insertedCount: 0,
                message: "No reference room types found"
            };
        }

        const { rowCount } = await this.#DB.query(
            `
        INSERT INTO room_type_rates (
            property_id,
            room_category_name,
            bed_type_name,
            ac_type_name,
            base_price,
            created_by
        )
        SELECT
            p.id AS property_id,
            rrt.room_category_name,
            rrt.bed_type_name,
            rrt.ac_type_name,
            0 AS base_price,
            $1 AS created_by
        FROM properties p
        CROSS JOIN ref_room_types rrt
        ON CONFLICT (
            property_id,
            room_category_name,
            bed_type_name,
            ac_type_name
        )
        DO NOTHING
        `,
            [userId]
        );

        return {
            insertedCount: rowCount
        };
    }


}

export default Object.freeze(new RoomTypeRateService())