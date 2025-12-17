import express from "express"
import { supabaseAuth } from "../middlewares/supabaseAuth.js"
import property from "../controllers/property.controller.js"
import { requireRole } from "../middlewares/requireRole.js"
import { roles } from "../../utils/roles.js"

const router = express.Router()

router.route("/")
    .get(supabaseAuth, requireRole(roles.SUPER_ADMIN), property.getAll.bind(property))
    .post(supabaseAuth, requireRole(roles.ADMIN, roles.SUPER_ADMIN), property.create.bind(property))
    .patch(supabaseAuth, requireRole(roles.ADMIN, roles.SUPER_ADMIN), property.update.bind(property))

router.route("/:id")
    .get(supabaseAuth, property.getById.bind(property))

export default router