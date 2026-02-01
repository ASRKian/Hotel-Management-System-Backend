import { getDb } from "../../utils/getDb.js";
import AuditService from "./Audit.service.js";

class LaundryService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    async getByPropertyId(propertyId) {
        const query = `
            select *
            from public.laundry
            where property_id = $1
            order by system_generated desc, item_name;
        `;
        const { rows } = await this.#DB.query(query, [propertyId]);
        return rows;
    }

    async createLaundry({
        propertyId,
        itemName,
        description,
        itemRate,
        userId
    }) {
        const query = `
            insert into public.laundry (
                property_id,
                item_name,
                description,
                item_rate,
                system_generated,
                created_by
            )
            values ($1, $2, $3, $4, false, $5)
            returning *;
        `;

        const { rows } = await this.#DB.query(query, [
            propertyId,
            itemName,
            description ?? null,
            itemRate ?? 0,
            userId
        ]);

        await AuditService.log({
            property_id: propertyId,
            event_id: rows[0].id,
            table_name: "laundry",
            event_type: "CREATE",
            task_name: "Create Laundry Item",
            comments: "Laundry item created",
            details: JSON.stringify({
                laundry_id: rows[0].id,
                item_name: itemName,
                description: description ?? null,
                item_rate: itemRate ?? 0,
                system_generated: false
            }),
            user_id: userId
        });


        return rows[0];
    }

    async bulkUpdate({ updates, userId }) {
        if (!Array.isArray(updates) || updates.length === 0) {
            throw new Error("Updates array is required");
        }

        const ids = updates.map(u => u.id);

        const names = updates.map(u => u.itemName ?? null);
        const descriptions = updates.map(u => u.description ?? null);
        const rates = updates.map(u => u.itemRate ?? null);

        const query = `
        update public.laundry l
        set
            item_name = coalesce(u.item_name, l.item_name),
            description = coalesce(u.description, l.description),
            item_rate = coalesce(u.item_rate, l.item_rate),
            updated_by = $5,
            updated_on = now()
        from (
            select
                unnest($1::bigint[]) as id,
                unnest($2::text[]) as item_name,
                unnest($3::text[]) as description,
                unnest($4::numeric[]) as item_rate
        ) u
        where l.id = u.id
        returning l.*;
    `;

        const { rows } = await this.#DB.query(query, [
            ids,
            names,
            descriptions,
            rates,
            userId
        ]);

        // await AuditService.log({
        //     property_id: rows[0]?.property_id ?? null,
        //     event_id: null,
        //     table_name: "laundry",
        //     event_type: "BULK_UPDATE",
        //     task_name: "Bulk Update Laundry Items",
        //     comments: "Laundry items updated in bulk",
        //     details: JSON.stringify({
        //         updated_ids: ids,
        //         updates: updates.map(u => ({
        //             id: u.id,
        //             item_name: u.itemName ?? null,
        //             description: u.description ?? null,
        //             item_rate: u.itemRate ?? null
        //         }))
        //     }),
        //     user_id: userId
        // });

        return rows;
    }

}

export default Object.freeze(new LaundryService());
