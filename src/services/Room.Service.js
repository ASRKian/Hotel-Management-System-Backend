import { getDb } from "../../utils/getDb.js";

class RoomService {

    #DB

    constructor() {
        this.#DB = getDb()
    }

    async bulkCreateRooms({
        propertyId,
        floors,          // [{ floor_number, rooms }]
        prefix = "",
        roomSerialNumber = 101,
        createdBy,
    }) {
        if (!Array.isArray(floors) || floors.length === 0) {
            return [];
        }

        const values = [];
        const bindings = [];
        let i = 1;

        for (const floor of floors) {
            const floorNumber = floor.floor_number;
            const roomCount = floor.rooms_count;

            for (let roomIndex = 1; roomIndex <= roomCount; roomIndex++) {
                const roomNoNumber =
                    roomSerialNumber + (floorNumber * 100) + (roomIndex - 1);

                const roomNo = `${prefix}${roomNoNumber}`;

                values.push(`(
                            $${i++},  -- room_no
                            $${i++},  -- room_type
                            $${i++},  -- property_id
                            $${i++},  -- floor_number
                            true,
                            $${i++},  -- created_by
                            now(),
                            $${i++},  -- updated_by
                            now()
                        )`);

                bindings.push(
                    roomNo,
                    "STANDARD",
                    propertyId,
                    floorNumber,
                    createdBy,
                    createdBy
                );
            }
        }

        const query = `
        INSERT INTO public.ref_rooms (
            room_no,
            room_type,
            property_id,
            floor_number,
            is_active,
            created_by,
            created_on,
            updated_by,
            updated_on
        )
        VALUES ${values.join(",")}
        ON CONFLICT (property_id, lower(room_no)) DO NOTHING
        RETURNING id, room_no, floor_number
    `;

        const { rows } = await this.#DB.query(query, bindings);
        return rows;
    }

