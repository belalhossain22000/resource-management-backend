// Resource.controller: Module file for the Resource.controller functionality.
  import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Request, Response } from "express";
import { ResourceService } from "./Resource.service";

// Controller for creating a resource
const createResource = catchAsync(async (req: Request, res: Response) => {
    const result = await ResourceService.createResource(req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Resource Created successfully!",
        data: result,
    });
})

//get all resources
const getAllResources = catchAsync(async (req: Request, res: Response) => {
    const result = await ResourceService.getAllResources();
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Resources retrieve successfully!",
        data: result,
    });
})

//get single resource
const getResourceById = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await ResourceService.getResourceById(id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Resource retrieve successfully!",
        data: result,
    });
})

//update resource by id
const updateResource = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await ResourceService.updateResource(id, req.body);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Resource updated successfully!",
        data: result,
    });
})


//delete resource
const deleteResource = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await ResourceService.deleteResource(id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Resource deleted successfully!",
        data: result,
    });
})


export const ResourceController = {
    createResource,
    getAllResources,
    getResourceById,
    updateResource,
    deleteResource
}