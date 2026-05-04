// ==============================================================================
// LIC v2 — Tests RSA primitives (Phase 3.A.1)
//
// Couverture obligatoire (cf. brief 3.A.1) :
//   - keygen : PEM valide + unicité de paires successives
//   - signature : round-trip string + Buffer
//   - vérification : faux pour payload modifié, signature corrompue, mauvaise clé
//   - edge cases : base64 invalide → SPX-LIC-400 ; PEM invalide → SPX-LIC-401 ;
//                  payload vide ; payload large 1 Mo ; signature vide
//   - vecteur de non-régression : clé fixe + signature fixe (RSA-PKCS1-v1_5
//                                  étant déterministe par construction RFC8017)
//
// Optimisation perf : RSA-4096 keygen prend ~300 ms. On génère deux paires
// partagées (`paireA`, `paireB`) en `beforeAll`, et on n'effectue de keygens
// supplémentaires que pour les tests qui exigent des paires fraîches/distinctes.
// ==============================================================================

import { beforeAll, describe, expect, it } from "vitest";

import { generateRsaKeyPair, signPayload, verifySignature, type RsaKeyPair } from "../domain/rsa";
import { captureThrow } from "./helpers/throw";

// =============================================================================
// Vecteur de non-régression — clé RSA-4096 fixe + signature attendue.
// CETTE CLÉ EST UN FIXTURE DE TEST. Elle est uniquement utilisée par ce spec.
// JAMAIS pour signer du contenu réel ni intégrée dans la chaîne PKI de prod.
// Garde-fou : RSASSA-PKCS1-v1_5 + SHA-256 est déterministe (RFC 8017 §8.2),
// donc signer le même payload avec cette clé produit toujours la même
// signature. Si ce test casse, c'est qu'une primitive de signature a changé.
// =============================================================================
const VECTOR_PAYLOAD = "S2M-LIC-TEST-VECTOR-2026";

