import express from 'express'
import { supabaseAuth } from '../middlewares/supabaseAuth.js'
import { requireRole } from '../middlewares/requireRole.js'
import { roles } from '../../utils/roles.js'
import RoomController from '../controllers/Room.controller.js'

const router = express.Router()

router.route("/")
    .get(supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.OWNER, roles.ADMIN), RoomController.getRoomsByProperty.bind(RoomController))
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.OWNER), RoomController.bulkCreateRooms.bind(RoomController))
    .patch(supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.OWNER), RoomController.bulkUpdateRooms.bind(RoomController))

router.route("/single-room")
    .post(supabaseAuth, requireRole(roles.SUPER_ADMIN, roles.OWNER, roles.ADMIN), RoomController.addRoom.bind(RoomController))

router.route("/available")
    .get(supabaseAuth, requireRole(roles.ALL), RoomController.getAvailableRooms.bind(RoomController))
router.route("/check-availability")
    .get(supabaseAuth, requireRole(roles.ALL), RoomController.checkRoomAvailability.bind(RoomController))
export default router