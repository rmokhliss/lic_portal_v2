// ==============================================================================
// LIC v2 — GetContactUseCase (Phase 4 étape 4.C). Read-only.
// ==============================================================================

import { toDTO, type ContactDTO } from "../adapters/postgres/contact.mapper";
import { contactNotFoundById } from "../domain/contact.errors";
import type { ContactRepository } from "../ports/contact.repository";

export class GetContactUseCase {
  constructor(private readonly contactRepository: ContactRepository) {}

  async execute(id: string): Promise<ContactDTO> {
    const contact = await this.contactRepository.findById(id);
    if (contact === null) {
      throw contactNotFoundById(id);
    }
    return toDTO(contact);
  }
}
