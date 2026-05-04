// ==============================================================================
// LIC v2 — Composition root du module produit (Phase 6 étape 6.B)
//
// Référentiel paramétrable SADMIN. Pas d'audit (R-27 + ADR 0017). Tous les
// use-cases (read + mutateurs) câblés directement ici — pas de cross-module.
// ==============================================================================

import { ProduitRepositoryPg } from "./adapters/postgres/produit.repository.pg";
import { CreateProduitUseCase } from "./application/create-produit.usecase";
import { GetProduitUseCase } from "./application/get-produit.usecase";
import { ListProduitsUseCase } from "./application/list-produits.usecase";
import { ToggleProduitUseCase } from "./application/toggle-produit.usecase";
import { UpdateProduitUseCase } from "./application/update-produit.usecase";
import type { ProduitRepository } from "./ports/produit.repository";

export const produitRepository: ProduitRepository = new ProduitRepositoryPg();

export const listProduitsUseCase = new ListProduitsUseCase(produitRepository);
export const getProduitUseCase = new GetProduitUseCase(produitRepository);
export const createProduitUseCase = new CreateProduitUseCase(produitRepository);
export const updateProduitUseCase = new UpdateProduitUseCase(produitRepository);
export const toggleProduitUseCase = new ToggleProduitUseCase(produitRepository);
