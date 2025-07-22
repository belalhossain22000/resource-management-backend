import { Resource } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { findAvailableSlots } from "../../../utils/bookingUtils";

// Resource.service: Module file for the Resource.service functionality.
const createResource = async (payload: Resource) => {
  const isResourceExist = await prisma.resource.findUnique({
    where: {
      name: payload.name,
    },
  });
  if (isResourceExist) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Resource already exist");
  }

  const result = await prisma.resource.create({
    data: payload,
  });
  return result;
};

//get all resources
const getAllResources = async () => {
  const result = await prisma.resource.findMany();
  return result;
};

//get resource by id
const getResourceById = async (id: string) => {
  const result = await prisma.resource.findUnique({
    where: {
      id: id,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Resource not found");
  }

  return result;
};

//update resource
const updateResource = async (id: string, payload: Resource) => {
  const isResourceExist = await prisma.resource.findUnique({
    where: {
      name: payload.name,
    },
  });
  if (isResourceExist) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Resource already exist");
  }

  const resource = await getResourceById(id);
  if (!resource) {
    throw new ApiError(httpStatus.NOT_FOUND, "Resource not found");
  }

  const result = await prisma.resource.update({
    where: {
      id: id,
    },
    data: payload,
  });
  return result;
};

//delete resources
const deleteResource = async (id: string) => {
  const resource = await getResourceById(id);
  if (!resource) {
    throw new ApiError(httpStatus.NOT_FOUND, "Resource not found");
  }

  const result = await prisma.resource.delete({
    where: {
      id: id,
    },
  });
  return result;
};

// resource availability
const resourceAvailability = async (payload: any) => {
  const { resourceId, date, minDuration } = payload;

  if (!resourceId || !date) {
    throw new ApiError(httpStatus.BAD_REQUEST, "All fields are required");
  }

  const parsedMinDuration = parseInt((minDuration as string) || "15", 10);
  const searchDate = new Date(date as string);

  if (isNaN(searchDate.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid date format");
  }

  // Check if resource exists
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId as string },
  });

  if (!resource) {
    throw new ApiError(httpStatus.NOT_FOUND, "Resource not found");
  }

  const startOfDay = new Date(searchDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(searchDate);
  endOfDay.setHours(23, 59, 59, 999);
  const existingBookings = await prisma.booking.findMany({
    where: {
      resourceId: resourceId as string,
      startTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      resource: true,
    },
  });

  const availableSlots = findAvailableSlots(
    existingBookings,
    searchDate,
    parsedMinDuration
  );

  return {
    totalSlots: availableSlots.length,
    resource,
    date: searchDate.toISOString().split("T")[0],
    availableSlots,
  };
};

export const ResourceService = {
  createResource,
  getAllResources,
  getResourceById,
  updateResource,
  deleteResource,
  resourceAvailability,
};
