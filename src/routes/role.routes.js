import express from "express";
import { supabaseAuth } from "../middlewares/supabaseAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { roles } from "../../utils/roles.js";
import role from "../controllers/Role.controller.js";

const router = express.Router()

router.route("/")
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN), role.createRole.bind(role))
    .get(supabaseAuth, role.getAllRoles.bind(role))

export default router