import { getDb } from "../../utils/getDb.js";

class Staff {
    #DB

    constructor() {
        this.#DB = getDb()
    }

    async getAll({
        page = 1,
        limit = 10,
        search,
        department,
        designation,
        status
    }) {
        const offset = (page - 1) * limit;

        const where = [];
        const values = [];
        let idx = 1;

        if (search) {
            where.push(`(
      first_name ILIKE $${idx}
      OR last_name ILIKE $${idx}
      OR email ILIKE $${idx}
    )`);
            values.push(`%${search}%`);
            idx++;
        }

        if (department) {
            where.push(`department = $${idx++}`);
            values.push(department);
        }

        if (designation) {
            where.push(`designation = $${idx++}`);
            values.push(designation);
        }

        if (status) {
            where.push(`status = $${idx++}`);
            values.push(status);
        }

        const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const [dataRes, countRes] = await Promise.all([
            this.#DB.query(
                `
      SELECT
        id,
        first_name,
        middle_name,
        last_name,
        gender,
        marital_status,
        employment_type,
        email,
        phone1,
        phone2,
        emergency_contact,
        blood_group,
        designation,
        department,
        hire_date,
        leave_days,
        dob,
        shift_pattern,
        status,
        user_id,
        created_on,
        updated_on
      FROM public.staff
      ${whereClause}
      ORDER BY id DESC
      LIMIT $${idx} OFFSET $${idx + 1}
      `,
                [...values, limit, offset]
            ),
            this.#DB.query(
                `
      SELECT COUNT(*)::int AS total
      FROM public.staff
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

    async getById(id) {
        const { rows } = await this.#DB.query(
            `
        SELECT
            s.id,
            s.first_name,
            s.middle_name,
            s.last_name,
            s.address,
            s.gender,
            s.marital_status,
            s.employment_type,
            s.email,
            s.phone1,
            s.phone2,
            s.emergency_contact,
            s.id_proof_type,
            s.id_number,
            s.blood_group,
            s.designation,
            s.department,
            s.hire_date,
            s.leave_days,
            s.dob,
            s.shift_pattern,
            s.status,
            s.user_id,
            s.created_by,
            s.created_on,
            s.updated_by,
            s.updated_on,
            u.property_id,

            -- 👇 roles as [{id, name}]
            COALESCE(
                jsonb_agg(
                    DISTINCT jsonb_build_object(
                        'id', r.id,
                        'name', r.name
                    )
                ) FILTER (WHERE r.id IS NOT NULL),
                '[]'::jsonb
            ) AS roles

        FROM public.staff s
        LEFT JOIN public.users u
            ON u.id = s.user_id
        LEFT JOIN public.user_roles ur
            ON ur.user_id = u.id
        LEFT JOIN public.roles r
            ON r.id = ur.role_id

        WHERE s.id = $1

        GROUP BY
            s.id,
            s.first_name,
            s.middle_name,
            s.last_name,
            s.address,
            s.gender,
            s.marital_status,
            s.employment_type,
            s.email,
            s.phone1,
            s.phone2,
            s.emergency_contact,
            s.id_proof_type,
            s.id_number,
            s.blood_group,
            s.designation,
            s.department,
            s.hire_date,
            s.leave_days,
            s.dob,
            s.shift_pattern,
            s.status,
            s.user_id,
            s.created_by,
            s.created_on,
            s.updated_by,
            s.updated_on,
            u.property_id
        `,
            [id]
        );

        return rows[0];
    }


    async getStaffByPropertyId({
        property_id,
        page = 1,
        limit = 10,
        search,
        department,
        status,
    }) {

        const offset = Math.max(0, (page - 1) * limit);

        const where = [`u.property_id = $1`];
        const values = [property_id];
        let idx = 2;

        if (search) {
            where.push(`
                (
                    s.first_name ILIKE $${idx}
                    OR s.last_name ILIKE $${idx}
                    OR s.email ILIKE $${idx}
                )
            `);
            values.push(`%${search}%`);
            idx++;
        }

        if (department) {
            where.push(`s.department = $${idx++}`);
            values.push(department);
        }

        if (status) {
            where.push(`s.status = $${idx++}`);
            values.push(status);
        }

        const whereClause = where.length
            ? `WHERE ${where.join(" AND ")}`
            : "";

        const [dataRes, countRes] = await Promise.all([
            this.#DB.query(
                `
                SELECT
                    s.id,
                    s.first_name,
                    s.middle_name,
                    s.last_name,
                    s.email,
                    s.phone1,
                    s.phone2,
                    s.designation,
                    s.department,
                    s.status,
                    s.employment_type,
                    s.shift_pattern,
                    s.hire_date,
                    s.leave_days,
                    u.id AS user_id,
                    u.property_id
                FROM public.staff s
                JOIN public.users u
                    ON u.id = s.user_id
                ${whereClause}
                ORDER BY s.id DESC
                LIMIT $${idx} OFFSET $${idx + 1}
                `,
                [...values, limit, offset]
            ),
            this.#DB.query(
                `
                SELECT COUNT(*)::int AS total
                FROM public.staff s
                JOIN public.users u
                    ON u.id = s.user_id
                ${whereClause}
                `,
                values
            ),
        ]);

        return {
            data: dataRes.rows,
            pagination: {
                page: Math.max(1, page),
                limit,
                total: countRes.rows[0].total,
                totalPages: Math.ceil(countRes.rows[0].total / limit),
            },
        };
    }

    async create({ payload, files, userId }) {
        const {
            first_name,
            middle_name,
            last_name,
            address,
            gender,
            marital_status,
            employment_type,
            email,
            phone1,
            phone2,
            emergency_contact,
            id_proof_type,
            id_number,
            blood_group,
            designation,
            department,
            hire_date,
            leave_days,
            dob,
            shift_pattern,
            status,
            user_id
        } = payload;

        const image = files?.image;
        const idProof = files?.id_proof;

        const { rows } = await this.#DB.query(
            `
    INSERT INTO public.staff (
      first_name,
      middle_name,
      last_name,
      address,
      gender,
      marital_status,
      employment_type,
      email,
      phone1,
      phone2,
      emergency_contact,
      id_proof_type,
      id_number,
      blood_group,
      designation,
      department,
      hire_date,
      leave_days,
      dob,
      shift_pattern,
      status,
      image,
      image_mime,
      id_proof,
      id_proof_mime,
      created_by,
      user_id
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,
      $19,$20,$21,$22,$23,$24,$25,$26,
      $27
    )
    RETURNING id
    `,
            [
                first_name,
                middle_name,
                last_name,
                address,
                gender,
                marital_status,
                employment_type,
                email,
                phone1,
                phone2,
                emergency_contact,
                id_proof_type,
                id_number,
                blood_group,
                designation,
                department,
                hire_date,
                leave_days ?? 0,
                dob,
                shift_pattern,
                status ?? 'active',
                image?.buffer ?? null,
                image?.mimetype ?? null,
                idProof?.buffer ?? null,
                idProof?.mimetype ?? null,
                userId,
                user_id
            ]
        );

        return rows[0];
    }

    async update(id, payload, files, updated_by, client) {
        const fields = []
        const values = []
        let idx = 1

        const STAFF_FIELDS = [
            "first_name",
            "middle_name",
            "last_name",
            "address",
            "gender",
            "marital_status",
            "employment_type",
            "email",
            "phone1",
            "phone2",
            "emergency_contact",
            "id_proof_type",
            "id_number",
            "blood_group",
            "designation",
            "department",
            "hire_date",
            "leave_days",
            "dob",
            "shift_pattern",
            "status",
            "user_id"
        ]

        for (const key of STAFF_FIELDS) {
            if (payload[key] !== undefined) {
                fields.push(`${key} = $${idx++}`)
                values.push(payload[key])
            }
        }

        if (files?.image) {
            fields.push(`image = $${idx++}`)
            values.push(files.image.buffer)

            fields.push(`image_mime = $${idx++}`)
            values.push(files.image.mimetype)
        }

        if (files?.id_proof) {
            fields.push(`id_proof = $${idx++}`)
            values.push(files.id_proof.buffer)

            fields.push(`id_proof_mime = $${idx++}`)
            values.push(files.id_proof.mimetype)
        }

        fields.push(`updated_by = $${idx++}`)
        values.push(updated_by)

        fields.push(`updated_on = now()`)

        if (!fields.length) return

        await client.query(
            `
            UPDATE public.staff
            SET ${fields.join(", ")}
            WHERE id = $${idx}
            `,
            [...values, id]
        )
    }

    async getImage(id) {
        const { rows } = await this.#DB.query(
            `SELECT image, image_mime FROM public.staff WHERE id = $1`,
            [id]
        );
        return rows[0];
    }

    async getIdProof(id) {
        const { rows } = await this.#DB.query(
            `SELECT id_proof, id_proof_mime FROM public.staff WHERE id = $1`,
            [id]
        );
        return rows[0];
    }
}

export default Object.freeze(new Staff())