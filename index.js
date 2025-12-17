import express from "express";
import { config } from "dotenv";

import userRoutes from "./src/routes/user.routes.js";
import roleRoutes from "./src/routes/role.routes.js";
import propertyRouter from "./src/routes/property.route.js";

config()

const app = express();

app.use(express.json())

app.use("/users", userRoutes)
app.use("/roles", roleRoutes)
app.use("/properties", propertyRouter)

app.listen(process.env.PORT || 3000, () => {
  console.log(`server is running on: ${process.env.PORT || "Either ENV not loaded or PORT is not defined default port is 3000"}`);
});
