// Resource.routes: Module file for the Resource.routes functionality.
import express from "express";
import { ResourceController } from "./Resource.controller";
import validateRequest from "../../middlewares/validateRequest";
import { ResourceValidation } from "./Resource.validation";

const router = express.Router();

// Create resource route (POST)
router.post(
    "/create",
    validateRequest(ResourceValidation.createResourceSchema),
    ResourceController.createResource
);

//resource availability
router.post("/availability", ResourceController.resourceAvailability);

// Get all resources route (GET)
router.get("/", ResourceController.getAllResources);

// Get resource by ID route (GET)
router.get("/:id", ResourceController.getResourceById);

// Update resource route (PUT)
router.put(
    "/update/:id",
    validateRequest(ResourceValidation.updateResourceSchema),
    ResourceController.updateResource
);

// Delete resource route (DELETE)
router.delete("/delete/:id", ResourceController.deleteResource);

export const ResourceRoutes = router;