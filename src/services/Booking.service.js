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
    }) {
        const from =
            fromDate ?? new Date().toISOString().slice(0, 10)

        const to =
            toDate ??
            new Date(
                new Date().setMonth(new Date().getMonth() + 1)
            ).toISOString().slice(0, 10)

        const { rows } = await this.#DB.query(
            `
            SELECT
            b.id,
            b.booking_status,
            b.booking_type,
            b.booking_date,
            b.estimated_arrival,
            b.estimated_departure,
            b.total_guest,
            b.final_amount,
            json_agg(
                json_build_object(
                'room_id', rd.ref_room_id,
                'room_type', rd.room_type,
                'room_status', rd.room_status
                )
            ) AS rooms
            FROM public.bookings b
            LEFT JOIN public.room_details rd
            ON rd.booking_id = b.id
            WHERE b.property_id = $1
            AND b.estimated_arrival < $3
            AND b.estimated_departure > $2
            GROUP BY b.id
            ORDER BY b.estimated_arrival
            `,
            [propertyId, from, to]
        )

        return rows
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
        created_by }) {
        const client = await this.#DB.connect()

        try {
            await client.query("BEGIN")

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
                    booking_nights
                )
                VALUES (
                    $1,$2,$3,$4,$5,$6,$7,
                    $8,$9,($8::int + $9::int),
                    $10,$11,$12,(DATE($7) - DATE($6))
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
                    adult ?? 0,
                    child ?? 0,
                    discount_type,
                    discount ?? 0,
                    created_by
                ]
            )

            const booking = bookingRows[0]

            for (const room of rooms) {
                const { rowCount } = await client.query(
                    `
                    SELECT 1
                    FROM public.room_details rd
                    JOIN public.bookings b ON b.id = rd.booking_id
                    WHERE rd.ref_room_id = $1
                    AND b.booking_status IN ('RESERVED','CONFIRMED','CHECKED_IN')
                    AND (
                        b.estimated_arrival < $3
                        AND b.estimated_departure > $2
                    )
                    LIMIT 1
                    `,
                    [
                        room.ref_room_id,
                        estimated_arrival,
                        estimated_departure
                    ]
                )

                if (rowCount > 0) {
                    throw new Error(`Room ${room.ref_room_id} is not available`)
                }

                await client.query(
                    `
                    INSERT INTO public.room_details (
                    booking_id,
                    ref_room_id,
                    room_type,
                    room_status,
                    created_by
                    )
                    VALUES ($1,$2,$3,'BOOKED',$4)
                    `,
                    [
                        booking.id,
                        room.ref_room_id,
                        room.room_type,
                        created_by
                    ]
                )
            }

            await client.query("COMMIT")
            return booking

        } catch (err) {
            await client.query("ROLLBACK")
            throw err
        } finally {
            client.release()
        }
    }

}

export default Object.freeze(new Booking())