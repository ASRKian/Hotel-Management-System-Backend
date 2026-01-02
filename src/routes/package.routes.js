import express from "express";
import { supabaseAuth } from "../middlewares/supabaseAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { roles } from "../../utils/roles.js";
import PackageController from "../controllers/Package.controller.js";

const router = express.Router();

router.route("/")
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.ADMIN, roles.OWNER), PackageController.create.bind(PackageController))
    .get(supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.ADMIN, roles.OWNER, roles.ALL), PackageController.getByProperty.bind(PackageController)); // ?property_id=1

router.route("/user")
    .get(supabaseAuth, PackageController.getPackagesByUser.bind(PackageController))

router.route("/:id")
    .get(supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.ADMIN, roles.OWNER, roles.ALL), PackageController.getById.bind(PackageController))
    .patch(supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.ADMIN, roles.OWNER), PackageController.update.bind(PackageController))
    .delete(supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.ADMIN, roles.OWNER), PackageController.deactivate.bind(PackageController))

export default router;
