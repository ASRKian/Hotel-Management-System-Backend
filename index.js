import express from "express";
import { config } from "dotenv";
import cors from 'cors'

import userRoutes from "./src/routes/user.routes.js";
import roleRoutes from "./src/routes/role.routes.js";
import propertyRoutes from "./src/routes/property.route.js";
import sidebarLinkRoutes from "./src/routes/sidebarLink.routes.js";
import roleSidebarLinkRoutes from "./src/routes/roleSidebarLink.routes.js";
import propertyFloorRoutes from "./src/routes/propertyFloor.routes.js";
import staffRoutes from "./src/routes/staff.routes.js";
import roomRoutes from "./src/routes/room.routes.js";
import packageRoutes from "./src/routes/package.routes.js";
import bookingsRoutes from "./src/routes/booking.routes.js";
import guestsRoutes from "./src/routes/guest.routes.js";
import paymentsRoutes from "./src/routes/payment.routes.js";
import acTypesRoutes from "./src/routes/acType.routes.js";
import bedTypesRoutes from "./src/routes/bedType.routes.js";
import roomCategoriesRoutes from "./src/routes/roomCategory.routes.js";
import roomTypeRateRoutes from "./src/routes/roomTypeRate.routes.js";
import refPackagesRoutes from "./src/routes/RefPackage.route.js";
import propertyBanksRoutes from "./src/routes/propertyBankAccount.routes.js";
import vendorRoutes from "./src/routes/vendor.routes.js";
import laundryRoutes from "./src/routes/laundry.routes.js";
import enquiryRoutes from "./src/routes/enquiry.routes.js";

config()

const app = express();

app.use(cors())
app.use(express.json())

app.use("/users", userRoutes)
app.use("/roles", roleRoutes)
app.use("/properties", propertyRoutes)
app.use("/sidebar-link", sidebarLinkRoutes)
app.use("/role-sidebar-link", roleSidebarLinkRoutes)
app.use("/property-floors", propertyFloorRoutes)
app.use("/staff", staffRoutes)
app.use("/rooms", roomRoutes)
app.use("/packages", packageRoutes)
app.use("/bookings", bookingsRoutes)
app.use("/guests", guestsRoutes)
app.use("/payments", paymentsRoutes)
app.use("/ac-types", acTypesRoutes)
app.use("/bed-types", bedTypesRoutes)
app.use("/room-categories", roomCategoriesRoutes)
app.use("/room-type-rates", roomTypeRateRoutes)
app.use("/ref-packages", refPackagesRoutes)
app.use("/property-banks", propertyBanksRoutes)
app.use("/vendors", vendorRoutes)
app.use("/laundries", laundryRoutes)
app.use("/enquiries", enquiryRoutes)

app.listen(process.env.PORT || 3000, () => {
  console.log(`server is running on: ${process.env.PORT || "Either ENV not loaded or PORT is not defined default port is 3000"}`);
});
