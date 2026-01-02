import { getDb } from "../../utils/getDb.js";
import { roles } from "../../utils/roles.js";

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
        search,
        owner_user_id
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

        if (owner_user_id) {
            where.push(`owner_user_id = $${idx++}`);
            values.push(owner_user_id);
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
    SELECT
      id,
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
      owner_user_id,
      created_by,
      created_on,
      updated_by,
      updated_on,
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
      cancellation_policy
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

    async create({ payload, userId, ownerUserId }) {
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
            image_mime,
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
      image_mime,
      owner_user_id
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,
      $19,$20,$21,$22,$23,$24,$25,$26
    )
    RETURNING id
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
                is_active === "true" || is_active === true,
                userId,
                Number(room_tax_rate || 0),
                Number(gst || 0),
                serial_number,
                total_floors ? Number(total_floors) : null,
                phone,
                phone2,
                email,
                total_rooms ? Number(total_rooms) : null,
                year_opened ? Number(year_opened) : null,
                is_pet_friendly === "true" || is_pet_friendly === true,
                smoking_policy,
                cancellation_policy,
                image,
                image_mime,
                ownerUserId
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
      RETURNING id
    `,
            [...values, id]
        );

        return rows[0] ?? null;
    }

    async getImage({ id }) {
        const { rows } = await this.#DB.query(
            `SELECT image, image_mime FROM properties WHERE id = $1`,
            [id]
        )

        if (!rows[0]?.image) return res.sendStatus(404)

        return rows[0]
    }

    async getByOwnerUserId(ownerUserId) {
        const { rows } = await this.#DB.query(
            `
      SELECT
        id,
        brand_name,
        is_active
      FROM public.properties
      WHERE owner_user_id = $1
      ORDER BY id DESC
      `,
            [ownerUserId]
        );

        return rows;
    }

    async isOwnerOfProperty(propertyId, ownerUserId) {
        if (!propertyId || !ownerUserId) return false;

        const query = `
    SELECT 1
    FROM public.properties
    WHERE id = $1
      AND owner_user_id = $2
    LIMIT 1
  `;

        const { rowCount } = await this.#DB.query(query, [
            propertyId,
            ownerUserId,
        ]);

        return rowCount === 1;
    }

    async isAdminOfProperty(propertyId, adminUserId) {
        if (!propertyId || !userId) return false;

        const query = `
    SELECT 1
    FROM public.property_admins
    WHERE property_id = $1
      AND user_id = $2
    LIMIT 1
  `;

        const { rowCount } = await this.#DB.query(query, [
            propertyId,
            adminUserId,
        ]);

        return rowCount === 1;
    }

    async canAccessProperty(propertyId, userId, userRoles) {
        const roleSet = new Set(userRoles);

        if (roleSet.has(roles.SUPER_ADMIN)) {
            return true;
        }

        if (roleSet.has(roles.OWNER)) {
            return await this.isOwnerOfProperty(propertyId, userId);
        }

        if (roleSet.has(roles.ADMIN)) {
            return await this.isAdminOfProperty(propertyId, userId);
        }

        return false;
    }

    async getAllProperties() {
        const { rows } = await this.#DB.query(`
    SELECT id, brand_name
    FROM public.properties
    ORDER BY brand_name
  `);
        return rows;
    }

    async getPropertiesByOwner(userId) {
        const { rows } = await this.#DB.query(`
    SELECT id, brand_name
    FROM public.properties
    WHERE owner_user_id = $1
    ORDER BY brand_name
  `, [userId]);
        return rows;
    }

    async getPropertyByAdmin(userId) {
        const { rows } = await this.#DB.query(`
    SELECT p.id, p.brand_name
    FROM public.properties p
    JOIN public.property_admins pa
      ON pa.property_id = p.id
    WHERE pa.user_id = $1
    LIMIT 1
  `, [userId]);
        return rows;
    }

    async getUserProperties(userId) {
        const { rows } = await this.#DB.query(
            `
            SELECT
            p.id::text AS id,
            p.brand_name
            FROM public.properties p
            INNER JOIN public.users u
            ON u.property_id = p.id
            WHERE u.id = $1
            ORDER BY p.brand_name
            `,
            [userId]
        )

        return rows
    }

    async getPropertyTaxConfig(propertyId) {
        const { rows } = await this.#DB.query(
            `
            SELECT
            room_tax_rate,
            gst
            FROM public.properties
            WHERE id = $1
            AND is_active = true
            LIMIT 1
            `,
            [Number(propertyId)]
        )

        if (!rows.length) {
            throw new Error("Property not found or inactive")
        }

        return {
            room_tax_rate: Number(rows[0].room_tax_rate),
            gst: Number(rows[0].gst),

        }
    }


}

const property = new Property();
Object.freeze(property);

export default property;
