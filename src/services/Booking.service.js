import { getDb } from "../../utils/getDb.js"

class Booking {

    #DB

    constructor() {
        this.#DB = getDb()
    }

    async getBookings({
        propertyId,
        fromDate,
        toDate,
        scope = "upcoming",
        status,
        page = 1,
        limit = 10,
    }) {
        const offset = (page - 1) * limit
        const property_id = Number(propertyId)
        const today = new Date().toISOString()

        const conditions = [`b.property_id = $1`]
        const params = [property_id]
        let idx = 2

        if (fromDate || toDate) {
            if (fromDate) {
                conditions.push(`b.estimated_departure >= $${idx}`)
                params.push(`${fromDate}T00:00:00.000Z`)
                idx++
            }
            if (toDate) {
                conditions.push(`b.estimated_arrival <= $${idx}`)
                params.push(`${toDate}T23:59:59.999Z`)
                idx++
            }
        } else {
            if (scope === "upcoming") {
                conditions.push(`b.estimated_departure >= $${idx}`)
                params.push(today)
                idx++
            } else if (scope === "past") {
                conditions.push(`b.estimated_departure < $${idx}`)
                params.push(today)
                idx++
            }
        }

        if (status) {
            conditions.push(`b.booking_status = $${idx}`)
            params.push(status)
            idx++
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`

        /* ---------- DATA QUERY ---------- */
        const { rows } = await this.#DB.query(
            `
            SELECT
            b.id,
            b.booking_status,
            b.booking_type,
            b.booking_date,
            b.estimated_arrival,
            b.estimated_departure,
            b.booking_nights,
            b.total_guest,
            b.final_amount,
            b.drop,
            b.pickup,

            COALESCE(
                ARRAY_AGG(rr.room_no) FILTER (WHERE rr.room_no IS NOT NULL),
                '{}'
            ) AS room_numbers

            FROM public.bookings b
            JOIN public.room_details rd
                ON rd.booking_id = b.id
                AND rd.is_cancelled = false

            LEFT JOIN public.ref_rooms rr ON rr.id = rd.ref_room_id
            ${whereClause}
            GROUP BY b.id
            ORDER BY b.estimated_arrival ASC
            LIMIT $${idx} OFFSET $${idx + 1}
            `,
            [...params, limit, offset]
        )

        const { rows: countRows } = await this.#DB.query(
            `
            SELECT COUNT(*)::int AS total
            FROM public.bookings b
            ${whereClause}
            `,
            params
        )

        return {
            pagination: {
                page,
                limit,
                total: countRows[0].total,
                totalPages: Math.ceil(countRows[0].total / limit),
            },
            bookings: rows,
        }
    }


    async getBookingById(bookingId) {
        const { rows } = await this.#DB.query(
            `
            SELECT
            b.id,
            b.property_id,
            b.package_id,

            b.booking_status,
            b.booking_type,
            b.booking_date,

            b.estimated_arrival,
            b.estimated_departure,
            b.actual_arrival,
            b.actual_departure,

            b.booking_nights,
            b.adult,
            b.child,
            b.total_guest,

            b.discount_type,
            b.discount,
            b.discount_amount,

            b.price_before_tax,
            b.price_after_discount,
            b.gst_amount,
            b.room_tax_amount,
            b.final_amount,

            b.cancellation_fee,
            b.is_no_show,

            b.comments,
            b.is_active,

            b.created_by,
            b.created_on,
            b.updated_by,
            b.updated_on,

            b.drop,
            b.pickup,

            COALESCE(paid.total_paid_amount, 0) AS paid_amount,

            COALESCE(
                json_agg(
                    json_build_object(
                        'room_id', rd.ref_room_id,
                        'room_no', rr.room_no,
                        'room_type', rd.room_type,
                        'room_status', rd.room_status
                    )
                ) FILTER (WHERE rd.id IS NOT NULL),
                '[]'
            ) AS rooms

            FROM public.bookings b

            LEFT JOIN (
                SELECT
                    booking_id,
                    SUM(paid_amount) AS total_paid_amount
                FROM public.payments
                WHERE is_active = true
                GROUP BY booking_id
            ) paid ON paid.booking_id = b.id

           JOIN public.room_details rd
                ON rd.booking_id = b.id
                AND rd.is_cancelled = false

            LEFT JOIN public.ref_rooms rr
                ON rr.id = rd.ref_room_id

            WHERE b.id = $1
            GROUP BY
                b.id,
                paid.total_paid_amount
            `,
            [Number(bookingId)]
        );

        return rows[0] ?? null;
    }

    async createBooking({
        property_id,
        package_id,
        booking_type,
        booking_status,
        booking_date,
        estimated_arrival,
        estimated_departure,
        adult,
        child,
        discount_type,
        rooms,
        discount,
        price_before_tax,
        discount_amount,
        price_after_discount,
        gst_amount,
        room_tax_amount,
        comments,
        created_by,
        drop,
        pickup
    }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            const finalAmount =
                Number(price_after_discount) +
                Number(gst_amount) +
                Number(room_tax_amount);

            /* ------------------ INSERT BOOKING ------------------ */
            const { rows: bookingRows } = await client.query(
                `
            INSERT INTO public.bookings (
                property_id,
                package_id,
                booking_type,
                booking_status,
                booking_date,
                estimated_arrival,
                estimated_departure,
                adult,
                child,
                total_guest,
                discount_type,
                discount,
                created_by,
                booking_nights,
                price_before_tax,
                discount_amount,
                price_after_discount,
                gst_amount,
                room_tax_amount,
                final_amount,
                comments,
                pickup,
                drop
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,
                $8,$9,($8::int + $9::int),
                $10,$11,$12,
                (DATE($7) - DATE($6)),
                $13,$14,$15,$16,$17,$18,$19,$20,$21
            )
            RETURNING *
            `,
                [
                    property_id,
                    package_id,
                    booking_type,
                    booking_status ?? 'CONFIRMED',
                    booking_date,
                    estimated_arrival,
                    estimated_departure,
                    adult || 0,
                    child || 0,
                    discount_type,
                    discount || 0,
                    created_by,
                    price_before_tax,
                    discount_amount,
                    price_after_discount,
                    gst_amount,
                    room_tax_amount,
                    finalAmount,
                    comments || "",
                    pickup,
                    drop
                ]
            );

            const booking = bookingRows[0];

            /* ------------------ ROOM AVAILABILITY CHECK ------------------ */
            for (const room of rooms) {
                const { rowCount } = await client.query(
                    `
                SELECT 1
                FROM public.room_details rd
                JOIN public.bookings b
                  ON b.id = rd.booking_id
                WHERE rd.ref_room_id = $1
                  AND rd.is_cancelled = false

                  AND b.booking_status IN (
                        'CONFIRMED',
                        'CHECKED_IN',
                        'NO_SHOW'
                  )

                  AND (
                        b.estimated_arrival < $3
                    AND COALESCE(
                            b.actual_departure,
                            b.estimated_departure
                        ) > $2
                  )
                LIMIT 1
                `,
                    [
                        room.ref_room_id,
                        estimated_arrival,
                        estimated_departure
                    ]
                );

                if (rowCount > 0) {
                    throw new Error(`Room ${room.ref_room_id} is not available`);
                }

                /* ------------------ INSERT ROOM DETAILS ------------------ */
                await client.query(
                    `
                INSERT INTO public.room_details (
                    booking_id,
                    ref_room_id,
                    room_type,
                    room_status,
                    is_cancelled,
                    created_by
                )
                VALUES ($1,$2,$3,'BOOKED',false,$4)
                `,
                    [
                        booking.id,
                        room.ref_room_id,
                        room.room_type,
                        created_by
                    ]
                );
            }

            await client.query("COMMIT");
            return booking;

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    async cancelBooking({
        bookingId,
        cancellationFee = 0,
        comments,
        cancelledBy
    }) {
        const client = await this.#DB.connect()

        try {
            await client.query("BEGIN")

            const { rows } = await client.query(
                `
                SELECT
                    id,
                    booking_status,
                    final_amount
                FROM public.bookings
                WHERE id = $1
                FOR UPDATE
                `,
                [Number(bookingId)]
            )

            if (!rows.length) {
                throw new Error("Booking not found")
            }

            const booking = rows[0]

            if (['CANCELLED', 'CHECKED_OUT'].includes(booking.booking_status)) {
                throw new Error(
                    `Booking cannot be cancelled (current status: ${booking.booking_status})`
                )
            }

            const { rows: updatedRows } = await client.query(
                `
                UPDATE public.bookings
                SET
                    booking_status = 'CANCELLED',
                    is_active = false,
                    cancellation_fee = $2,
                    comments = COALESCE($3, comments),
                    updated_by = $4,
                    updated_on = now()
                WHERE id = $1
                RETURNING *
                `,
                [
                    bookingId,
                    cancellationFee,
                    comments,
                    cancelledBy
                ]
            )

            await client.query("COMMIT")

            return {
                message: "Booking cancelled successfully",
                booking: updatedRows[0]
            }

        } catch (err) {
            await client.query("ROLLBACK")
            throw err
        } finally {
            client.release()
        }
    }

    async updateBookingStatus({
        bookingId,
        status,
        comments,
        updatedBy
    }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            const { rows } = await client.query(
                `
            SELECT id, booking_status
            FROM public.bookings
            WHERE id = $1
            FOR UPDATE
            `,
                [Number(bookingId)]
            );

            if (!rows.length) {
                throw new Error("Booking not found");
            }

            let extraUpdates = ``;

            if (status === 'CHECKED_IN') {
                extraUpdates += `, actual_arrival = now()`;
            }

            if (status === 'CHECKED_OUT') {
                extraUpdates += `, actual_departure = now()`;
            }

            if (status === 'NO_SHOW') {
                extraUpdates += `, is_no_show = true`;
            }

            if (status === 'CANCELLED') {
                extraUpdates += `, is_active = false`;
            }

            const { rows: updatedRows } = await client.query(
                `
            UPDATE public.bookings
            SET
                booking_status = $2
                ${extraUpdates},
                comments = COALESCE($3, comments),
                updated_by = $4,
                updated_on = now()
            WHERE id = $1
            RETURNING *
            `,
                [
                    bookingId,
                    status,
                    comments,
                    updatedBy
                ]
            );

            /**
             *  IMPORTANT PART
             * When booking is CHECKED_OUT → mark all related rooms as dirty
             */
            if (status === 'CHECKED_OUT') {
                await client.query(
                    `
                UPDATE public.ref_rooms r
                SET
                    dirty = true,
                    updated_on = now(),
                    updated_by = $2
                FROM public.room_details rd
                WHERE rd.booking_id = $1
                  AND rd.ref_room_id = r.id
                `,
                    [bookingId, updatedBy]
                );
            }

            await client.query("COMMIT");

            return {
                message: "Booking status updated successfully",
                booking: updatedRows[0]
            };

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }


}

export default Object.freeze(new Booking())