import { Resource } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

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

export const ResourceService = {
  createResource,
  getAllResources,
  getResourceById,
  updateResource,
  deleteResource,
};
