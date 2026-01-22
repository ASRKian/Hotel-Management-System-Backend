import { getDb } from "../../utils/getDb.js";

class LaundryOrderService {

    #DB;

    constructor() {
        this.#DB = getDb();
    }

    async createOrder({
        laundryId,
        roomId,
        bookingId,
        propertyId,
        vendorId,
        itemCount,
        pickupDate,
        deliveryDate,
        userId
    }) {
        const qty = Number(itemCount) || 0;
        if (qty <= 0) {
            throw new Error("Item count must be greater than zero");
        }

        /* -------- FETCH LAUNDRY MASTER -------- */
        const laundryQuery = `
            select
                id,
                item_name,
                item_rate
            from public.laundry
            where id = $1
              and property_id = $2;
        `;

        const laundryRes = await this.#DB.query(laundryQuery, [
            laundryId,
            propertyId
        ]);

        if (laundryRes.rowCount === 0) {
            throw new Error("Invalid laundry item for this property");
        }

        const { item_name, item_rate } = laundryRes.rows[0];

        /* -------- DERIVE LAUNDRY TYPE -------- */
        const laundryType = bookingId ? "GUEST" : "HOTEL";

        const rate = Number(item_rate) || 0;
        const amount = qty * rate;

        /* -------- CREATE ORDER -------- */
        const orderQuery = `
            insert into public.laundry_orders (
                laundry_id,
                room_id,
                booking_id,
                property_id,
                vendor_id,
                item_name,
                laundry_type,
                item_count,
                item_rate,
                amount,
                laundry_status,
                pickup_date,
                delivery_date,
                created_by
            )
            values (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                'PENDING',
                $11,$12,$13
            )
            returning *;
        `;

        const { rows } = await this.#DB.query(orderQuery, [
            laundryId,
            roomId,
            bookingId,
            propertyId,
            vendorId,
            item_name,
            laundryType,
            qty,
            rate,
            amount,
            pickupDate,
            deliveryDate,
            userId
        ]);

        return rows[0];
    }

    async getByPropertyId({
        propertyId,
        page = 1,
        limit = 10
    }) {
        const safePage = Math.max(Number(page), 1);
        const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
        const offset = (safePage - 1) * safeLimit;

        /* -------- fetch paginated data -------- */
        const dataQuery = `
        select *
        from public.laundry_orders
        where property_id = $1
        order by created_on desc
        limit $2 offset $3;
    `;

        /* -------- fetch total count -------- */
        const countQuery = `
        select count(*)::int as total
        from public.laundry_orders
        where property_id = $1;
    `;

        const [dataRes, countRes] = await Promise.all([
            this.#DB.query(dataQuery, [propertyId, safeLimit, offset]),
            this.#DB.query(countQuery, [propertyId])
        ]);

        const total = countRes.rows[0].total;
        const totalPages = Math.ceil(total / safeLimit);

        return {
            data: dataRes.rows,
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages
            }
        };
    }

    async updateOrder({
        id,
        itemCount,
        laundryStatus,
        pickupDate,
        deliveryDate,
        userId
    }) {
        const rateQuery = `
            select item_rate
            from public.laundry_orders
            where id = $1;
        `;

        const rateRes = await this.#DB.query(rateQuery, [id]);
        if (!rateRes.rowCount) {
            throw new Error("Laundry order not found");
        }

        const rate = Number(rateRes.rows[0].item_rate) || 0;
        const qty = Number(itemCount) || 0;
        const amount = qty * rate;

        const query = `
            update public.laundry_orders
            set
                item_count = coalesce($2, item_count),
                amount = $3,
                laundry_status = coalesce($4, laundry_status),
                pickup_date = coalesce($5, pickup_date),
                delivery_date = coalesce($6, delivery_date),
                updated_by = $7,
                updated_on = now()
            where id = $1
              and laundry_status not in ('DELIVERED', 'CANCELLED')
            returning *;
        `;

        const { rows, rowCount } = await this.#DB.query(query, [
            id,
            qty,
            amount,
            laundryStatus,
            pickupDate,
            deliveryDate,
            userId
        ]);

        if (!rowCount) {
            throw new Error("Laundry order cannot be updated");
        }

        return rows[0];
    }
}

export default Object.freeze(new LaundryOrderService());
