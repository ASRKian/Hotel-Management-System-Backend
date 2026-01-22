import { getDb } from "../../utils/getDb.js";

class GuestsService {
    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /* ------------------------------------------------------------------ */
    /* Helpers                                                            */
    /* ------------------------------------------------------------------ */

    #addressJoin() {
        return `
        LEFT JOIN public.addresses a
            ON a.entity_type = 'GUEST'
           AND a.entity_id = g.id
           AND a.address_type = 'HOME'
           AND a.is_primary = true
        `;
    }

    /* ------------------------------------------------------------------ */
    /* Add Guests                                                         */
    /* ------------------------------------------------------------------ */

    async addGuestsToBooking({ bookingId, guests, createdBy }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            const { rows: bookingRows } = await client.query(
                `
                SELECT id, property_id
                FROM public.bookings
                WHERE id = $1
                FOR UPDATE
                `,
                [Number(bookingId)]
            );

            if (!bookingRows.length) throw new Error("Booking not found");

            const property_id = bookingRows[0].property_id;

            for (const guest of guests) {
                if (!guest.first_name || !guest.last_name) {
                    throw new Error("Guest first_name and last_name are required");
                }

                const age = guest.dob
                    ? Math.floor(
                        (new Date() - new Date(guest.dob)) /
                        (365.25 * 24 * 60 * 60 * 1000)
                    )
                    : null;

                const { rows } = await client.query(
                    `
                    INSERT INTO public.guests (
                        booking_id,
                        property_id,
                        salutation,
                        first_name,
                        middle_name,
                        last_name,
                        gender,
                        dob,
                        age,
                        have_vehicle,
                        phone,
                        email,
                        guest_type,
                        nationality,
                        id_type,
                        id_number,
                        id_proof,
                        id_proof_mime,
                        emergency_contact,
                        emergency_contact_name,
                        is_active,
                        created_by
                    )
                    VALUES (
                        $1,$2,$3,$4,$5,$6,$7,$8,$9,
                        $10,$11,$12,$13,$14,$15,$16,
                        $17,$18,$19,$20,true,$21
                    )
                    RETURNING id
                    `,
                    [
                        bookingId,
                        property_id,
                        guest.salutation ?? null,
                        guest.first_name.trim(),
                        guest.middle_name?.trim() ?? null,
                        guest.last_name.trim(),
                        guest.gender ?? null,
                        guest.dob ?? null,
                        age,
                        guest.have_vehicle ?? false,
                        guest.phone ?? null,
                        guest.email ?? null,
                        guest.guest_type ?? null,
                        guest.nationality ?? null,
                        guest.id_type ?? null,
                        guest.id_number ?? null,
                        guest.id_proof_buffer ?? null,
                        guest.id_proof_mime ?? null,
                        guest.emergency_contact ?? null,
                        guest.emergency_contact_name ?? null,
                        createdBy
                    ]
                );

                if (guest.address) {
                    await client.query(
                        `
                        INSERT INTO public.addresses (
                            entity_type, entity_id, address_type,
                            address_line_1, is_primary, created_by
                        )
                        VALUES ('GUEST', $1, 'HOME', $2, true, $3)
                        `,
                        [rows[0].id, guest.address, createdBy]
                    );
                }
            }

            await client.query("COMMIT");

            return {
                message: "Guests added successfully",
                total_guests: guests.length
            };

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Get Guests                                                         */
    /* ------------------------------------------------------------------ */

    async getGuestsByBookingId(bookingId) {
        const { rows } = await this.#DB.query(
            `
            SELECT
                g.id,
                g.booking_id,
                g.property_id,
                g.salutation,
                g.first_name,
                g.middle_name,
                g.last_name,
                g.gender,
                g.dob,
                g.age,
                g.have_vehicle,
                a.address_line_1 AS address,
                g.phone,
                g.email,
                g.guest_type,
                g.nationality,
                g.id_type,
                g.id_number,
                (g.id_proof IS NOT NULL) AS has_id_proof,
                g.id_proof_mime,
                g.emergency_contact,
                g.emergency_contact_name,
                g.is_active,
                g.created_on,
                g.updated_on
            FROM public.guests g
            ${this.#addressJoin()}
            WHERE g.booking_id = $1
              AND g.is_active = true
            ORDER BY g.created_on
            `,
            [Number(bookingId)]
        );

        return {
            message: "Success",
            total_guests: rows.length,
            guests: rows
        };
    }

    /* ------------------------------------------------------------------ */
    /* Update Guest                                                       */
    /* ------------------------------------------------------------------ */

    async updateGuest({ guestId, payload, updatedBy }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            const fields = [];
            const values = [];
            let idx = 1;

            const set = (k, v) => {
                fields.push(`${k} = $${idx++}`);
                values.push(v);
            };

            if (payload.first_name !== undefined) set("first_name", payload.first_name.trim());
            if (payload.last_name !== undefined) set("last_name", payload.last_name.trim());
            if (payload.phone !== undefined) set("phone", payload.phone);
            if (payload.email !== undefined) set("email", payload.email);
            if (payload.guest_type !== undefined) set("guest_type", payload.guest_type);
            if (payload.nationality !== undefined) set("nationality", payload.nationality);
            if (payload.is_active !== undefined) set("is_active", payload.is_active);

            if (payload.dob !== undefined) {
                const age = payload.dob
                    ? Math.floor(
                        (new Date() - new Date(payload.dob)) /
                        (365.25 * 24 * 60 * 60 * 1000)
                    )
                    : null;

                set("dob", payload.dob);
                set("age", age);
            }

            if (fields.length) {
                set("updated_by", updatedBy);
                fields.push("updated_on = now()");

                await client.query(
                    `
                    UPDATE public.guests
                    SET ${fields.join(", ")}
                    WHERE id = $${idx}
                    `,
                    [...values, guestId]
                );
            }

            /* Address upsert */
            if (payload.address !== undefined) {
                await client.query(
                    `
                    INSERT INTO public.addresses (
                        entity_type, entity_id, address_type,
                        address_line_1, is_primary, created_by
                    )
                    VALUES ('GUEST', $1, 'HOME', $2, true, $3)
                    ON CONFLICT (entity_type, entity_id, address_type)
                    WHERE is_primary = true
                    DO UPDATE SET
                        address_line_1 = EXCLUDED.address_line_1,
                        updated_by = $3,
                        updated_on = now()
                    `,
                    [guestId, payload.address, updatedBy]
                );
            }

            await client.query("COMMIT");

            return { message: "Guest updated successfully" };

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    /* ------------------------------------------------------------------ */
    /* ID Proof                                                           */
    /* ------------------------------------------------------------------ */

    async getGuestIdProofById(guestId) {
        const { rows } = await this.#DB.query(
            `
            SELECT id_proof, id_proof_mime
            FROM public.guests
            WHERE id = $1
              AND id_proof IS NOT NULL
            `,
            [Number(guestId)]
        );

        return rows[0]
            ? { buffer: rows[0].id_proof, mime: rows[0].id_proof_mime }
            : null;
    }

    async updateGuestsBulk({
        bookingId,
        guests,
        updatedBy,
        files = [],
        idProofMap = {}
    }) {
        const client = await this.#DB.connect()

        try {
            await client.query("BEGIN")

            for (const guest of guests) {
                const fields = []
                const values = []
                let i = 1

                const set = (key, value) => {
                    fields.push(`${key} = $${i++}`)
                    values.push(value)
                }

                /* ---------- BASIC FIELDS ---------- */
                if (guest.salutation !== undefined) set("salutation", guest.salutation)
                if (guest.first_name !== undefined) set("first_name", guest.first_name?.trim())
                if (guest.middle_name !== undefined) set("middle_name", guest.middle_name?.trim() ?? null)
                if (guest.last_name !== undefined) set("last_name", guest.last_name?.trim())
                if (guest.gender !== undefined) set("gender", guest.gender)

                /* ---------- DOB + AGE ---------- */
                if (guest.dob !== undefined) {
                    set("dob", guest.dob)

                    const age = guest.dob
                        ? Math.floor(
                            (new Date() - new Date(guest.dob)) /
                            (365.25 * 24 * 60 * 60 * 1000)
                        )
                        : null

                    set("age", age)
                }

                /* ---------- OTHER DETAILS ---------- */
                if (guest.have_vehicle !== undefined) set("have_vehicle", guest.have_vehicle)
                if (guest.phone !== undefined) set("phone", guest.phone)
                if (guest.email !== undefined) set("email", guest.email)
                if (guest.guest_type !== undefined) set("guest_type", guest.guest_type)
                if (guest.nationality !== undefined) set("nationality", guest.nationality)
                if (guest.id_type !== undefined) set("id_type", guest.id_type)
                if (guest.id_number !== undefined) set("id_number", guest.id_number)
                if (guest.emergency_contact !== undefined) set("emergency_contact", guest.emergency_contact)
                if (guest.emergency_contact_name !== undefined)
                    set("emergency_contact_name", guest.emergency_contact_name)

                /* ---------- ID PROOF ---------- */
                const proofIndex = idProofMap?.[guest.id]
                if (proofIndex !== undefined && files[proofIndex]) {
                    const file = files[proofIndex]
                    set("id_proof", file.buffer)
                    set("id_proof_mime", file.mimetype)
                }

                /* ---------- UPDATE GUEST ---------- */
                if (fields.length) {
                    set("updated_by", updatedBy)
                    fields.push("updated_on = now()")

                    await client.query(
                        `
                    UPDATE public.guests
                    SET ${fields.join(", ")}
                    WHERE id = $${i}
                      AND booking_id = $${i + 1}
                    `,
                        [...values, guest.id, bookingId]
                    )
                }

                /* ---------- ADDRESS UPSERT ---------- */
                if (guest.address !== undefined) {
                    await client.query(
                        `
                    INSERT INTO public.addresses (
                        entity_type, entity_id, address_type,
                        address_line_1, is_primary, created_by
                    )
                    VALUES ('GUEST', $1, 'HOME', $2, true, $3)
                    ON CONFLICT (entity_type, entity_id, address_type)
                    WHERE is_primary = true
                    DO UPDATE SET
                        address_line_1 = EXCLUDED.address_line_1,
                        updated_by = $3,
                        updated_on = now()
                    `,
                        [guest.id, guest.address, updatedBy]
                    )
                }
            }

            await client.query("COMMIT")
            return { message: "Guests updated successfully" }

        } catch (err) {
            await client.query("ROLLBACK")
            throw err
        } finally {
            client.release()
        }
    }

    async upsertGuestsByBooking({
        bookingId,
        guests,
        removedGuestIds = [],
        createdBy,
        updatedBy,
        files = [],
        idProofMap = {},
        updateAdult = false,
        adult
    }) {
        const client = await this.#DB.connect()

        try {
            await client.query("BEGIN")

            /* ---------- 1️⃣ SOFT DELETE ---------- */
            if (removedGuestIds.length) {
                await client.query(
                    `
                UPDATE public.guests
                SET is_active = false,
                    updated_by = $1,
                    updated_on = now()
                WHERE booking_id = $2
                  AND id = ANY($3::bigint[])
                `,
                    [updatedBy, bookingId, removedGuestIds]
                )
            }

            /* ---------- 2️⃣ UPSERT GUESTS ---------- */
            for (const guest of guests) {
                const isUpdate = Boolean(guest.id)

                let idProofBuffer = null
                let idProofMime = null

                const proofIndex = idProofMap?.[guest.id || guest.temp_key]
                if (proofIndex !== undefined && files[proofIndex]) {
                    idProofBuffer = files[proofIndex].buffer
                    idProofMime = files[proofIndex].mimetype
                }

                const age = guest.dob
                    ? Math.floor(
                        (new Date() - new Date(guest.dob)) /
                        (365.25 * 24 * 60 * 60 * 1000)
                    )
                    : null

                let guestId = guest.id

                if (isUpdate) {
                    /* ---------- UPDATE ---------- */
                    const fields = []
                    const values = []
                    let i = 1

                    const set = (k, v) => {
                        fields.push(`${k} = $${i++}`)
                        values.push(v)
                    }

                    if (guest.salutation !== undefined) set("salutation", guest.salutation)
                    if (guest.first_name !== undefined) set("first_name", guest.first_name.trim())
                    if (guest.middle_name !== undefined) set("middle_name", guest.middle_name?.trim() ?? null)
                    if (guest.last_name !== undefined) set("last_name", guest.last_name?.trim() ?? null)
                    if (guest.gender !== undefined) set("gender", guest.gender)
                    if (guest.dob !== undefined) {
                        set("dob", guest.dob)
                        set("age", age)
                    }
                    if (guest.phone !== undefined) set("phone", guest.phone)
                    if (guest.email !== undefined) set("email", guest.email)
                    if (guest.nationality !== undefined) set("nationality", guest.nationality)
                    if (guest.guest_type !== undefined) set("guest_type", guest.guest_type)
                    if (guest.id_type !== undefined) set("id_type", guest.id_type)
                    if (guest.id_number !== undefined) set("id_number", guest.id_number)
                    if (guest.emergency_contact !== undefined) set("emergency_contact", guest.emergency_contact)
                    if (guest.emergency_contact_name !== undefined)
                        set("emergency_contact_name", guest.emergency_contact_name)

                    if (idProofBuffer) {
                        set("id_proof", idProofBuffer)
                        set("id_proof_mime", idProofMime)
                    }

                    if (fields.length) {
                        set("updated_by", updatedBy)
                        fields.push("updated_on = now()")

                        await client.query(
                            `
                        UPDATE public.guests
                        SET ${fields.join(", ")}
                        WHERE id = $${i}
                          AND booking_id = $${i + 1}
                        `,
                            [...values, guest.id, bookingId]
                        )
                    }
                } else {
                    /* ---------- INSERT ---------- */
                    const { rows } = await client.query(
                        `
                        INSERT INTO public.guests (
                            booking_id,
                            property_id,
                            salutation,
                            first_name,
                            middle_name,
                            last_name,
                            gender,
                            dob,
                            age,
                            phone,
                            email,
                            nationality,
                            guest_type,
                            id_type,
                            id_number,
                            id_proof,
                            id_proof_mime,
                            emergency_contact,
                            emergency_contact_name,
                            is_active,
                            created_by
                        )
                        SELECT
                            b.id,                 -- booking_id
                            b.property_id,        -- property_id
                            $1,                   -- salutation
                            $2,                   -- first_name
                            $3,                   -- middle_name
                            $4,                   -- last_name
                            $5,                   -- gender
                            $6,                   -- dob
                            $7,                   -- age
                            $8,                   -- phone
                            $9,                   -- email
                            $10,                  -- nationality
                            $11,                  -- guest_type
                            $12,                  -- id_type
                            $13,                  -- id_number
                            $14,                  -- id_proof
                            $15,                  -- id_proof_mime
                            $16,                  -- emergency_contact
                            $17,                  -- emergency_contact_name
                            true,                 -- is_active
                            $18                   -- created_by
                        FROM public.bookings b
                        WHERE b.id = $19
                        RETURNING id
                        `,
                        [
                            guest.salutation ?? null,
                            guest.first_name.trim(),
                            guest.middle_name ?? null,
                            guest.last_name ?? null,
                            guest.gender ?? null,
                            guest.dob ?? null,
                            age,
                            guest.phone ?? null,
                            guest.email ?? null,
                            guest.nationality ?? null,
                            guest.guest_type ?? "ADULT",
                            guest.id_type ?? null,
                            guest.id_number ?? null,
                            idProofBuffer,
                            idProofMime,
                            guest.emergency_contact ?? null,
                            guest.emergency_contact_name ?? null,
                            createdBy,
                            bookingId
                        ]
                    );


                    guestId = rows[0].id
                }

                /* ---------- ADDRESS UPSERT (BOTH CASES) ---------- */
                if (guest.address !== undefined) {
                    await client.query(
                        `
                    INSERT INTO public.addresses (
                        entity_type, entity_id, address_type,
                        address_line_1, is_primary, created_by
                    )
                    VALUES ('GUEST', $1, 'HOME', $2, true, $3)
                    ON CONFLICT (entity_type, entity_id, address_type)
                    WHERE is_primary = true
                    DO UPDATE SET
                        address_line_1 = EXCLUDED.address_line_1,
                        updated_by = $3,
                        updated_on = now()
                    `,
                        [guestId, guest.address, updatedBy ?? createdBy]
                    )
                }
            }

            /* ---------- 3️⃣ UPDATE ADULT COUNT ---------- */
            if (updateAdult === true) {
                if (typeof adult !== "number" || adult < 0) {
                    throw new Error("Invalid adult count")
                }

                await client.query(
                    `
                UPDATE public.bookings
                SET adult = $1,
                    updated_by = $2,
                    updated_on = now()
                WHERE id = $3
                `,
                    [adult, updatedBy, bookingId]
                )
            }

            await client.query("COMMIT")
            return { message: "Guests saved successfully" }

        } catch (err) {
            await client.query("ROLLBACK")
            throw err
        } finally {
            client.release()
        }
    }

}

export default Object.freeze(new GuestsService());
