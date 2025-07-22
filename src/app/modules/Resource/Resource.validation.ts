// Resource.validation: Module file for the Resource.validation functionality.
import { z } from "zod";

// Create resource
 const createResourceSchema = z.object({
  name: z.string({
    required_error: "Resource name is required",
  }),
});

// Update resource
const updateResourceSchema = z.object({
  name: z.string().optional(),
});


export const ResourceValidation = {
  createResourceSchema,
  updateResourceSchema,
};
