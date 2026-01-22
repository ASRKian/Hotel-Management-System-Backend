import { getDb } from "../../utils/getDb.js";

class User {

    #DB

    constructor() {
        this.#DB = getDb()
    }

    async createUser({ authUserId, email, propertyId, created_by = null, is_active = true }) {
        const userResult = await this.#DB.query(
            `
      insert into public.users (
        id,
        email,
        property_id,
        is_active,
        created_by,
        created_on
      )
      values ($1, $2, $3, $4, $5, now())
      returning id
      `,
            [authUserId, email, propertyId, is_active, created_by]
        );

        return userResult.rows[0];
    }

    async updateUser({ client, userId, payload, updatedBy }) {
        const fields = []
        const values = []
        let idx = 1

        const ALLOWED_FIELDS = [
            "email",
            "property_id",
            "staff_id",
            "is_active"
        ]

        for (const key of ALLOWED_FIELDS) {
            if (payload[key] !== undefined) {
                fields.push(`${key} = $${idx++}`)
                values.push(payload[key])
            }
        }

        fields.push(`updated_by = $${idx++}`)
        values.push(updatedBy)

        fields.push(`updated_on = now()`)

        if (!fields.length) return

        await client.query(
            `
            UPDATE public.users
            SET ${fields.join(", ")}
            WHERE id = $${idx}
            `,
            [...values, userId]
        )
    }


    async getUser({ authUserId }) {
        return await this.#DB.query(
            `
            select
                u.email,
                u.property_id,
                u.is_active
            from public.users u
            where u.id = $1
            limit 1
            `,
            [authUserId]
        );
    }

    async getUsersByRole(role) {
        const { rows } = await this.#DB.query(
            `
        SELECT
            u.id AS user_id,
            u.email,
            CONCAT_WS(' ', s.first_name, s.last_name) AS full_name,
            r.name AS role_name
        FROM public.user_roles ur
        JOIN public.users u
            ON u.id = ur.user_id
        JOIN public.roles r
            ON r.id = ur.role_id
        LEFT JOIN public.staff s
            ON s.id::varchar = u.staff_id
        WHERE
            (
                r.id::text = $1
                OR LOWER(r.name) = LOWER($1)
            )
            AND u.is_active = true
        ORDER BY u.created_on DESC
        `,
            [String(role)]
        );

        return rows;
    }

    async getMe(userId) {
        const { rows } = await this.#DB.query(
            `
        SELECT
            u.id AS user_id,
            u.email,
            u.is_active,
            u.created_on,

            /* roles */
            COALESCE(
                json_agg(
                    DISTINCT jsonb_build_object(
                        'id', r.id,
                        'name', r.name
                    )
                ) FILTER (WHERE r.id IS NOT NULL),
                '[]'
            ) AS roles,

            /* staff profile (optional) */
            jsonb_build_object(
                'staff_id', s.id,
                'first_name', s.first_name,
                'last_name', s.last_name,
                'designation', s.designation,
                'department', s.department
            ) AS staff

        FROM public.users u

        LEFT JOIN public.user_roles ur
            ON ur.user_id = u.id
        LEFT JOIN public.roles r
            ON r.id = ur.role_id

        LEFT JOIN public.staff s
            ON s.user_id = u.id

        WHERE u.id = $1
        GROUP BY u.id, s.id;
        `,
            [userId]
        );

        return rows[0] ?? null;
    }

    async getUsersByPropertyAndRoles({
        propertyId,
        roles = [],
        isOwner = false,
    }) {
        const { rows } = await this.#DB.query(
            `
        SELECT DISTINCT
            u.id AS user_id,
            u.email,
            CONCAT_WS(' ', s.first_name, s.last_name) AS full_name,
            r.name AS role_name
        FROM public.users u
        JOIN public.user_roles ur
            ON ur.user_id = u.id
        JOIN public.roles r
            ON r.id = ur.role_id
        LEFT JOIN public.staff s
            ON s.id::varchar = u.staff_id
        WHERE
            u.property_id = $1
            AND u.is_active = true
            AND (
                $2::text[] IS NULL
                OR LOWER(r.name) = ANY($2)
            )
            AND (
                $3 = true
                OR LOWER(r.name) <> 'admin'
            )
        ORDER BY u.created_on DESC
        `,
            [
                propertyId,
                roles.length
                    ? roles.map(r => r.toLowerCase())
                    : null,
                isOwner,
            ]
        );

        return rows;
    }

    async getUsersByPropertyAndRole({ property_id, role }) {
        const { rows } = await this.#DB.query(
            `
        SELECT
            u.id AS user_id,
            s.first_name,
            s.last_name,
            u.email
        FROM public.users u
        JOIN public.user_roles ur
            ON ur.user_id = u.id
        JOIN public.roles r
            ON r.id = ur.role_id
        JOIN public.staff s
            ON s.user_id = u.id
        WHERE
            u.property_id = $1
            AND u.is_active = true
            AND (
                r.id::text = $2
                OR LOWER(r.name) = LOWER($2)
            )
        ORDER BY s.id DESC
        `,
            [property_id, String(role)]
        );

        return rows;
    }

}

const user = new User();
Object.freeze(user);

export default user;