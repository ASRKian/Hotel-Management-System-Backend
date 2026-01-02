import express from "express"
import { supabaseAuth } from "../middlewares/supabaseAuth.js"
import property from "../controllers/property.controller.js"
import { requireRole } from "../middlewares/requireRole.js"
import { roles } from "../../utils/roles.js"
import { upload } from "../middlewares/upload.js"

const router = express.Router()

router.get("/by-owner", supabaseAuth, property.getByOwnerUserId.bind(property))

router.get("/get-my-properties", supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.ADMIN, roles.OWNER, roles.ALL), property.getMyProperties.bind(property))

router.get("/:property_id/tax", supabaseAuth, requireRole(roles.ALL), property.getPropertyTax.bind(property))

//super-admin only
router.route("/by-owner/:id")
    .get(supabaseAuth, requireRole(roles.SUPER_ADMIN), property.getByOwnerUserId.bind(property))
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN), upload.single("image"), property.create.bind(property))

router.route("/")
    .get(supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.OWNER), property.getAll.bind(property))
    .post(supabaseAuth, requireRole(roles.OWNER, roles.SUPER_ADMIN), upload.single("image"), property.create.bind(property))

router.route("/:id")
    .get(supabaseAuth, property.getById.bind(property))
    .patch(supabaseAuth, requireRole(roles.OWNER, roles.SUPER_ADMIN), upload.single("image"), property.update.bind(property))

router.route("/:id/image",)
    .get(property.getImage.bind(property))
export default router