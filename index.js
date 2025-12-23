import express from "express";
import { config } from "dotenv";
import cors from 'cors'

import userRoutes from "./src/routes/user.routes.js";
import roleRoutes from "./src/routes/role.routes.js";
import propertyRoutes from "./src/routes/property.route.js";
import sidebarLinkRoutes from "./src/routes/sidebarLink.routes.js";
import roleSidebarLinkRoutes from "./src/routes/roleSidebarLink.routes.js";
import propertyFloorRouter from "./src/routes/propertyFloor.routes.js";
import staffRoutes from "./src/routes/staff.routes.js";

config()

const app = express();

app.use(cors())
app.use(express.json())

app.use("/users", userRoutes)
app.use("/roles", roleRoutes)
app.use("/properties", propertyRoutes)
app.use("/sidebarLink", sidebarLinkRoutes)
app.use("/role-sidebar-link", roleSidebarLinkRoutes)
app.use("/property-floors", propertyFloorRouter)
app.use("/staff", staffRoutes)

app.listen(process.env.PORT || 3000, () => {
  console.log(`server is running on: ${process.env.PORT || "Either ENV not loaded or PORT is not defined default port is 3000"}`);
});
