import { getDb } from "../../utils/getDb.js";

class EnquiryService {
    #DB;

    constructor() {
        this.#DB = getDb();
    }

    /**
     * GET Enquiries by Property ID (Paginated)
     */
    async getEnquiriesByPropertyId({
        propertyId,
        status,
        isActive = true,
        fromDate,
        toDate,
        page = 1,
        pageSize = 10,
    }) {
        const limit = Math.min(Number(pageSize) || 10, 100); // safety cap
        const currentPage = Math.max(Number(page) || 1, 1);
        const offset = (currentPage - 1) * limit;

        let whereClause = `
      WHERE property_id = $1
        AND is_active = $2
    `;

        const values = [propertyId, isActive];
        let i = values.length + 1;

        if (status) {
            whereClause += ` AND status = $${i++}`;
            values.push(status);
        }

        if (fromDate) {
            whereClause += ` AND created_on >= $${i++}`;
            values.push(fromDate);
        }

        if (toDate) {
            whereClause += ` AND created_on <= $${i++}`;
            values.push(toDate);
        }

        const dataQuery = `
      SELECT *
      FROM public.enquiries
      ${whereClause}
      ORDER BY created_on DESC
      LIMIT $${i++}
      OFFSET $${i++};
    `;

        const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM public.enquiries
      ${whereClause};
    `;

        const dataResult = await this.#DB.query(
            dataQuery,
            [...values, limit, offset]
        );

        const countResult = await this.#DB.query(countQuery, values);

        const total = countResult.rows[0]?.total || 0;

        return {
            data: dataResult.rows,
            pagination: {
                page: currentPage,
                pageSize: limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * CREATE Enquiry
     */
    async createEnquiry(payload, userId) {
        const query = `
    INSERT INTO public.enquiries (
      property_id,
      booking_id,
      guest_name,
      mobile,
      email,
      source,
      enquiry_type,
      status,
      agent_name,
      room_type,
      no_of_rooms,
      check_in,
      check_out,
      booked_by,
      comment,
      follow_up_date,
      quote_amount,
      is_reserved,
      created_by
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,
      COALESCE($8, 'open'),
      $9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
    )
    RETURNING *;
  `;

        const values = [
            payload.property_id,          // $1
            payload.booking_id ?? null,   // $2
            payload.guest_name,           // $3
            payload.mobile ?? null,       // $4
            payload.email ?? null,        // $5
            payload.source ?? null,       // $6
            payload.enquiry_type ?? null, // $7
            payload.status ?? "open",     // $8
            payload.agent_name ?? null,   // $9
            payload.room_type ?? null,    // $10
            payload.no_of_rooms ?? null,  // $11
            payload.check_in ?? null,     // $12
            payload.check_out ?? null,    // $13
            payload.booked_by ?? null,    // $14
            payload.comment ?? null,      // $15
            payload.follow_up_date ?? null,// $16
            payload.quote_amount ?? null, // $17
            payload.is_reserved ?? false, // $18
            userId,                       // $19
        ];

        const result = await this.#DB.query(query, values);
        return result.rows[0];
    }

    /**
     * UPDATE Enquiry (Partial Update)
     */
    async updateEnquiry(enquiryId, payload, userId) {
        const fields = [];
        const values = [];
        let i = 1;

        for (const [key, value] of Object.entries(payload)) {
            if (key === "id") continue;
            fields.push(`${key} = $${i++}`);
            values.push(value);
        }

        if (fields.length === 0) {
            throw new Error("No fields provided for update");
        }

        // audit fields
        fields.push(`updated_by = $${i++}`);
        values.push(userId);

        fields.push(`updated_on = now()`);

        const query = `
      UPDATE public.enquiries
      SET ${fields.join(", ")}
      WHERE id = $${i}
      RETURNING *;
    `;

        values.push(enquiryId);

        const result = await this.#DB.query(query, values);

        if (result.rowCount === 0) {
            throw new Error("Enquiry not found");
        }

        return result.rows[0];
    }

    /**
     * SOFT DELETE (Deactivate)
     */
    async deactivateEnquiry(enquiryId, userId) {
        const query = `
      UPDATE public.enquiries
      SET 
        is_active = false,
        updated_by = $2,
        updated_on = now()
      WHERE id = $1
      RETURNING *;
    `;

        const result = await this.#DB.query(query, [enquiryId, userId]);

        if (result.rowCount === 0) {
            throw new Error("Enquiry not found");
        }

        return result.rows[0];
    }
}

export default Object.freeze(new EnquiryService());
