// ==============================================================================
// LIC v2 — ListContactsByEntiteUseCase (Phase 4 étape 4.C)
// Read-only, pas de cursor (volume <20 par entité).
// ==============================================================================

import { toDTO, type ContactDTO } from "../adapters/postgres/contact.mapper";
import type { ContactRepository } from "../ports/contact.repository";

export class ListContactsByEntiteUseCase {
  constructor(private readonly contactRepository: ContactRepository) {}

  async execute(entiteId: string): Promise<readonly ContactDTO[]> {
    const contacts = await this.contactRepository.findByEntite(entiteId);
    return contacts.map(toDTO);
  }
}