    async getRoomsByProperty(propertyId) {
        const { rows } = await this.#DB.query(
            `
        SELECT *
        FROM public.ref_rooms
        WHERE property_id = $1
        ORDER BY floor_number, room_no
        `,
            [propertyId]
        );
        return rows;
    }

    async getRoomByNumber({ propertyId, roomNo }) {
        const { rows } = await this.#DB.query(
            `
        SELECT *
        FROM public.ref_rooms
        WHERE property_id = $1
          AND lower(room_no) = lower($2)
        `,
            [propertyId, roomNo]
        );
        return rows[0];
    }

    async getRoomById(roomId) {
        const { rows } = await this.#DB.query(
            `SELECT * FROM public.ref_rooms WHERE id = $1`,
            [roomId]
        );
        return rows[0];
    }

    async bulkUpdateRooms({ updates, updatedBy }) {
        if (!Array.isArray(updates) || updates.length === 0) {
            return [];
        }

        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            const ids = updates.map(u => u.id);

            const { rows: existingRooms } = await client.query(
                `
            SELECT id, property_id, floor_number, is_active
            FROM public.ref_rooms
            WHERE id = ANY($1)
            FOR UPDATE
            `,
                [ids]
            );

            const roomMap = new Map();
            for (const r of existingRooms) {
                roomMap.set(r.id, r);
            }

            const roomNoCases = [];
            const roomTypeCases = [];
            const activeCases = [];
            const bindings = [];

            let i = 1;

            for (const u of updates) {
                roomNoCases.push(`WHEN id = $${i} THEN $${i + 1}`);
                bindings.push(u.id, u.room_no);
                i += 2;

                roomTypeCases.push(`WHEN id = $${i} THEN $${i + 1}`);
                bindings.push(u.id, u.room_type);
                i += 2;

                activeCases.push(`WHEN id = $${i} THEN $${i + 1}`);
                bindings.push(u.id, u.is_active);
                i += 2;
            }

            bindings.push(updatedBy);
            bindings.push(ids);

            const updateQuery = `
            UPDATE public.ref_rooms
            SET
                room_no = CASE ${roomNoCases.join(" ")} ELSE room_no END,
                room_type = CASE ${roomTypeCases.join(" ")} ELSE room_type END,
                is_active = CASE ${activeCases.join(" ")} ELSE is_active END,
                updated_by = $${i},
                updated_on = now()
            WHERE id = ANY($${i + 1})
            RETURNING id, property_id, floor_number, is_active
        `;

            const { rows: updatedRooms } =
                await client.query(updateQuery, bindings);

            const floorDelta = new Map();

            for (const updated of updatedRooms) {
                const prev = roomMap.get(updated.id);
                if (!prev) continue;

                if (!prev.is_active && updated.is_active) {
                    const key = `${updated.property_id}_${updated.floor_number}`;
                    floorDelta.set(key, (floorDelta.get(key) || 0) + 1);
                }

                if (prev.is_active && !updated.is_active) {
                    const key = `${updated.property_id}_${updated.floor_number}`;
                    floorDelta.set(key, (floorDelta.get(key) || 0) - 1);
                }
            }

            for (const [key, delta] of floorDelta.entries()) {
                if (delta === 0) continue;

                const [propertyId, floorNumber] = key.split("_");

                await client.query(
                    `
                UPDATE public.property_floors
                SET
                    rooms_count = GREATEST(rooms_count + $3, 0),
                    updated_by = $4,
                    updated_at = now()
                WHERE property_id = $1
                  AND floor_number = $2
                `,
                    [
                        Number(propertyId),
                        Number(floorNumber),
                        delta,
                        updatedBy,
                    ]
                );
            }

            const propertyDelta = new Map();

            for (const updated of updatedRooms) {
                const prev = roomMap.get(updated.id);
                if (!prev) continue;

                if (!prev.is_active && updated.is_active) {
                    propertyDelta.set(
                        updated.property_id,
                        (propertyDelta.get(updated.property_id) || 0) + 1
                    );
                }

                if (prev.is_active && !updated.is_active) {
                    propertyDelta.set(
                        updated.property_id,
                        (propertyDelta.get(updated.property_id) || 0) - 1
                    );
                }
            }

            for (const [propertyId, delta] of propertyDelta.entries()) {
                if (delta === 0) continue;

                await client.query(
                    `
                    UPDATE public.properties
                    SET
                        total_rooms = GREATEST(COALESCE(total_rooms, 0) + $2, 0),
                        updated_by = $3,
                        updated_on = now()
                    WHERE id = $1
                    `,
                    [propertyId, delta, updatedBy]
                );
            }

            await client.query("COMMIT");
            return updatedRooms;

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    async addRoom({
        propertyId,
        floorNumber,
        roomType = "STANDARD",
        createdBy,
    }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            const { rows: maxFloorRows } = await client.query(
                `
                SELECT COALESCE(MAX(floor_number), -1) AS max_floor
                FROM public.property_floors
                WHERE property_id = $1
                `,
                [propertyId]
            );

            const currentMaxFloor = Number(maxFloorRows[0].max_floor);

            if (floorNumber > currentMaxFloor) {
                for (let f = currentMaxFloor + 1; f <= floorNumber; f++) {
                    await client.query(
                        `
                    INSERT INTO public.property_floors (
                        property_id,
                        floor_number,
                        rooms_count,
                        created_by,
                        created_at,
                        updated_by,
                        updated_at
                    )
                    VALUES ($1, $2, 0, $3, now(), $3, now())
                    ON CONFLICT (property_id, floor_number) DO NOTHING
                    `,
                        [propertyId, f, createdBy]
                    );
                }
            }

            const { rows: lastRoomRows } = await client.query(
                `
            SELECT room_no
            FROM public.ref_rooms
            WHERE property_id = $1
            AND floor_number = $2
            ORDER BY CAST(regexp_replace(room_no, '\\D', '', 'g') AS INT) DESC
            LIMIT 1
            FOR UPDATE
            `,
                [propertyId, floorNumber]
            );

            let prefix = "";
            let nextRoomNumber;
            let width;

            if (lastRoomRows.length > 0) {
                const lastRoomNo = lastRoomRows[0].room_no;
                // const numeric = parseInt(lastRoomNo.replace(/\D/g, ""), 10);
                const numericPart = lastRoomNo.replace(/\D/g, "");
                const numeric = parseInt(numericPart, 10);
                width = numericPart.length;

                prefix = lastRoomNo.replace(/\d/g, "");
                nextRoomNumber = numeric + 1;

            } else {
                const { rows: baseRows } = await client.query(
                    `
                SELECT room_no, floor_number
                FROM public.ref_rooms
                WHERE property_id = $1
                ORDER BY floor_number ASC,
                         CAST(regexp_replace(room_no, '\\D', '', 'g') AS INT) ASC
                LIMIT 1
                FOR UPDATE
                `,
                    [propertyId]
                );

                if (baseRows.length === 0) {
                    throw new Error(
                        "No existing rooms found. Run bulk room creation first."
                    );
                }

                const baseRoomNo = baseRows[0].room_no;
                const baseFloor = baseRows[0].floor_number;

                const baseNumericPart = baseRoomNo.replace(/\D/g, "");
                const baseNumeric = parseInt(baseNumericPart, 10);
                width = baseNumericPart.length;

                prefix = baseRoomNo.replace(/\d/g, "");

                nextRoomNumber =
                    baseNumeric + (floorNumber - baseFloor) * 100;

            }

            // const finalRoomNo = `${prefix}${nextRoomNumber}`;
            const paddedNumber = String(nextRoomNumber).padStart(width, "0");
            const finalRoomNo = `${prefix}${paddedNumber}`;


            const { rows } = await client.query(
                `
                INSERT INTO public.ref_rooms (
                    room_no,
                    room_type,
                    property_id,
                    floor_number,
                    is_active,
                    created_by,
                    created_on,
                    updated_by,
                    updated_on
                )
                VALUES ($1, $2, $3, $4, true, $5, now(), $5, now())
                RETURNING id, room_no, floor_number
                `,
                [finalRoomNo, roomType, propertyId, floorNumber, createdBy]
            );

            await client.query(
                `
                UPDATE public.property_floors
                SET
                    rooms_count = rooms_count + 1,
                    updated_by = $3,
                    updated_at = now()
                WHERE property_id = $1
                AND floor_number = $2
                `,
                [propertyId, floorNumber, createdBy]
            );

            await client.query(
                `
                UPDATE public.properties
                SET
                    total_rooms = COALESCE(total_rooms, 0) + 1,
                    total_floors = GREATEST(
                        COALESCE(total_floors, 0),
                        $2 + 1
                    ),
                    updated_by = $3,
                    updated_on = now()
                WHERE id = $1
                `,
                [propertyId, floorNumber, createdBy]
            );

            await client.query("COMMIT");
            return rows[0];

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    async deleteRoom({ roomId, deletedBy }) {
        const client = await this.#DB.connect();

        try {
            await client.query("BEGIN");

            const { rows } = await client.query(
                `
            SELECT id, property_id, floor_number, is_active
            FROM public.ref_rooms
            WHERE id = $1
            FOR UPDATE
            `,
                [roomId]
            );

            if (!rows.length) {
                throw new Error("Room not found");
            }

            const room = rows[0];

            if (!room.is_active) {
                throw new Error("Room already inactive");
            }

            await client.query(
                `
            UPDATE public.ref_rooms
            SET
                is_active = false,
                updated_by = $2,
                updated_on = now()
            WHERE id = $1
            `,
                [roomId, deletedBy]
            );

            await client.query(
                `
            UPDATE public.property_floors
            SET
                rooms_count = GREATEST(rooms_count - 1, 0),
                updated_by = $3,
                updated_at = now()
            WHERE property_id = $1
              AND floor_number = $2
            `,
                [room.property_id, room.floor_number, deletedBy]
            );

            await client.query(
                `
                UPDATE public.properties
                SET
                    total_rooms = GREATEST(COALESCE(total_rooms, 0) - 1, 0),
                    updated_by = $2,
                    updated_on = now()
                WHERE id = $1
                `,
                [room.property_id, deletedBy]
            );

            await client.query("COMMIT");

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    async getAvailableRooms({
        propertyId,
        arrivalDate,
        departureDate,
        roomType,
        limit = 50,
        offset = 0,
    }) {
        const params = [
            propertyId,
            arrivalDate,
            departureDate,
        ]

        let roomTypeFilter = ""
        if (roomType) {
            params.push(roomType)
            roomTypeFilter = `AND r.room_type = $${params.length}`
        }

        params.push(limit, offset)

        const { rows } = await this.#DB.query(
            `
            SELECT
            r.id,
            r.room_no,
            r.room_type,
            r.floor_number
            FROM public.ref_rooms r
            WHERE r.property_id = $1
            ${roomTypeFilter}
            AND NOT EXISTS (
                SELECT 1
                FROM public.room_details rd
                JOIN public.bookings b
                ON b.id = rd.booking_id
                WHERE rd.ref_room_id = r.id
                AND b.booking_status IN ('RESERVED','CONFIRMED','CHECKED_IN')
                AND (
                    b.estimated_arrival < $3
                    AND b.estimated_departure > $2
                )
            )
            ORDER BY r.room_type, r.room_no
            LIMIT $${params.length - 1}
            OFFSET $${params.length}
            `,
            params
        )

        return rows
    }

    async checkRoomAvailability({
        roomId,
        arrivalDate,
        departureDate,
    }) {
        const { rowCount } = await this.#DB.query(
            `
            SELECT 1
            FROM public.room_details rd
            JOIN public.bookings b
            ON b.id = rd.booking_id
            WHERE rd.ref_room_id = $1
            AND b.booking_status IN ('RESERVED','CONFIRMED','CHECKED_IN')
            AND (
                b.estimated_arrival < $3
                AND b.estimated_departure > $2
            )
            LIMIT 1
            `,
            [roomId, arrivalDate, departureDate]
        )

        return rowCount === 0
    }


}

export default Object.freeze(new RoomService())