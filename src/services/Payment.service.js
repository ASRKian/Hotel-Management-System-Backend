import { getDb } from "../../utils/getDb.js";

class PaymentsService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /* Get payments by property_id (LIST MODE - limited) */
    async getByPropertyId(propertyId, page = 1, limit = 10) {
        const MAX_LIMIT = 20;            // hard cap
        const safeLimit = Math.min(limit, MAX_LIMIT);
        const offset = (page - 1) * safeLimit;

        const countResult = await this.#DB.query(
            `select count(*)
         from public.payments
         where property_id = $1
           and is_active = true`,
            [propertyId]
        );

        const total = Number(countResult.rows[0].count);

        const { rows } = await this.#DB.query(
            `select
            id,
            booking_id,
            payment_date,
            paid_amount,
            payment_method,
            payment_status
         from public.payments
         where property_id = $1
           and is_active = true
         order by payment_date desc
         limit $2 offset $3`,
            [propertyId, safeLimit, offset]
        );

        return {
            data: rows,
            pagination: {
                page,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit),
                hasMore: offset + safeLimit < total
            }
        };
    }

    /* Get payments by booking_id (paginated) */
    async getByBookingId(bookingId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;

        const countResult = await this.#DB.query(
            `select count(*)
         from public.payments
         where booking_id = $1
           and is_active = true`,
            [bookingId]
        );

        const total = Number(countResult.rows[0].count);

        const { rows } = await this.#DB.query(
            `
        select
            p.*,

            trim(
                concat_ws(
                    ' ',
                    s.first_name,
                    s.middle_name,
                    s.last_name
                )
            ) as created_by_name

        from public.payments p
        left join public.users u
            on u.id = p.created_by
        left join public.staff s
            on s.user_id = u.id

        where p.booking_id = $1
          and p.is_active = true
        order by p.payment_date desc
        limit $2 offset $3
        `,
            [bookingId, limit, offset]
        );

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /* Get payment by id with booking & property details */
    async getById(paymentId) {
        const { rows } = await this.#DB.query(
            `
        select
            p.id                  as payment_id,
            p.booking_id,
            p.property_id,
            p.payment_date,
            p.paid_amount,
            p.payment_method,
            p.payment_type,
            p.payment_status,
            p.is_active,
            p.created_on,
            p.updated_on,

            b.booking_date,
            b.booking_type,
            b.booking_status,
            b.estimated_arrival,
            b.estimated_departure,
            b.actual_arrival,
            b.actual_departure,
            b.final_amount,
            b.discount,
            b.adult,
            b.child,
            b.total_guest,

            pr.brand_name         as property_name

        from public.payments p
        join public.bookings b
            on b.id = p.booking_id
        join public.properties pr
            on pr.id = p.property_id
        where p.id = $1
          and p.is_active = true
        `,
            [paymentId]
        );

        return rows[0] || null;
    }


    /* Create single payment */
    async create(payload) {
        const {
            booking_id,
            property_id,
            payment_date,
            paid_amount,
            payment_method,
            payment_type,
            payment_status,
            userId
        } = payload;

        const { rows } = await this.#DB.query(
            `insert into public.payments (
                booking_id,
                property_id,
                payment_date,
                paid_amount,
                payment_method,
                payment_type,
                payment_status,
                created_by
            )
            values ($1,$2,$3,$4,$5,$6,$7,$8)
            returning *`,
            [
                booking_id,
                property_id,
                payment_date,
                paid_amount,
                payment_method,
                payment_type,
                payment_status,
                userId
            ]
        );

        return rows[0];
    }

    /* Update payment */
    async update(id, payload) {
        const {
            payment_date,
            paid_amount,
            payment_method,
            payment_type,
            payment_status,
            updated_by
        } = payload;

        const { rows } = await this.#DB.query(
            `update public.payments
             set
                payment_date   = coalesce($2, payment_date),
                paid_amount    = coalesce($3, paid_amount),
                payment_method = coalesce($4, payment_method),
                payment_type   = coalesce($5, payment_type),
                payment_status = coalesce($6, payment_status),
                updated_by     = $7,
                updated_on     = now()
             where id = $1
             returning *`,
            [
                id,
                payment_date,
                paid_amount,
                payment_method,
                payment_type,
                payment_status,
                updated_by
            ]
        );

        return rows[0];
    }
}

export default Object.freeze(new PaymentsService());
