"use client";

// ==============================================================================
// LIC v2 — UI sandbox PKI (Phase 3.F, i18n Phase 16 — DETTE-LIC-015)
//
// 5 outils indépendants — règle L16 : ZÉRO écriture BD, tout en mémoire.
// ==============================================================================

import { useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import {
  sandboxDecryptHcTestAction,
  sandboxEncryptHcTestAction,
  sandboxGenerateAesKeyAction,
  sandboxGenerateRsaPairAction,
  sandboxSignLicTestAction,
  sandboxVerifyLicTestAction,
} from "../_actions";

function downloadAsFile(content: string, filename: string, mime = "text/plain"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SandboxPanel(): React.JSX.Element {
  const t = useTranslations("settings.sandbox");
  const [isPending, startTransition] = useTransition();

  // Section 1 — Générer paire RSA
  const [rsaPair, setRsaPair] = useState<{ privateKeyPem: string; publicKeyPem: string } | null>(
    null,
  );

  // Section 2 — Signer .lic
  const [signPayloadIn, setSignPayloadIn] = useState<string>(
    JSON.stringify({ licenceId: "TEST-001", articles: ["WIN-1234", "GAB-5678"] }, null, 2),
  );
  const [signPrivateKey, setSignPrivateKey] = useState<string>("");
  const [signResult, setSignResult] = useState<string>("");

  // Section 3 — Vérifier signature
  const [verifyLic, setVerifyLic] = useState<string>("");
  const [verifyPublicKey, setVerifyPublicKey] = useState<string>("");
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; reason: string } | null>(null);

  // Section 4 — Chiffrer .hc
  const [aesKey, setAesKey] = useState<string>("");
  const [hcPayload, setHcPayload] = useState<string>(
    JSON.stringify({ usageData: { TPE: 142, GAB: 56 }, period: "2026-04" }, null, 2),
  );
  const [encryptedHc, setEncryptedHc] = useState<string>("");

  // Section 5 — Déchiffrer .hc
  const [decryptHcInput, setDecryptHcInput] = useState<string>("");
  const [decryptKeyInput, setDecryptKeyInput] = useState<string>("");
  const [decryptResult, setDecryptResult] = useState<{
    payload: string;
    error: string | null;
  } | null>(null);

  function run(fn: () => Promise<void>): void {
    startTransition(() => {
      void fn();
    });
  }

  return (
    <div className="space-y-8">
      {/* ===== Section 1 — Générer paire RSA ===== */}
      <section className="border-spx-ink/10 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("section1.title")}</h2>
        <p className="text-spx-ink/70 mt-1 text-sm">{t("section1.description")}</p>
        <Button
          className="mt-3"
          disabled={isPending}
          onClick={() => {
            run(async () => {
              const result = await sandboxGenerateRsaPairAction();
              setRsaPair(result);
            });
          }}
        >
          {t("section1.button")}
        </Button>
        {rsaPair !== null && (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="text-spx-ink/60 text-xs font-medium">
                {t("section1.labelPrivate")}
              </label>
              <textarea
                readOnly
                value={rsaPair.privateKeyPem}
                className="border-spx-ink/20 mt-1 h-40 w-full rounded border bg-gray-50 p-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-spx-ink/60 text-xs font-medium">
                {t("section1.labelPublic")}
              </label>
              <textarea
                readOnly
                value={rsaPair.publicKeyPem}
                className="border-spx-ink/20 mt-1 h-40 w-full rounded border bg-gray-50 p-2 font-mono text-xs"
              />
            </div>
          </div>
        )}
      </section>

      {/* ===== Section 2 — Signer .lic ===== */}
      <section className="border-spx-ink/10 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("section2.title")}</h2>
        <p className="text-spx-ink/70 mt-1 text-sm">{t("section2.description")}</p>
        <div className="mt-3 space-y-2">
          <label className="text-xs font-medium">{t("section2.labelPayload")}</label>
          <textarea
            value={signPayloadIn}
            onChange={(e) => {
              setSignPayloadIn(e.target.value);
            }}
            className="border-spx-ink/20 h-24 w-full rounded border p-2 font-mono text-xs"
          />
          <label className="text-xs font-medium">{t("section2.labelPrivateKey")}</label>
          <textarea
            value={signPrivateKey}
            onChange={(e) => {
              setSignPrivateKey(e.target.value);
            }}
            placeholder="-----BEGIN PRIVATE KEY-----..."
            className="border-spx-ink/20 h-32 w-full rounded border p-2 font-mono text-xs"
          />
        </div>
        <Button
          className="mt-3"
          disabled={isPending || signPayloadIn.length === 0 || signPrivateKey.length === 0}
          onClick={() => {
            run(async () => {
              const r = await sandboxSignLicTestAction({
                payload: signPayloadIn,
                privateKeyPem: signPrivateKey,
              });
              setSignResult(r.licContent);
            });
          }}
        >
          {t("section2.button")}
        </Button>
        {signResult !== "" && (
          <>
            <label className="text-spx-ink/60 mt-3 block text-xs font-medium">
              {t("section2.labelResult")}
            </label>
            <textarea
              readOnly
              value={signResult}
              className="border-spx-ink/20 mt-1 h-32 w-full rounded border bg-gray-50 p-2 font-mono text-xs"
            />
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => {
                downloadAsFile(signResult, "test.lic", "application/json");
              }}
            >
              {t("section1.button")}
            </Button>
          </>
        )}
      </section>

      {/* ===== Section 3 — Vérifier signature ===== */}
      <section className="border-spx-ink/10 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("section3.title")}</h2>
        <p className="text-spx-ink/70 mt-1 text-sm">{t("section3.description")}</p>
        <div className="mt-3 space-y-2">
          <label className="text-xs font-medium">{t("section3.labelLic")}</label>
          <textarea
            value={verifyLic}
            onChange={(e) => {
              setVerifyLic(e.target.value);
            }}
            className="border-spx-ink/20 h-32 w-full rounded border p-2 font-mono text-xs"
          />
          <label className="text-xs font-medium">{t("section3.labelPublicKey")}</label>
          <textarea
            value={verifyPublicKey}
            onChange={(e) => {
              setVerifyPublicKey(e.target.value);
            }}
            placeholder="-----BEGIN PUBLIC KEY-----..."
            className="border-spx-ink/20 h-24 w-full rounded border p-2 font-mono text-xs"
          />
        </div>
        <Button
          className="mt-3"
          disabled={isPending || verifyLic.length === 0 || verifyPublicKey.length === 0}
          onClick={() => {
            run(async () => {
              const r = await sandboxVerifyLicTestAction({
                licContent: verifyLic,
                publicKeyPem: verifyPublicKey,
              });
              setVerifyResult(r);
            });
          }}
        >
          {t("section3.button")}
        </Button>
        {verifyResult !== null && (
          <p
            className={`mt-3 rounded p-3 text-sm font-medium ${
              verifyResult.valid
                ? "border border-green-300 bg-green-50 text-green-800"
                : "border border-red-300 bg-red-50 text-red-800"
            }`}
          >
            {verifyResult.valid ? `✓ ${t("section3.valid")}` : `✗ ${t("section3.invalid")}`} —{" "}
            {verifyResult.reason}
          </p>
        )}
      </section>

      {/* ===== Section 4 — Chiffrer .hc ===== */}
      <section className="border-spx-ink/10 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("section4.title")}</h2>
        <p className="text-spx-ink/70 mt-1 text-sm">{t("section4.description")}</p>
        <div className="mt-3 space-y-2">
          <label className="text-xs font-medium">{t("section4.labelAesKey")}</label>
          <div className="flex gap-2">
            <input
              value={aesKey}
              onChange={(e) => {
                setAesKey(e.target.value);
              }}
              placeholder="base64 32 bytes"
              className="border-spx-ink/20 flex-1 rounded border p-2 font-mono text-xs"
            />
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => {
                run(async () => {
                  const r = await sandboxGenerateAesKeyAction();
                  setAesKey(r.keyBase64);
                });
              }}
            >
              {t("section4.generateKey")}
            </Button>
          </div>
          <label className="text-xs font-medium">{t("section4.labelHcPayload")}</label>
          <textarea
            value={hcPayload}
            onChange={(e) => {
              setHcPayload(e.target.value);
            }}
            className="border-spx-ink/20 h-24 w-full rounded border p-2 font-mono text-xs"
          />
        </div>
        <Button
          className="mt-3"
          disabled={isPending || aesKey.length === 0 || hcPayload.length === 0}
          onClick={() => {
            run(async () => {
              const r = await sandboxEncryptHcTestAction({
                payload: hcPayload,
                keyBase64: aesKey,
              });
              setEncryptedHc(r.hcContent);
            });
          }}
        >
          {t("section4.button")}
        </Button>
        {encryptedHc !== "" && (
          <>
            <label className="text-spx-ink/60 mt-3 block text-xs font-medium">
              {t("section4.labelEncrypted")}
            </label>
            <textarea
              readOnly
              value={encryptedHc}
              className="border-spx-ink/20 mt-1 h-32 w-full rounded border bg-gray-50 p-2 font-mono text-xs"
            />
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => {
                downloadAsFile(encryptedHc, "test.hc", "application/json");
              }}
            >
              {t("section1.button")}
            </Button>
          </>
        )}
      </section>

      {/* ===== Section 5 — Déchiffrer .hc ===== */}
      <section className="border-spx-ink/10 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("section5.title")}</h2>
        <p className="text-spx-ink/70 mt-1 text-sm">{t("section5.description")}</p>
        <div className="mt-3 space-y-2">
          <label className="text-xs font-medium">{t("section5.labelEncrypted")}</label>
          <textarea
            value={decryptHcInput}
            onChange={(e) => {
              setDecryptHcInput(e.target.value);
            }}
            className="border-spx-ink/20 h-32 w-full rounded border p-2 font-mono text-xs"
          />
          <label className="text-xs font-medium">{t("section5.labelKey")}</label>
          <input
            value={decryptKeyInput}
            onChange={(e) => {
              setDecryptKeyInput(e.target.value);
            }}
            className="border-spx-ink/20 w-full rounded border p-2 font-mono text-xs"
          />
        </div>
        <Button
          className="mt-3"
          disabled={isPending || decryptHcInput.length === 0 || decryptKeyInput.length === 0}
          onClick={() => {
            run(async () => {
              const r = await sandboxDecryptHcTestAction({
                hcContent: decryptHcInput,
                keyBase64: decryptKeyInput,
              });
              setDecryptResult(r);
            });
          }}
        >
          {t("section5.button")}
        </Button>
        {decryptResult !== null && (
          <div className="mt-3">
            {decryptResult.error !== null ? (
              <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                ✗ {t("section5.errorPrefix")} — {decryptResult.error}
              </p>
            ) : (
              <>
                <label className="text-spx-ink/60 block text-xs font-medium">
                  {t("section5.labelPayload")}
                </label>
                <textarea
                  readOnly
                  value={decryptResult.payload}
                  className="mt-1 h-32 w-full rounded border border-green-300 bg-green-50 p-2 font-mono text-xs text-green-900"
                />
              </>
            )}
          </div>
        )}
      </section>

      {/* ===== Phase 22 R-39 — Templates .lic / .hc enrichis ===== */}
      <section className="border-spx-ink/10 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Templates fichiers</h2>
        <p className="text-spx-ink/70 mt-1 text-sm">
          Modèles JSON documentés (structure F2 complète : produits → articles, volumes
          conditionnels, signature RSA-SHA256 et certificat client). À compléter et signer via la
          section 2 (.lic) ou chiffrer via la section 4 (.hc) ci-dessus.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              downloadAsFile(LIC_TEMPLATE_TEXT, "template.lic", "text/plain");
            }}
          >
            Télécharger template .lic
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              downloadAsFile(
                JSON.stringify(HC_TEMPLATE, null, 2),
                "template.hc.json",
                "application/json",
              );
            }}
          >
            Télécharger template .hc
          </Button>
        </div>
      </section>

      {/* ===== Phase 22 R-40 — Scénario F2 documenté ===== */}
      <section className="border-spx-ink/10 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Scénario F2 — Test end-to-end</h2>
        <p className="text-spx-ink/70 mt-1 text-sm">
          Cet outil permet de tester le flux cryptographique S2M (RSA + AES) avant déploiement. Les
          clés générées ici sont éphémères et indépendantes de la CA de production (cf.{" "}
          <code className="font-mono text-xs">/settings/security</code>).
        </p>
        <ol className="text-spx-ink/80 mt-3 list-decimal space-y-2 pl-5 text-sm">
          <li>
            <strong>Générer une paire RSA de test</strong> — clé privée + publique éphémères
            (section 1).
          </li>
          <li>
            <strong>Signer un fichier .lic de test</strong> avec la clé privée → télécharger le{" "}
            <code className="font-mono text-xs">.lic</code> signé (section 2).
          </li>
          <li>
            <strong>Vérifier la signature du .lic</strong> avec la clé publique → résultat «{" "}
            <span className="text-green-700">Valide</span> » /{" "}
            <span className="text-red-700">Invalide</span> » (section 3).
          </li>
          <li>
            <strong>Chiffrer un fichier .hc de test</strong> avec une clé AES partagée → télécharger
            le <code className="font-mono text-xs">.hc</code> chiffré (section 4).
          </li>
          <li>
            <strong>Déchiffrer le .hc</strong> avec la même clé → affiche le contenu décodé (section
            5).
          </li>
        </ol>
        <p className="text-spx-ink/60 mt-3 text-xs italic">
          Aucun appel BD — règle L16, sandbox SADMIN sans persistance. Les artefacts produits ne
          sont JAMAIS acceptés par les imports `.lic` / `.hc` réels (signés par la CA prod
          uniquement).
        </p>
      </section>
    </div>
  );
}

