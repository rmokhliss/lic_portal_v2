// ==============================================================================
// LIC v2 — Composition root du module team-members (Phase 2.B étape 4/7)
//
// Identique aux 5 référentiels précédents : aucun cross-module, 5 use-cases
// câblés directement.
// ==============================================================================

import { TeamMemberRepositoryPg } from "./adapters/postgres/team-member.repository.pg";
import { CreateTeamMemberUseCase } from "./application/create-team-member.usecase";
import { GetTeamMemberUseCase } from "./application/get-team-member.usecase";
import { ListTeamMembersUseCase } from "./application/list-team-members.usecase";
import { ToggleTeamMemberUseCase } from "./application/toggle-team-member.usecase";
import { UpdateTeamMemberUseCase } from "./application/update-team-member.usecase";
import type { TeamMemberRepository } from "./ports/team-member.repository";

export const teamMemberRepository: TeamMemberRepository = new TeamMemberRepositoryPg();

export const listTeamMembersUseCase = new ListTeamMembersUseCase(teamMemberRepository);
export const getTeamMemberUseCase = new GetTeamMemberUseCase(teamMemberRepository);
export const createTeamMemberUseCase = new CreateTeamMemberUseCase(teamMemberRepository);
export const updateTeamMemberUseCase = new UpdateTeamMemberUseCase(teamMemberRepository);
export const toggleTeamMemberUseCase = new ToggleTeamMemberUseCase(teamMemberRepository);
