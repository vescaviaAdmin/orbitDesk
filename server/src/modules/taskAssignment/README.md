# Task Assignment Module

This module implements the backend scaffolding for the "AI-Based Ticket Planning and Assignment Design" document provided in the task brief.

## Scope

- Gemini is treated as the planner.
- Backend validates the returned week-wise ticket structure.
- Backend builds an assignment proposal based on project, work type, capacity, and availability.
- PM/Admin approval remains a separate step after proposal generation.

## Files

- `task-assignment.routes.js`: admin endpoints for design metadata, plan validation, and assignment proposal generation
- `task-assignment.controller.js`: thin Fastify controller layer
- `task-assignment.service.js`: validation and assignment rules derived from the design document

## Request Model Expected By This Module

The service expects a payload shaped around the task document:

- `project`
  - `projectId`
  - `projectName`
  - `startDate`
  - `endDate`
- `employees`
  - `empNumber`
  - `name`
  - `projectIds`
  - `workIds`
  - `scoreBucket`
  - `currentWorkingScore`
  - `isActive`
- `geminiPlan`
  - `projectId`
  - `projectName`
  - `planStartDate`
  - `planEndDate`
  - `weeks`
- `manualHighPriorityTickets`
- `previousUnassignedTickets`

## Flow Mapping

The implementation follows the document flow:

1. Gemini generates week-wise tickets only.
2. Backend validates ticket IDs, work IDs, score values, phases, deadlines, and dependencies.
3. Backend processes assignment in this order:
   - manual high-priority tickets
   - previous unassigned tickets
   - new planned weekly tickets
4. Backend selects the active employee in the same project with matching `workId`, enough remaining capacity, and the lowest post-assignment utilization.
5. Tickets that cannot be assigned are returned separately for PM/Admin review.

## Current Boundaries

- This module currently generates a proposal response and does not create database tickets.
- It is intentionally isolated to backend route/controller/service files for this task.
- Existing project models are not reshaped here; the service accepts the design payload directly so the workflow can be integrated later with persistence and Gemini orchestration.