const VECTOR_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIJRAIBADANBgkqhkiG9w0BAQEFAASCCS4wggkqAgEAAoICAQCfvx9NdoBhzP+r
ZpfKFk6dCNMWiQMd2ZoTg/7kj7cD1f3zR5DkIXRruuTHKhvxw1jjZWcHSd96WOEs
9H1IPkDD4OTqIeQNIciu5TjZMfnhqtqRgE2MqiCuE0MIFc5NG2Rfi2a+exmzHqGB
24gjfEYOXvLUQ31u5t1ZH/12A4lHQDXkUuhxuQpFlRnV3CGTzHC0/Ar4GBnwPaDt
kJQ7vkCXxJg2aMBHImDsG089WJNv47P1Ru2Lb6hitDPLf7axdICFjgwIoDGvOLh1
/MCOlFhlu0/rpfpa8b7j71SZprHuA6jcRwtrc7B/2RwXQCVJnajjjo4ANjk4rwoJ
VABXIFXHeG+KUejqNNV4NiRPyeUs+vhb5nmU5SS2JacPv0nCvP85ORuQWmkBjwRv
SuSzR6LuQvxcKEhwmgIBGwVKYjDhi3w1/4RlMscWvM+KoT5QLRmz2CxL1rokyUqh
67qiH+YZ0J6NGvAvUZ0XtOg4pNvi1B1Nc68YsKisZkfJgITAYWw0EdLWroPrgWS/
rM8iAgxoZwUlILKz8wRZAHslz0gP/M/Z5Bludr89AN69RDL71zSCzO/Vcfy5dRc2
zvGZy2kdm8USqutJOnTql9E0kXwpWgPCedjctGTw6QgMVv2e5EBcUxnszYV20Tij
Fpm1/bjoD7dzi0GYsDe+co0yx8hv2wIDAQABAoICAAPZm9wGlJ6GzcyoOtVMh1WC
jm/XGoOgKHX68uw4SH1nrWitG2FcKw2jofro2WaQwjYszfhff+rXdIncVJ6mnXH7
HBlGetQUMd2BOccGTNLzBrSGBphyyznWzgFGYUP7eoZQ+kdx+RMXlGXoUBYm2xti
j3CtNbs0BjatLjMnb6oPcp0PoHmJL6Wwq8A7P3Xr8fVys6L6Fbn0CkpfdysfcTgX
LWH2UVgFjJd0Kws79MW4E7DAJl57cO/8DtmDOPh66dQOMd0NW1UxRUTWtB9blOvS
wWDZDbkeZW7h6ESRv20QmoPAlJZg4eqa5XHsAloNWjItz99SbzueAFxsMVvoNBkC
XyKpT0o2H62K1FgBnjyP6zuELYS6slz81EtdzFdCP3ioFP5/BAPVV3BiBLGjzjnp
Ki39o2xOXlSXER1EDTlGMtUDy+vLxLcvJ3eKODI7ki2p4+qCAO5WNtThFc3uCvEY
NR1bAtOcPfj9d94X5bQp/cBZtdRE+EU/wq6AHBH+9+WUVSe90vj/yNqCcFvs4J+6
lgr1p6WrXUdurJ/rXQl6iYQ1KTKryJ/HhcAoDP0Pr8WFXPc8APZvK4pcYvthk5RN
+UvE1XCE4UuwRA1iVESffLYnX9BvIiM/kz7/AGsn9IIi1ZUJ6rDfLxskq9ZJOUMg
zeQzY6PC7XLpTw6NA1LpAoIBAQDKl33sTO+Fl8462sST6ytc6SvtJCnh43PbJQyJ
fJZp3dVH8o0dgxGSHhLZLo06U0fwbXPGmxx55W5kW92sRgNC3vy2XoeTFAQ+Wr7e
Gp3vf/gf0LQCq9ZFj0cvi8y9fyd2bbXv8u4EDEoF3pfLzjOG3wwb4dQGFfCOG54z
RH3jNQbkUI38fY7YngCIfOZ4YpZbFC3eTkfbXDM5vESeMe00dy3HdcsQitCBOMll
axprs+qxewlQeczgB2RQqUWspySogxHgg4ZzXOp+b82Qv8IwDDZzN/icW3na93wN
tUGMaOsMqo6X4XsP88vB1LVSqeiSdOS2J4hGiV0vbKyzwwiZAoIBAQDJ3BhRhQq+
fne8lQReiZO0TA7DRoWjsh2Mq6Jvd5ZjtLvHZquNh41jNQNPGIDlYYYq/zOdVdD1
TR8rZ6YPD7Aauq/nq1IgTi/ulrgzqdKIFtGCIVfSM7Dz3JCjmTwA7xGb4QHvjwX4
yT/gVPvkWcURxlge9wGZYvd7zNNotidCBX4ETa2XaNolWylBMTDiJjJyvB8ZIGDo
Qf3AQNmTeVozZhXBz4HaNCuk68dU1IEeOAf/0wd0tLEUIktAjoufNbblOM5x4LGg
d/BJZaxPUYVuTyBko1prFu/Ee5qJuNH6S/X12PtDDkJHT1K1IJUzma21+8+JW1tI
BCUCTTLXLoCTAoIBAQCl2Vzx3I3dDMh8r+lruoK2PgCC0y8iSETpKyxXRVIRetQG
YU8a0NjKiKofd5eQHuturPuxo/us4qD7saUISgyTat7xIPPV+PX8YeeNBbczgMyM
pxsmcKwqJ8A78TN8EiMpNWlS9MnbMIBMy8vywWy3RdOw46/iB4X1oDBjgfeY0ClD
MZr7D4KoXLjNA4rdFMBH8X4XVnhG4PTil/iIlRC9+a7Vcd36PdmxX96nkwV/FDvW
bYXThtKsuABsdBag3/gHp70z0hh4SqGBPl/H1uPO18CflDuHLO/VzPKWekMeAioi
JWI0fhdzmL6+gDasZIILm3w8jqJmND+/+jRruQdJAoIBAQCwKApw2ZGOu/7x63ls
ptLnPJiFgT2OpRl0cTPH4qyzRj24vbhoQir4sIK6u7+AbaMQUrVQUFuSNkNFNaaM
7jvYl6J6od+BobnilFUbgM/hQ0iCL2bcYY/CwHDY1BixF/Bd//YYgM/NVJMRyhgo
Js77vAOawiP7H4qp1w2HC68mxnQ6fS9IOpBkmTFfWvY15O+RgOoCm2b2SOCQrgcx
020L/cJu6A+BxJVxzvCc7vXe0Tbp4ddX2XfPAj55j+v4fH+nefNvHY7lYsWmx7uf
XJz8rsCuEoANhG6pINSz6z4TF8cFTN24nvDoGikrN8v8w9f8QEvUqoz2Q+eoIoaD
kmlRAoIBAQCQXxxfd5OsGSCjvmGj1LHElkhOMh0xQ34pXCZA2X5NVbT36b5ZkrwZ
McIa5HDItGkd7p9NnJlRFpcM94+T644meR3BvuEYAaTy5NA7MobboB28+WCRs2W/
dU8+4MeFZ/LjuTlGF29asZyMVutDEglrrN5ILU/oCZU2u3WFpAPRPOz35ox+qaW1
Z+qhHKt3KMqmgm1ju7MHZqJYWFst0LnyvFbfUeuNzOtyGmDO7lRCGWsg9ufDnqyq
W/UZHZXmO3BXj3brIsZoqqKlGxcnH2TeiFcuMN9emOwapvulhqMOmvTZx6oBULIa
RJpp752lgxNPDDyjelqXikaf3VuygR1s
-----END PRIVATE KEY-----
`;

const VECTOR_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAn78fTXaAYcz/q2aXyhZO
nQjTFokDHdmaE4P+5I+3A9X980eQ5CF0a7rkxyob8cNY42VnB0nfeljhLPR9SD5A
w+Dk6iHkDSHIruU42TH54arakYBNjKogrhNDCBXOTRtkX4tmvnsZsx6hgduII3xG
Dl7y1EN9bubdWR/9dgOJR0A15FLocbkKRZUZ1dwhk8xwtPwK+BgZ8D2g7ZCUO75A
l8SYNmjARyJg7BtPPViTb+Oz9Ubti2+oYrQzy3+2sXSAhY4MCKAxrzi4dfzAjpRY
ZbtP66X6WvG+4+9Umaax7gOo3EcLa3Owf9kcF0AlSZ2o446OADY5OK8KCVQAVyBV
x3hvilHo6jTVeDYkT8nlLPr4W+Z5lOUktiWnD79Jwrz/OTkbkFppAY8Eb0rks0ei
7kL8XChIcJoCARsFSmIw4Yt8Nf+EZTLHFrzPiqE+UC0Zs9gsS9a6JMlKoeu6oh/m
GdCejRrwL1GdF7ToOKTb4tQdTXOvGLCorGZHyYCEwGFsNBHS1q6D64Fkv6zPIgIM
aGcFJSCys/MEWQB7Jc9ID/zP2eQZbna/PQDevUQy+9c0gszv1XH8uXUXNs7xmctp
HZvFEqrrSTp06pfRNJF8KVoDwnnY3LRk8OkIDFb9nuRAXFMZ7M2FdtE4oxaZtf24
6A+3c4tBmLA3vnKNMsfIb9sCAwEAAQ==
-----END PUBLIC KEY-----
`;

