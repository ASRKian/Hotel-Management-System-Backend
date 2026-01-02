import { getDb } from "../../utils/getDb.js";

class PackageService {
    constructor() {
        this.db = getDb();
    }

    async createPackage({
        propertyId,
        packageName,
        description,
        basePrice = 0,
        createdBy,
        isActive = true
    }) {
        const { rows } = await this.db.query(
            `
            INSERT INTO public.packages (
                property_id,
                package_name,
                description,
                base_price,
                is_active,
                created_on,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, now(), $6)
            RETURNING *
            `,
            [propertyId, packageName, description, basePrice, isActive, createdBy]
        );

        return rows[0];
    }

    async getPackagesByProperty(propertyId) {
        const { rows } = await this.db.query(
            `
            SELECT
                id,
                package_name
            FROM public.packages
            WHERE property_id = $1
            --AND is_active = true
            ORDER BY package_name
            `,
            [propertyId]
        );

        return rows;
    }

    async getPackageById(id) {
        const { rows } = await this.db.query(
            `
            SELECT *
            FROM public.packages
            WHERE id = $1
            `,
            [id]
        );

        return rows[0];
    }

    async getPackagesByUser(userId) {
        console.log("🚀 ~ PackageService ~ getPackagesByUser ~ userId:", userId)
        const { rows } = await this.db.query(
            `
            SELECT
            p.id,
            p.package_name
            FROM public.packages p
            INNER JOIN public.users u
            ON u.property_id = p.property_id
            WHERE u.id = $1
            ORDER BY p.package_name
            `,
            [userId]
        )

        return rows
    }


    async updatePackage({
        id,
        packageName,
        description,
        basePrice,
        isActive,
        updatedBy,
    }) {
        if (!id) {
            throw new Error("Package id is required");
        }

        const fields = [];
        const values = [];
        let idx = 1;

        if (packageName !== undefined) {
            fields.push(`package_name = $${++idx}`);
            values.push(packageName);
        }

        if (description !== undefined) {
            fields.push(`description = $${++idx}`);
            values.push(description);
        }

        if (basePrice !== undefined) {
            fields.push(`base_price = $${++idx}`);
            values.push(basePrice);
        }

        if (isActive !== undefined) {
            fields.push(`is_active = $${++idx}`);
            values.push(isActive);
        }

        if (updatedBy) {
            fields.push(`updated_by = $${++idx}`);
            values.push(updatedBy);
        }

        if (fields.length === 0) {
            throw new Error("No fields provided to update");
        }

        const query = `
                        UPDATE public.packages
                        SET
                            ${fields.join(", ")},
                            updated_on = now()
                        WHERE id = $1
                        RETURNING *
                        `;

        const { rows } = await this.db.query(query, [id, ...values]);

        if (!rows.length) {
            throw new Error("Package not found");
        }

        return rows[0];
    }

    async deactivatePackage(id) {
        const { rows } = await this.db.query(
            `
            UPDATE public.packages
            SET
                is_active = false,
                updated_on = now()
            WHERE id = $1
            RETURNING *
            `,
            [id]
        );

        return rows[0];
    }
}

export default Object.freeze(new PackageService);
