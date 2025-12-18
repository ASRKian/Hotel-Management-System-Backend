import express from "express";
import { supabaseAuth } from "../middlewares/supabaseAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { roles } from "../../utils/roles.js";
import role from "../controllers/Role.controller.js";

const router = express.Router()

router.route("/")
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN), role.createRole.bind(role))
    .get(supabaseAuth, role.getAllRoles.bind(role))

router.route("/:id")
    .patch(supabaseAuth, requireRole(roles.SUPER_ADMIN), role.updateRole.bind(role))
    .delete(supabaseAuth, requireRole(roles.SUPER_ADMIN), role.deleteRole.bind(role))

export default router