const VECTOR_EXPECTED_SIGNATURE =
  "Jt2+fi1YK5FuPN9WXNRUXc/53d2MbuwE1N+D45BGxp3G/Bq6Nc6LQrzKj5NmtUezIbVAau1VCaalQzXp8V2+HImtPDpNhUhsMKf8qdyMQh1noP5Wp6FDJugopA3dC7vGDuGB4ZsqIo7O1e19lIE3QmGkDv3KB2FmNcCpySLXIZ3z4pOt2TQoBrER7jwV43Xyb8cpq3R3razltdjrXtvtKiNAN6VWpPOGvpd2i9Ai0IzVWqXZ7o4xHXLzioqPKa7/DQpCT6gv0E6HPwODy02m9/uP6OD7mgy0y4o8akgDAVjpQsXGYlesfpTS/YRk9C2wV6E0bpDZ5USq6lx9R8eQpF5vfjti+PiLPIisjSCo2Xcx6N/lEd2O12M16Toox/+LgPHNn97dvQpbhtmcbZPxN4e+wv5hTAeo3ZYV/ewTDpEydJdG2sY6730PMwc/5bTClCrVi89wbR+WUkfW9SQoB9ivLlXeGURWqSGiil0SZlHiVgdc6fNsHDnoZ9obud+Ye/XeUwxf/Bk3lj5fYP+yI6HMOt3VztsjoHeTI72z/wgWbTAw3N7FCkUNuZCkAxXcliS/DAx9VtjLIUQdzNYfajxReYVgORY+bjjY2l7E+PFT95MVRES2I4XcTFPvNFOaN4sAH4oNxUrxzaj8ulHqyyooJo/kNpMtEM9AvdalUbI=";

let paireA: RsaKeyPair;
let paireB: RsaKeyPair;

beforeAll(() => {
  // Deux paires partagées pour la majorité des tests (économise ~6×300 ms).
  paireA = generateRsaKeyPair();
  paireB = generateRsaKeyPair();
});

describe("generateRsaKeyPair", () => {
  it("retourne deux PEM valides (PKCS#8 privée + SPKI publique)", () => {
    expect(paireA.privateKeyPem).toMatch(/^-----BEGIN PRIVATE KEY-----\n/);
    expect(paireA.privateKeyPem).toMatch(/-----END PRIVATE KEY-----\n?$/);
    expect(paireA.publicKeyPem).toMatch(/^-----BEGIN PUBLIC KEY-----\n/);
    expect(paireA.publicKeyPem).toMatch(/-----END PUBLIC KEY-----\n?$/);
  });

  it("deux appels successifs produisent des paires distinctes", () => {
    const fresh1 = generateRsaKeyPair();
    const fresh2 = generateRsaKeyPair();
    expect(fresh1.privateKeyPem).not.toBe(fresh2.privateKeyPem);
    expect(fresh1.publicKeyPem).not.toBe(fresh2.publicKeyPem);
  });
});

