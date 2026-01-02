import express from 'express'
import { supabaseAuth } from '../middlewares/supabaseAuth.js'
import { requireRole } from '../middlewares/requireRole.js'
import { roles } from '../../utils/roles.js'
import BookingController from '../controllers/Booking.controller.js'

const router = express.Router()

router.route("/")
    .get(supabaseAuth, requireRole(roles.ALL), BookingController.getBookings.bind(BookingController))
    .post(supabaseAuth, requireRole(roles.ALL), BookingController.createBooking.bind(BookingController))

export default router