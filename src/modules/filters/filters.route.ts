import express, { Router } from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../generated/prisma/enums";
import { filtersController } from "./filters.controller";

const router = express.Router();

// All filter routes require authentication
router.use(auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN));

// Get filter options (dynamic values for dropdowns)
router.get("/options", filtersController.getFilterOptions);
router.get("/tasks", filtersController.getTaskFilters);
router.get("/projects", filtersController.getProjectFilters);
router.get("/members", filtersController.getMemberFilters);

// Saved filters CRUD
router.get("/saved", filtersController.getSavedFilters);
router.post("/saved", filtersController.saveFilter);
router.patch("/saved/:filterId", filtersController.updateSavedFilter);
router.delete("/saved/:filterId", filtersController.deleteSavedFilter);

export const filtersRouter: Router = router;