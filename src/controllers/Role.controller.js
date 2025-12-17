import role from "../services/Role.service.js";

class Role {
    async createRole(req, res) {
        try {
            const { roleName } = req.body;
            const roleId = await role.createRole({ roleName })
            return res.status(201).json({
                message: "Role created successfully",
                roleId
            })
        } catch (error) {
            console.log("🚀 ~ Role ~ createRole ~ error:", error)
            res.status(500).json({ error: "Failed to create user" });
        }
    }

    async getAllRoles(_, res) {
        try {
            const roles = await role.getAllRoles()
            return res.json({
                message: "Data fetched successfully",
                roles: roles
            })
        } catch (error) {
            console.log("🚀 ~ Role ~ getAllRoles ~ error:", error)
            res.status(500).json({ error: "Failed to fetch roles" })
        }
    }
}

const roleController = new Role()
Object.freeze(roleController)

export default roleController