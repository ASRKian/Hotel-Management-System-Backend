import RoomService from "../services/Room.Service.js"

class RoomController {
    async bulkCreateRooms(req, res) {
        try {
            const createdBy = req.user.user_id
            const { propertyId, floors, prefix } = req.body
            const rows = await RoomService.bulkCreateRooms({ propertyId, floors, prefix, createdBy })
            return res.status(201).json({ message: "rooms created successfully", rooms: rows })
        } catch (error) {
            console.log("🚀 ~ RoomController ~ bulkCreateRooms ~ error:", error)
            return resizeBy.status(500).json({ message: "Error creating rooms" })
        }
    }

    async getRoomsByProperty(req, res) {
        try {
            const { propertyId } = req.query
            const rooms = await RoomService.getRoomsByProperty(propertyId)
            return res.json({ message: "Success", rooms })
        } catch (error) {
            console.log("🚀 ~ RoomController ~ getRoomsByProperty ~ error:", error)
            return res.status(500).json({ message: "Error fetching rooms" })
        }
    }

    async bulkUpdateRooms(req, res) {
        try {
            const { updates } = req.body
            const updatedBy = req.user.user_id
            const rows = await RoomService.bulkUpdateRooms({ updates, updatedBy })
            return res.status(201).json({ message: "Rooms updated successfully", data: rows })
        } catch (error) {
            console.log("🚀 ~ RoomController ~ bulkUpdateRooms ~ error:", error)
            return res.status(500).json({ message: "Error updating rooms" })
        }
    }

    async addRoom(req, res) {
        try {
            const createdBy = req.user.user_id
            const { propertyId, floorNumber, roomType } = req.body
            const rows = await RoomService.addRoom({ createdBy, floorNumber, propertyId, roomType })
            return res.status(201).json({ message: "Success", data: rows })
        } catch (error) {
            console.log("🚀 ~ RoomController ~ addRoom ~ error:", error)
            return res.status(500).json({ message: "Error creating room" })
        }
    }

    async getAvailableRooms(req, res) {
        try {
            const { propertyId, arrivalDate, departureDate, roomType, limit = 50, offset = 0, } = req.query
            const rooms = await RoomService.getAvailableRooms({ arrivalDate, departureDate, propertyId, roomType, limit, offset })
            return res.json({ message: "Success", rooms })
        } catch (error) {
            console.log("🚀 ~ RoomController ~ getAvailableRooms ~ error:", error)
            return res.status(500).json({ message: "Error getting available rooms" })
        }
    }

    async checkRoomAvailability(req, res) {
        try {
            const { roomId, arrivalDate, departureDate } = req.query
            const isAvailable = await RoomService.checkRoomAvailability({ arrivalDate, departureDate, roomId })
            return res.status(200).json({ message: "Success", isAvailable })
        } catch (error) {
            console.log("🚀 ~ RoomController ~ checkRoomAvailability ~ error:", error)
            return res.status(500).json({ message: "Error fetching data" })
        }
    }
}

export default Object.freeze(new RoomController())