describe("signPayload + verifySignature — round-trip", () => {
  it("signe et vérifie un payload string (round-trip OK)", () => {
    const sig = signPayload("hello world", paireA.privateKeyPem);
    expect(verifySignature("hello world", sig, paireA.publicKeyPem)).toBe(true);
  });

  it("signe et vérifie un payload Buffer (round-trip OK)", () => {
    const buf = Buffer.from([0x01, 0x02, 0xff, 0xfe, 0x00]);
    const sig = signPayload(buf, paireA.privateKeyPem);
    expect(verifySignature(buf, sig, paireA.publicKeyPem)).toBe(true);
  });

  it("payload string vide → signature valide (cas limite RFC 8017)", () => {
    const sig = signPayload("", paireA.privateKeyPem);
    expect(sig.length).toBeGreaterThan(0);
    expect(verifySignature("", sig, paireA.publicKeyPem)).toBe(true);
  });

  it("payload large (1 Mo Buffer) → signature valide sans timeout", () => {
    const onMega = Buffer.alloc(1024 * 1024, 0x42);
    const sig = signPayload(onMega, paireA.privateKeyPem);
    expect(verifySignature(onMega, sig, paireA.publicKeyPem)).toBe(true);
  });
});

describe("verifySignature — rejets attendus", () => {
  it("retourne false si le payload est modifié d'1 octet", () => {
    const sig = signPayload("hello world", paireA.privateKeyPem);
    expect(verifySignature("hello worle", sig, paireA.publicKeyPem)).toBe(false);
  });

  it("retourne false si la signature base64 est altérée mais reste base64 valide", () => {
    const sig = signPayload("hello world", paireA.privateKeyPem);
    // Inverser le 1er caractère sans casser le format base64
    const firstChar = sig[0];
    const altered = firstChar === "A" ? `B${sig.slice(1)}` : `A${sig.slice(1)}`;
    expect(verifySignature("hello world", altered, paireA.publicKeyPem)).toBe(false);
  });

  it("retourne false si la clé publique provient d'une autre paire", () => {
    const sig = signPayload("hello world", paireA.privateKeyPem);
    expect(verifySignature("hello world", sig, paireB.publicKeyPem)).toBe(false);
  });

  it("retourne false si la signature est une string vide", () => {
    expect(verifySignature("hello world", "", paireA.publicKeyPem)).toBe(false);
  });
});

describe("verifySignature — base64 invalide → SPX-LIC-400", () => {
  it.each<string>([
    "not_base64!",
    "abc", // longueur 3 (pas multiple de 4)
    "abcde", // longueur 5 (pas multiple de 4)
    "abc$$", // caractère interdit
    "abc=def", // padding au milieu
  ])("throws SPX-LIC-400 sur signature %j", (badSignature) => {
    expect(
      captureThrow(() => verifySignature("hello", badSignature, paireA.publicKeyPem)),
    ).toMatchObject({ code: "SPX-LIC-400" });
  });
});

describe("clés invalides → SPX-LIC-401", () => {
  it("signPayload throws SPX-LIC-401 si privateKeyPem n'est pas du PEM", () => {
    expect(captureThrow(() => signPayload("hello", "not a key"))).toMatchObject({
      code: "SPX-LIC-401",
    });
  });

  it("signPayload throws SPX-LIC-401 sur PEM corrompu", () => {
    const corrupted = paireA.privateKeyPem.replace("MII", "XXX");
    expect(captureThrow(() => signPayload("hello", corrupted))).toMatchObject({
      code: "SPX-LIC-401",
    });
  });

  it("verifySignature throws SPX-LIC-401 si publicKeyPem n'est pas du PEM", () => {
    const validSig = signPayload("hello", paireA.privateKeyPem);
    expect(captureThrow(() => verifySignature("hello", validSig, "not a key"))).toMatchObject({
      code: "SPX-LIC-401",
    });
  });
});

describe("vecteur de non-régression — clé fixe + signature fixe", () => {
  it("signe le vecteur S2M-LIC-TEST-VECTOR-2026 vers la signature attendue", () => {
    const sig = signPayload(VECTOR_PAYLOAD, VECTOR_PRIVATE_KEY_PEM);
    expect(sig).toBe(VECTOR_EXPECTED_SIGNATURE);
  });

  it("vérifie la signature attendue avec la clé publique fixe", () => {
    expect(verifySignature(VECTOR_PAYLOAD, VECTOR_EXPECTED_SIGNATURE, VECTOR_PUBLIC_KEY_PEM)).toBe(
      true,
    );
  });

  it("rejette la signature attendue contre un payload modifié", () => {
    expect(
      verifySignature(`${VECTOR_PAYLOAD}X`, VECTOR_EXPECTED_SIGNATURE, VECTOR_PUBLIC_KEY_PEM),
    ).toBe(false);
  });
});
