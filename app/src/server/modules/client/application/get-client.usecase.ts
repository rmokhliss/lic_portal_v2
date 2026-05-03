// ==============================================================================
// LIC v2 — GetClientUseCase (Phase 4 étape 4.B)
// Read-only, pas d'audit, pas de transaction.
// ==============================================================================

import { toDTO, type ClientDTO } from "../adapters/postgres/client.mapper";
import { clientNotFoundById } from "../domain/client.errors";
import type { ClientRepository } from "../ports/client.repository";

export class GetClientUseCase {
  constructor(private readonly clientRepository: ClientRepository) {}

  async execute(id: string): Promise<ClientDTO> {
    const client = await this.clientRepository.findById(id);
    if (client === null) {
      throw clientNotFoundById(id);
    }
    return toDTO(client);
  }
}
