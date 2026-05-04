"use client";

// ==============================================================================
// LIC v2 — UI sandbox PKI (Phase 3.F)
//
// 5 outils indépendants — règle L16 : ZÉRO écriture BD, tout en mémoire.
// ==============================================================================

import { useState, useTransition } from "react";

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
        <h2 className="text-lg font-semibold">1. Générer paire RSA test</h2>
        <p className="text-spx-ink/70 mt-1 text-sm">
          Crée une paire RSA-4096 éphémère en mémoire. Aucune persistance.
        </p>
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
          Générer
        </Button>
        {rsaPair !== null && (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="text-spx-ink/60 text-xs font-medium">Clé privée (PKCS#8 PEM)</label>
              <textarea
                readOnly
                value={rsaPair.privateKeyPem}
                className="border-spx-ink/20 mt-1 h-40 w-full rounded border bg-gray-50 p-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-spx-ink/60 text-xs font-medium">Clé publique (SPKI PEM)</label>
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
        <h2 className="text-lg font-semibold">2. Signer un .lic test</h2>
        <p className="text-spx-ink/70 mt-1 text-sm">
          Signe un payload JSON exemple avec une clé privée RSA fournie.
        </p>
        <div className="mt-3 space-y-2">
          <label className="text-xs font-medium">Payload JSON</label>
          <textarea
            value={signPayloadIn}
            onChange={(e) => {
              setSignPayloadIn(e.target.value);
            }}
            className="border-spx-ink/20 h-24 w-full rounded border p-2 font-mono text-xs"
          />
          <label className="text-xs font-medium">Clé privée PEM</label>
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
          Signer + télécharger .lic
        </Button>
        {signResult !== "" && (
          <>
            <textarea
              readOnly
              value={signResult}
              className="border-spx-ink/20 mt-3 h-32 w-full rounded border bg-gray-50 p-2 font-mono text-xs"
            />
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => {
                downloadAsFile(signResult, "test.lic", "application/json");
              }}
            >
              Télécharger
            </Button>
          </>
        )}
      </section>

      {/* ===== Section 3 — Vérifier signature ===== */}
      <section className="border-spx-ink/10 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">3. Vérifier signature</h2>
        <div className="mt-3 space-y-2">
          <label className="text-xs font-medium">Contenu .lic</label>
          <textarea
            value={verifyLic}
            onChange={(e) => {
              setVerifyLic(e.target.value);
            }}
            className="border-spx-ink/20 h-32 w-full rounded border p-2 font-mono text-xs"
          />
          <label className="text-xs font-medium">Clé publique PEM</label>
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
          Vérifier
        </Button>
        {verifyResult !== null && (
          <p
            className={`mt-3 rounded p-3 text-sm font-medium ${
              verifyResult.valid
                ? "border border-green-300 bg-green-50 text-green-800"
                : "border border-red-300 bg-red-50 text-red-800"
            }`}
          >
            {verifyResult.valid ? "✓ Signature valide" : "✗ Invalide"} — {verifyResult.reason}
          </p>
        )}
      </section>

      {/* ===== Section 4 — Chiffrer .hc ===== */}
      <section className="border-spx-ink/10 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">4. Chiffrer un .hc test</h2>
        <div className="mt-3 space-y-2">
          <label className="text-xs font-medium">Clé AES-256 base64 (32 octets)</label>
          <div className="flex gap-2">
            <input
              value={aesKey}
              onChange={(e) => {
                setAesKey(e.target.value);
              }}
              placeholder="44 caractères base64"
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
              Générer
            </Button>
          </div>
          <label className="text-xs font-medium">Payload JSON</label>
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
          Chiffrer
        </Button>
        {encryptedHc !== "" && (
          <>
            <textarea
              readOnly
              value={encryptedHc}
              className="border-spx-ink/20 mt-3 h-32 w-full rounded border bg-gray-50 p-2 font-mono text-xs"
            />
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => {
                downloadAsFile(encryptedHc, "test.hc", "application/json");
              }}
            >
              Télécharger
            </Button>
          </>
        )}
      </section>

      {/* ===== Section 5 — Déchiffrer .hc ===== */}
      <section className="border-spx-ink/10 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">5. Déchiffrer un .hc</h2>
        <div className="mt-3 space-y-2">
          <label className="text-xs font-medium">Contenu .hc</label>
          <textarea
            value={decryptHcInput}
            onChange={(e) => {
              setDecryptHcInput(e.target.value);
            }}
            className="border-spx-ink/20 h-32 w-full rounded border p-2 font-mono text-xs"
          />
          <label className="text-xs font-medium">Clé partagée (base64)</label>
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
          Déchiffrer
        </Button>
        {decryptResult !== null && (
          <div className="mt-3">
            {decryptResult.error !== null ? (
              <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                ✗ {decryptResult.error}
              </p>
            ) : (
              <textarea
                readOnly
                value={decryptResult.payload}
                className="h-32 w-full rounded border border-green-300 bg-green-50 p-2 font-mono text-xs text-green-900"
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
