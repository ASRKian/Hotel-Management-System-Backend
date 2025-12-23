import express from "express"
import { supabaseAuth } from "../middlewares/supabaseAuth.js"
import property from "../controllers/property.controller.js"
import { requireRole } from "../middlewares/requireRole.js"
import { roles } from "../../utils/roles.js"
import { upload } from "../middlewares/upload.js"

const router = express.Router()

router.get("/by-admin", supabaseAuth, property.getByAdminUserId.bind(property))

router.route("/")
    .get(supabaseAuth, requireRole(roles.SUPER_ADMIN), property.getAll.bind(property))
    .post(supabaseAuth, requireRole(roles.ADMIN, roles.SUPER_ADMIN), upload.single("image"), property.create.bind(property))

router.route("/:id")
    .get(supabaseAuth, property.getById.bind(property))
    .patch(supabaseAuth, requireRole(roles.ADMIN, roles.SUPER_ADMIN), upload.single("image"), property.update.bind(property))

router.route("/:id/image",)
    .get(property.getImage.bind(property))
export default router