// Phase 22 R-39 — Template `.hc` (healthcheck) enrichi. Format JSON simple,
// chiffré côté client S2M avant envoi (AES-256-GCM avec clé partagée du
// settings `healthcheck_shared_aes_key`).
const HC_TEMPLATE = {
  version: "1.0",
  licenceReference: "LIC-2026-001",
  clientCode: "BAM",
  importedAt: "2026-05-06T12:00:00Z",
  articles: [
    { code: "KERNEL", volConsomme: 750000 },
    { code: "SMS-GW", volConsomme: 45000 },
  ],
} as const;

// Phase 22 R-39 + Phase 23 — Template `.lic` complet (JSON + signature RSA +
// certificat client PEM). Texte brut multi-section, format F2 (cf.
// docs/integration/F2_FORMATS.md). Phase 23 : `volAutorise: null` signifie
// volume non défini (équivalent illimité métier) — pour les articles
// fonctionnalités (controleVolume=false côté catalogue) ou pour les articles
// volumétriques non encore plafonnés. Le champ `uniteVolume` n'est plus émis
// (info technique sans valeur côté consommateur du .lic).
const LIC_TEMPLATE_TEXT = `${JSON.stringify(
  {
    version: "1.0",
    reference: "LIC-2026-001",
    clientCode: "BAM",
    clientRaisonSociale: "Bank Al-Maghrib",
    entiteNom: "Siège BAM",
    dateDebut: "2026-01-01",
    dateFin: "2028-12-31",
    produits: [
      {
        code: "SPX-CORE",
        nom: "SelectPX Core",
        articles: [
          {
            code: "KERNEL",
            nom: "Kernel Switch",
            volAutorise: 1000000,
          },
          {
            code: "HSM",
            nom: "HSM Interface",
            volAutorise: null,
          },
        ],
      },
    ],
    generatedAt: "2026-05-06T12:00:00Z",
    signature: "BASE64_SIGNATURE_RSA_SHA256_ICI",
  },
  null,
  2,
)}
--- SIGNATURE S2M ---
BASE64_SIGNATURE_RSA_SHA256_ICI
--- CERTIFICATE S2M ---
-----BEGIN CERTIFICATE-----
CONTENU_CERTIFICAT_CLIENT_PEM
-----END CERTIFICATE-----
`;
