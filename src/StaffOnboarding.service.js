import { getDb } from "../utils/getDb.js"
import role from "./services/Role.service.js"
import StaffService from "./services/Staff.service.js"
import supabase from "./services/Supabase.service.js"
import userService from "./services/user.service.js"


class StaffOnboardingService {

    #DB

    constructor() {
        this.#DB = getDb()
    }

    async createStaffWithUser({ payload, files, createdBy }) {
        const client = await this.#DB.connect()
        let authUserId

        try {
            const { data, error } = await supabase.createUser({
                email: payload.email,
                password: payload.password,
            })

            if (error) {
                throw error
            }
            authUserId = data.user.id

            await client.query("BEGIN")

            const user = await userService.createUser({
                client,
                authUserId,
                email: payload.email,
                propertyId: payload.property_id,
                created_by: createdBy
            })

            for (const roleId of payload.role_ids) {
                await role.createUserRole({
                    client,
                    userId: user.id,
                    roleId,
                })
            }

            const staff = await StaffService.create({
                client,
                payload: { ...payload, user_id: user.id },
                files,
                userId: createdBy,
            })

            /* ---------- VISA SAVE ---------- */
            if (payload.nationality === "foreigner") {
                await client.query(
                    `
                    INSERT INTO public.visa_details (
                        visa_number,
                        issued_date,
                        expiry_date,
                        staff_id
                    )
                    VALUES ($1, $2, $3, $4)
                    `,
                    [
                        payload.visa_number,
                        payload.visa_issue_date,
                        payload.visa_expiry_date,
                        staff.id
                    ]
                );
            }


            const adminRoleCheck = await client.query(
                `
                SELECT 1
                FROM public.roles
                WHERE id = ANY($1::bigint[])
                    AND UPPER(name) = 'ADMIN'
                LIMIT 1
                `,
                [payload.role_ids]
            )


            const isAdmin = adminRoleCheck.rowCount > 0

            if (isAdmin) {
                await client.query(
                    `
                    INSERT INTO public.property_admins (
                    property_id,
                    user_id,
                    role,
                    created_by
                    )
                    VALUES ($1, $2, 'ADMIN', $3)
                    ON CONFLICT (property_id, user_id) DO NOTHING
                    `,
                    [
                        payload.property_id,
                        authUserId,
                        createdBy,
                    ]
                )
            }


            await client.query("COMMIT")

            return { staff_id: staff.id, user_id: user.id }

        } catch (err) {
            console.log("🚀 ~ StaffOnboardingService ~ createStaffWithUser ~ err:", err)
            await client.query("ROLLBACK")

            if (authUserId) {
                await supabase.deleteUser(authUserId)
            }

            throw err
        } finally {
            client.release()
        }
    }

    async updateStaffWithUser({ staffId, payload, files, updatedBy }) {
        const client = await this.#DB.connect()

        try {
            await client.query("BEGIN")

            if (payload.email || payload.password) {
                await supabase.updateUser({
                    authUserId: payload.user_id,
                    email: payload.email,
                    password: payload.password
                })
            }

            await userService.updateUser({
                client,
                userId: payload.user_id,
                payload,
                updatedBy
            })

            if (Array.isArray(payload.role_ids)) {
                await client.query(
                    `DELETE FROM public.user_roles WHERE user_id = $1`,
                    [payload.user_id]
                )

                for (const roleId of payload.role_ids) {
                    await client.query(
                        `
                        insert into public.user_roles (user_id, role_id)
                        values ($1, $2)
                        `,
                        [payload.user_id, roleId]
                    );
                }
            }

            await StaffService.update(
                staffId,
                payload,
                files,
                updatedBy,
                client
            )

            /* ---------- VISA UPDATE ---------- */
            if (payload.nationality === "foreigner") {

                const { rowCount } = await client.query(
                    `SELECT 1 FROM public.visa_details WHERE staff_id = $1`,
                    [staffId]
                );

                if (rowCount) {
                    // update existing
                    await client.query(
                        `
                        UPDATE public.visa_details
                        SET
                            visa_number = $1,
                            issued_date = $2,
                            expiry_date = $3
                        WHERE staff_id = $4
                        `,
                        [
                            payload.visa_number,
                            payload.visa_issue_date,
                            payload.visa_expiry_date,
                            staffId
                        ]
                    );
                } else {
                    // insert new
                    await client.query(
                        `
                        INSERT INTO public.visa_details (
                            visa_number,
                            issued_date,
                            expiry_date,
                            staff_id
                        )
                        VALUES ($1, $2, $3, $4)
                        `,
                        [
                            payload.visa_number,
                            payload.visa_issue_date,
                            payload.visa_expiry_date,
                            staffId
                        ]
                    );
                }

            } else {
                // if nationality changed from foreigner → indian, clean visa
                await client.query(
                    `DELETE FROM public.visa_details WHERE staff_id = $1`,
                    [staffId]
                );
            }


            if (Array.isArray(payload.role_ids)) {
                const { rowCount } = await client.query(
                    `
                    SELECT 1
                    FROM public.roles
                    WHERE id = ANY($1::bigint[])
                    AND UPPER(name) = 'ADMIN'
                    LIMIT 1
                    `,
                    [payload.role_ids]
                )

                if (rowCount) {
                    await client.query(
                        `
                        DELETE FROM public.property_admins
                        WHERE user_id = $1
                        `,
                        [payload.user_id]
                    )

                    await client.query(
                        `
                        INSERT INTO public.property_admins (
                            property_id,
                            user_id,
                            role,
                            created_by
                        )
                        VALUES ($1, $2, 'ADMIN', $3)
                        `,
                        [
                            payload.property_id,
                            payload.user_id,
                            updatedBy
                        ]
                    )
                } else {
                    await client.query(
                        `
                        DELETE FROM public.property_admins
                        WHERE user_id = $1
                        `,
                        [payload.user_id]
                    )
                }
            }

            await client.query("COMMIT")

            return { staff_id: staffId, user_id: payload.user_id }

        } catch (err) {
            await client.query("ROLLBACK")
            console.error("updateStaffWithUser error:", err)
            throw err
        } finally {
            client.release()
        }
    }

}

export default Object.freeze(new StaffOnboardingService())
