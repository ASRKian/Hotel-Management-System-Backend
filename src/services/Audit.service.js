import { getDb } from "../../utils/getDb.js";

class AuditService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    async log({
        property_id,
        event_id,
        table_name,
        event_type,
        task_name = null,
        comments = null,
        details = null,
        user_id = null
    }) {
        if (!property_id || !event_id || !table_name || !event_type) {
            throw new Error("Missing required audit fields");
        }

        await this.#DB.query(
            `
            INSERT INTO audits (
                property_id,
                event_id,
                table_name,
                event_type,
                task_name,
                comments,
                details,
                user_id
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `,
            [
                property_id,
                event_id,
                table_name,
                event_type,
                task_name,
                comments,
                details,
                user_id
            ]
        );
    }

    /* ===========================
      GET AUDITS BY EVENT + TABLE
      =========================== */
    async getByEventAndTable({
        eventId,
        tableName,
        page = 1,
        limit = 20
    }) {
        if (!eventId || !tableName) {
            throw new Error("eventId and tableName are required");
        }

        const safePage = Math.max(Number(page), 1);
        const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
        const offset = (safePage - 1) * safeLimit;

        /* -------- DATA QUERY -------- */
        const dataQuery = `
            SELECT
                a.id,
                a.property_id,
                a.event_id,
                a.table_name,
                a.event_type,
                a.task_name,
                a.comments,
                a.details,
                a.user_id,
                u.email        AS user_email,
                s.first_name   AS user_first_name,
                s.last_name    AS user_last_name,
                a.created_on
            FROM public.audits a

            LEFT JOIN public.users u
                ON u.id = a.user_id
            LEFT JOIN public.staff s
                ON s.user_id = u.id

            WHERE a.event_id = $1
              AND a.table_name = $2

            ORDER BY a.created_on DESC
            LIMIT $3 OFFSET $4
        `;

        /* -------- COUNT QUERY -------- */
        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM public.audits
            WHERE event_id = $1
              AND table_name = $2
        `;

        const [dataRes, countRes] = await Promise.all([
            this.#DB.query(dataQuery, [eventId, tableName, safeLimit, offset]),
            this.#DB.query(countQuery, [eventId, tableName])
        ]);

        const total = countRes.rows[0]?.total || 0;

        return {
            data: dataRes.rows,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit)
            }
        };
    }

    /* ===========================
       GET BY TABLE ONLY
       =========================== */
    async getByTableName({
        tableName,
        page = 1,
        limit = 20
    }) {
        if (!tableName) throw new Error("tableName is required");

        const safePage = Math.max(Number(page), 1);
        const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
        const offset = (safePage - 1) * safeLimit;

        const dataQuery = `
            SELECT
                a.*,
                u.email        AS user_email,
                s.first_name   AS user_first_name,
                s.last_name    AS user_last_name
            FROM public.audits a

            LEFT JOIN public.users u
                ON u.id = a.user_id
            LEFT JOIN public.staff s
                ON s.user_id = u.id

            WHERE a.table_name = $1
            ORDER BY a.created_on DESC
            LIMIT $2 OFFSET $3
        `;

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM public.audits
            WHERE table_name = $1
        `;

        const [dataRes, countRes] = await Promise.all([
            this.#DB.query(dataQuery, [tableName, safeLimit, offset]),
            this.#DB.query(countQuery, [tableName])
        ]);

        const total = countRes.rows[0]?.total || 0;

        return {
            data: dataRes.rows,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit)
            }
        };
    }
}

export default Object.freeze(new AuditService());
