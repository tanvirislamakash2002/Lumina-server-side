import express, { Router } from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../generated/prisma/enums";
import { searchController } from "./search.controller";

const router = express.Router();

// All search routes require authentication
router.use(auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN));

// Main search endpoints
router.get("/", searchController.globalSearch);
router.get("/suggestions", searchController.getSearchSuggestions);

// Entity-specific search
router.get("/projects", searchController.searchProjects);
router.get("/tasks", searchController.searchTasks);
router.get("/members", searchController.searchMembers);

// Recent searches
router.get("/recent", searchController.getRecentSearches);
router.delete("/recent", searchController.clearRecentSearches);

export const searchRouter: Router = router;