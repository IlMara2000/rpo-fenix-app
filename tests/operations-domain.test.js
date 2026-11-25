import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadDomain() {
  const source = await readFile(new URL("../src/crm/operationsDomain.ts", import.meta.url), "utf8");
  const code = ts.transpile(source, { module: ts.ModuleKind.ESNext });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

const domain = await loadDomain();

test("date arithmetic stays on local days", () => {
  assert.equal(domain.addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(domain.addDays("2026-11-01", 30), "2026-12-01");
  assert.equal(domain.daysUntil("2026-12-01", new Date(2026, 10, 24)), 7);
});

test("a lease keeps registration, notice and end deadlines in order", () => {
  const lease = {
    id: "lease-1",
    propertyId: "property-1",
    tenantName: "Inquilino di prova",
    contractType: "4+4 canone libero",
    rent: "900",
    deposit: "1800",
    startDate: "2026-11-01",
    endDate: "2030-11-01",
    registrationDate: "",
    taxRegime: "Cedolare secca",
    istatAdjustment: "Si",
    status: "Attivo",
    payments: [],
    agent: "",
    officeId: "office-sede-principale",
    notes: "",
    updatedAt: "2026-11-24",
  };

  const deadlines = domain.leaseDeadlines(lease, new Date(2026, 10, 24));
  const registration = deadlines.find((deadline) => deadline.key === "registrazione");
  const notice = deadlines.find((deadline) => deadline.key === "disdetta");

  assert.equal(registration.date, "2026-12-01", "la registrazione scade 30 giorni dopo l'inizio");
  assert.equal(notice.date, domain.addDays(lease.endDate, -180), "la disdetta ha 180 giorni di preavviso");
  assert.deepEqual(
    deadlines.map((deadline) => deadline.days),
    [...deadlines.map((deadline) => deadline.days)].sort((first, second) => first - second),
  );
});

test("a registered lease no longer asks for registration", () => {
  const lease = {
    id: "lease-2",
    propertyId: "property-2",
    tenantName: "Inquilino",
    contractType: "3+2 canone concordato",
    rent: "700",
    deposit: "",
    startDate: "2026-01-10",
    endDate: "2029-01-10",
    registrationDate: "2026-01-20",
    taxRegime: "Cedolare secca",
    istatAdjustment: "Si",
    status: "Attivo",
    payments: [],
    agent: "",
    officeId: "office-sede-principale",
    notes: "",
    updatedAt: "2026-11-24",
  };

  assert.equal(
    domain.leaseDeadlines(lease, new Date(2026, 10, 24)).some((deadline) => deadline.key === "registrazione"),
    false,
  );
});

test("mandate state reports expiry instead of pretending it is active", () => {
  const base = {
    id: "mandate-1",
    propertyId: "property-1",
    type: "Vendita",
    exclusivity: "Esclusiva",
    askingPrice: "250000",
    minimumPrice: "",
    commission: "3%",
    startDate: "2026-01-01",
    endDate: "2026-11-01",
    status: "Attivo",
    officeId: "office-sede-principale",
    agent: "",
    notes: "",
    updatedAt: "2026-11-24",
  };

  const expired = domain.mandateState(base, new Date(2026, 10, 24));
  const soon = domain.mandateState({ ...base, endDate: "2026-11-30" }, new Date(2026, 10, 24));

  assert.equal(expired.tone, "scaduto");
  assert.match(expired.label, /Scaduto da 23 gg/);
  assert.equal(soon.tone, "urgente");
});

test("deal stages advance only inside the pipeline", () => {
  assert.equal(domain.nextDealStage("Proposta"), "Controproposta");
  assert.equal(domain.nextDealStage("Rogito"), "Chiusa");
  assert.equal(domain.nextDealStage("Chiusa"), null);
  assert.equal(domain.nextDealStage("Persa"), null);
});

function dealRecord(overrides = {}) {
  return {
    id: "deal-1",
    propertyId: "property-1",
    clientName: "Cliente",
    type: "Vendita",
    stage: "Rogito",
    offerAmount: "250000",
    deposit: "",
    proposalDate: "2026-11-01",
    expiryDate: "2026-11-15",
    closingDate: "",
    commission: "3%",
    agent: "",
    officeId: "office-sede-principale",
    notes: "",
    stageChangedAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-24",
    ...overrides,
  };
}

test("closing a deal fixes the final price and the earned commission", () => {
  assert.deepEqual(domain.dealClosingValues(dealRecord(), "2026-11-25"), {
    closingDate: "2026-11-25",
    closingPrice: "250000",
    commissionEarned: "3%",
  });
});

test("a deal that already carries closing values keeps them", () => {
  const deal = dealRecord({ closingDate: "2026-11-20", closingPrice: "245000", commissionEarned: "7350" });

  assert.deepEqual(domain.dealClosingValues(deal, "2026-11-25"), {
    closingDate: "2026-11-20",
    closingPrice: "245000",
    commissionEarned: "7350",
  });
});

test("lease end date follows the contract type", () => {
  assert.equal(domain.suggestedLeaseEnd("2026-11-01", "4+4 canone libero"), "2030-11-01");
  assert.equal(domain.suggestedLeaseEnd("2026-11-01", "3+2 canone concordato"), "2029-11-01");
  assert.equal(domain.suggestedLeaseEnd("2026-11-01", "Transitorio"), "2027-11-01");
});
