import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

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

        const enquiry = result.rows[0];

        await AuditService.log({
            property_id: enquiry.property_id,
            event_id: enquiry.id,
            table_name: "enquiries",
            event_type: "CREATE",
            task_name: "Create Enquiry",
            comments: "New enquiry created",
            details: JSON.stringify({
                guest_name: enquiry.guest_name,
                mobile: enquiry.mobile,
                enquiry_type: enquiry.enquiry_type,
                status: enquiry.status,
                check_in: enquiry.check_in,
                check_out: enquiry.check_out
            }),
            user_id: userId
        });

        return enquiry;
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

        const updated = result.rows[0];

        await AuditService.log({
            property_id: updated.property_id,
            event_id: updated.id,
            table_name: "enquiries",
            event_type: "UPDATE",
            task_name: "Update Enquiry",
            comments: "Enquiry updated",
            details: JSON.stringify({
                updated_fields: Object.keys(payload),
                new_values: payload
            }),
            user_id: userId
        });

        return updated;
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

        const deactivated = result.rows[0];

        await AuditService.log({
            property_id: deactivated.property_id,
            event_id: deactivated.id,
            table_name: "enquiries",
            event_type: "DEACTIVATE",
            task_name: "Deactivate Enquiry",
            comments: "Enquiry deactivated",
            details: JSON.stringify({
                previous_status: deactivated.status,
                is_active: false
            }),
            user_id: userId
        });

        return deactivated;
    }
}

export default Object.freeze(new EnquiryService());
