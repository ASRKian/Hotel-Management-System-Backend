import { getDb } from "../../utils/getDb.js";

class Property {
    #DB;

    constructor() {
        this.#DB = getDb();
    }

    async getById({ id }) {
        const { rows } = await this.#DB.query(
            `
        SELECT *
        FROM public.properties
        WHERE id = $1
      `,
            [id]
        );

        return rows[0] ?? null;
    }

    async getAll({
        page = 1,
        limit = 10,
        city,
        state,
        country,
        is_active,
        search
    }) {
        const offset = (page - 1) * limit;

        const where = [];
        const values = [];
        let idx = 1;

        if (city) {
            where.push(`city ILIKE $${idx++}`);
            values.push(`%${city}%`);
        }

        if (state) {
            where.push(`state ILIKE $${idx++}`);
            values.push(`%${state}%`);
        }

        if (country) {
            where.push(`country = $${idx++}`);
            values.push(country);
        }

        if (typeof is_active === "boolean") {
            where.push(`is_active = $${idx++}`);
            values.push(is_active);
        }

        if (search) {
            where.push(`(
      brand_name ILIKE $${idx}
      OR city ILIKE $${idx}
    )`);
            values.push(`%${search}%`);
            idx++;
        }

        const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [dataRes, countRes] = await Promise.all([
            this.#DB.query(
                `
        SELECT *
        FROM public.properties
        ${whereClause}
        ORDER BY id DESC
        LIMIT $${idx} OFFSET $${idx + 1}
      `,
                [...values, limit, offset]
            ),
            this.#DB.query(
                `
        SELECT COUNT(*)::int AS total
        FROM public.properties
        ${whereClause}
      `,
                values
            )
        ]);

        return {
            data: dataRes.rows,
            pagination: {
                page,
                limit,
                total: countRes.rows[0].total,
                totalPages: Math.ceil(countRes.rows[0].total / limit)
            }
        };
    }

    async create({ payload, userId }) {
        const {
            brand_name,
            address_line_1,
            address_line_2,
            city,
            state,
            postal_code,
            country,
            checkin_time,
            checkout_time,
            is_active = true,
            room_tax_rate = 0,
            gst = 0,
            serial_number,
            total_floors,
            phone,
            phone2,
            email,
            total_rooms,
            year_opened,
            is_pet_friendly = false,
            smoking_policy,
            cancellation_policy,
            image,
            image_mime
        } = payload;

        const { rows } = await this.#DB.query(
            `
        INSERT INTO public.properties (
          brand_name,
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          country,
          checkin_time,
          checkout_time,
          is_active,
          created_by,
          room_tax_rate,
          gst,
          serial_number,
          total_floors,
          phone,
          phone2,
          email,
          total_rooms,
          year_opened,
          is_pet_friendly,
          smoking_policy,
          cancellation_policy,
          image,
          image_mime
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,
          $19,$20,$21,$22,$23,$24,$25
        )
        RETURNING *
      `,
            [
                brand_name,
                address_line_1,
                address_line_2,
                city,
                state,
                postal_code,
                country,
                checkin_time,
                checkout_time,
                is_active,
                userId,
                room_tax_rate,
                gst,
                serial_number,
                total_floors,
                phone,
                phone2,
                email,
                total_rooms,
                year_opened,
                is_pet_friendly,
                smoking_policy,
                cancellation_policy,
                image,
                image_mime
            ]
        );

        return rows[0];
    }

    async update({ id, payload, userId }) {
        const fields = [];
        const values = [];
        let idx = 1;

        for (const [key, value] of Object.entries(payload)) {
            fields.push(`${key} = $${idx++}`);
            values.push(value);
        }

        if (!fields.length) {
            throw new Error("No fields to update");
        }

        fields.push(`updated_by = $${idx++}`);
        fields.push(`updated_on = now()`);

        values.push(userId);

        const { rows } = await this.#DB.query(
            `
      UPDATE public.properties
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *
    `,
            [...values, id]
        );

        return rows[0] ?? null;
    }

}

const property = new Property();
Object.freeze(property);

export default property;
