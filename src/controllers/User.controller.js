import role from "../services/Role.service.js";
import supabase from "../services/Supabase.service.js";
import userService from "../services/user.service.js";

class User {
    async createUser(req, res) {

        const { email, password, role_ids, property_id } = req.body;

        try {
            const { data, error } = await supabase.createUser({ email, password })

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            const authUserId = data.user.id;

            const user = await userService.createUser({ authUserId, email, property_id })
            const userId = user.id

            for (const roleId of role_ids) {
                await role.createUserRole({ userId, roleId })
            }

            res.status(201).json({
                message: "User created successfully",
                user_id: userId
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to create user" });
        }
    }

    getMe(req, res) {
        res.json({
            user_id: req.user.user_id,
            email: req.user.email,
            roles: req.user.roles,
            property_id: req.user.property_id
        });
    }
}

const user = new User();
Object.freeze(user);

export default user;