import express from "express";
import { userRoutes } from "../modules/User/user.route";
import { AuthRoutes } from "../modules/Auth/auth.routes";
import { ImageRoutes } from "../modules/Image/Image.routes";
import { ResourceRoutes } from "../modules/Resource/Resource.routes";
import { BookingRoutes } from "../modules/Booking/Booking.routes";


const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/images",
    route: ImageRoutes,
  },
  {
    path: "/resource",
    route: ResourceRoutes,
  },
  {
    path: "/booking",
    route: BookingRoutes,
  },

];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
