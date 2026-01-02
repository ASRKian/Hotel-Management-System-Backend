import { getDb } from "../utils/getDb.js";
import { roles } from "../utils/roles.js";
import supabase from "../src/services/Supabase.service.js";
import role from "../src/services/Role.service.js";
import user from "../src/services/user.service.js";

(async function () {
    const email = process.env.SUPERADMIN_EMAIL || "superadmin@atithiflow.com";
    const password = process.env.SUPERADMIN_PASSWORD || "ChangeMe@123";
    const propertyId = null;

    const { data, error } = await supabase.client().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        // app_metadata: { roles: [roles.SUPER_ADMIN] }
    });

    if (error) {
        console.error("Auth user error:", error.message);
        process.exit(1);
    }

    const authUserId = data.user.id;

    const db = getDb()

    const roleName = roles.SUPER_ADMIN
    const roleId = await role.createRole({ roleName })

    const userRes = await user.createUser({ authUserId, email, propertyId })

    const userId = userRes.id;

    await db.query(
        `
    insert into user_roles (user_id, role_id)
    values ($1, $2)
    `,
        [userId, roleId]
    );

    console.log("Super Admin created successfully");
    console.log("Email:", email);
    console.log("Password:", password);
    await db.end()
    process.exit(0)
})()
