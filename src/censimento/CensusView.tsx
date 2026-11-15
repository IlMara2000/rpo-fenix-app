import { Suspense, lazy, useState } from "react";
import { StructuredQuickForm } from "../crm/components/StructuredQuickForm";
import { censusContactFormSections } from "../crm/featureForms";
import {
  activeFilters,
  appendOwnerLabel,
  cadastralCategoryOptions,
  cadastralLabel,
  createActivity,
  crmStorageKey,
  fieldValue,
  formatFullName,
  makeId,
  matchesStructuredFilters,
  nowLabel,
  propertyOwnerNames,
  removeOwnerLabel,
  roomOptions,
  sameLabel,
  searchFilterFields,
  splitFullName,
  useFilteredRows,
  valuesSummary,
  type CensusAreaRecord,
  type CensusComplexRecord,
  type CensusStreetRecord,
  type CrmCommit,
  type CrmData,
  type PropertyRecord,
} from "../crm/kit";
import { privateStorage } from "../lib/privateStorage";
import { DataTable, Panel, QuickForm } from "../ui/primitives";
import { CensimentoWorkspace } from "./CensimentoWorkspace";
import { CyborgPanel } from "./CyborgPanel";
import { mergeCyborgImport } from "./cyborgImport";
import { censimentoSites, findCensimentoSite, type CensimentoSiteId } from "./sites";

/**
 * La mappa porta con se' il motore cartografico (circa 800 kB): si carica solo
 * quando l'operatore la apre, invece di pesare su ogni pagina del gestionale.
 */
const PropertyMap = lazy(() =>
  import("./PropertyMap").then((module) => ({ default: module.PropertyMap })),
);

export function CensusView({
  pageKey,
  query,
  data,
  onCommit,
  onAction,
}: {
  pageKey: string;
  query: string;
  data: CrmData;
  onCommit: CrmCommit;
  onAction: (message: string) => void;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeSiteId, setActiveSiteId] = useState<CensimentoSiteId | null>(null);
  const mapPage = pageKey === "censimento-mappa";
  const saveMapPositions = (entries: Array<{ id: string; lat: number; lng: number }>) => {
    if (!entries.length) {
      return;
    }
    const positions = new Map(entries.map((entry) => [entry.id, entry]));
    const stamp = new Date().toISOString();
    onCommit(
      (current) => ({
        ...current,
        properties: current.properties.map((property) => {
          const position = positions.get(property.id);
          return position
            ? { ...property, lat: position.lat, lng: position.lng, updatedAt: stamp }
            : property;
        }),
      }),
      entries.length === 1
        ? "Posizione salvata sull'immobile"
        : `Posizioni salvate su ${entries.length} immobili`,
    );
  };
  const activeSite = mapPage
    ? findCensimentoSite("mappa") ?? null
    : activeSiteId
      ? findCensimentoSite(activeSiteId) ?? null
      : null;
  const censusAreas = useFilteredRows(data.censusAreas, query, (area) =>
    [area.zone, String(area.buildings), String(area.contacts), area.updatedAt].join(" "),
  );
  const savedCensusStreets = data.censusStreets ?? [];
  const savedCensusComplexes = data.censusComplexes ?? [];
  const censusStreets = useFilteredRows(savedCensusStreets, query, (street) =>
    [street.zone, street.street, String(street.complexes)].join(" "),
  );
  const censusComplexes = useFilteredRows(savedCensusComplexes, query, (complex) =>
    [complex.zone, complex.street, complex.name, String(complex.units), String(complex.owners)].join(" "),
  );
  const censusPropertyBase = data.properties.filter((property) =>
    property.source === "Censimento" || /censito|proprietario collegato/i.test(property.status),
  );
  const censusProperties = useFilteredRows(censusPropertyBase, query, (property) =>
    [
      property.code,
      property.title,
      property.zone,
      property.owner,
      property.status,
      property.sheet,
      property.parcel,
      property.subaltern,
      property.cadastralCategory,
      property.rooms,
    ].join(" "),
  );
  const allCensusOwners = data.contacts.filter((contact) => /proprietario/i.test(contact.type) || contact.source === "Censimento");
  const censusOwnerBase = allCensusOwners
    .filter((contact) => {
      const splitName = splitFullName(contact.name);
      return matchesStructuredFilters(filters, {
        Nome: contact.firstName || splitName.firstName || contact.name,
        Cognome: contact.lastName || splitName.lastName || contact.name,
        Numero: contact.phone || "",
        "Codice fiscale": contact.taxCode || "",
        Foglio: contact.sheet || "",
        Particella: contact.parcel || "",
        Subalterno: contact.subaltern || "",
        "Categoria catastale": contact.cadastralCategory || "",
        Vani: contact.rooms || "",
      });
    });
  const censusOwners = useFilteredRows(
    censusOwnerBase,
    query,
    (contact) =>
      [
        contact.name,
        contact.firstName,
        contact.lastName,
        contact.type,
        contact.status,
        contact.note,
        contact.phone,
        contact.taxCode,
        contact.sheet,
        contact.parcel,
        contact.subaltern,
        contact.cadastralCategory,
        contact.rooms,
      ].join(" "),
  );
  const ownersTotal = allCensusOwners.length;
  const phaseCards = [
    {
      label: "1. Zona",
      value: data.censusAreas.length,
      text: "Crea o seleziona il territorio di riferimento.",
    },
    {
      label: "2. Via",
      value: savedCensusStreets.length,
      text: "Collega la via alla zona corretta.",
    },
    {
      label: "3. Complesso",
      value: savedCensusComplexes.length,
      text: "Inserisci il palazzo dentro la via scelta.",
    },
    {
      label: "4. Immobili",
      value: censusPropertyBase.length,
      text: "Crea le unita immobiliari dentro il complesso.",
    },
    {
      label: "5. Proprietari",
      value: ownersTotal,
      text: "Collega clienti e proprietari agli immobili censiti.",
    },
  ];
  const pageTitle =
    pageKey === "censimento-contatti"
      ? "Contatti Censimento"
      : pageKey === "censimento-nuovo-contatto"
        ? "Nuovo contatto"
    : pageKey === "censimento-vie"
      ? "Vie censite"
      : pageKey === "censimento-complessi"
        ? "Complessi e palazzi"
        : pageKey === "censimento-immobili"
          ? "Immobili censiti"
        : pageKey === "censimento-proprietari"
          ? "Proprietari immobili"
          : "Zone censite";
  const formTitle =
    pageKey === "censimento-contatti"
      ? "Filtro contatti"
      : pageKey === "censimento-nuovo-contatto"
        ? "Nuovo contatto censimento"
    : pageKey === "censimento-vie"
      ? "Crea o seleziona via"
      : pageKey === "censimento-complessi"
        ? "Crea o seleziona complesso"
        : pageKey === "censimento-immobili"
          ? "Crea o seleziona immobile"
        : pageKey === "censimento-proprietari"
          ? "Collega proprietario"
          : "Crea o seleziona zona";
  const formFields =
    pageKey === "censimento-contatti"
      ? searchFilterFields
      : pageKey === "censimento-nuovo-contatto"
        ? [
            "Zona",
            "Via",
            "Civico",
            "Complesso",
            { name: "Estensione", options: ["Intero edificio", "Parte di edificio", "Unita immobiliare"], required: false },
            { name: "Numero piani", required: false },
            { name: "Piano", required: false },
            { name: "Scala", required: false },
            { name: "Foglio", required: false },
            { name: "Particella", required: false },
            { name: "Subalterno", required: false },
            { name: "Categoria catastale", options: cadastralCategoryOptions, required: false },
            { name: "Vani", options: roomOptions, required: false },
            { name: "Superficie", required: false },
            { name: "Occupazione", options: ["Libero", "Occupato", "Affittato", "Sconosciuto"], required: false },
            { name: "Ascensore", options: ["Non indicato", "Si", "No"], required: false },
            "Nome",
            "Cognome",
            { name: "Telefono", required: false },
            { name: "Email", required: false },
            { name: "Codice fiscale", required: false },
            { name: "Immobile collegato", required: false },
          ]
    : pageKey === "censimento-vie"
      ? ["Zona", "Via"]
      : pageKey === "censimento-complessi"
        ? ["Zona", "Via", "Palazzo / Complesso", "Unita"]
        : pageKey === "censimento-immobili"
          ? [
              "Zona",
              "Via",
              "Complesso",
              "Immobile",
              { name: "Foglio", required: false },
              { name: "Particella", required: false },
              { name: "Subalterno", required: false },
              { name: "Categoria catastale", options: cadastralCategoryOptions, required: false },
              { name: "Vani", options: roomOptions, required: false },
            ]
        : pageKey === "censimento-proprietari"
          ? [
              "Zona",
              "Via",
              "Complesso",
              "Nome",
              "Cognome",
              { name: "Numero", required: false },
              { name: "Codice fiscale", required: false },
              { name: "Foglio", required: false },
              { name: "Particella", required: false },
              { name: "Subalterno", required: false },
              { name: "Categoria catastale", options: cadastralCategoryOptions, required: false },
              { name: "Vani", options: roomOptions, required: false },
              { name: "Immobile collegato", required: false },
            ]
          : ["Zona"];
  const tableColumns =
    pageKey === "censimento-contatti" || pageKey === "censimento-nuovo-contatto"
      ? ["Cognome e nome", "Tipologia", "Zona/Via", "Telefono", "Catasto", "Ricontatto"]
      : pageKey === "censimento-vie"
      ? ["Zona", "Via", "Complessi", "Aggiornato"]
      : pageKey === "censimento-complessi"
        ? ["Zona", "Via", "Complesso", "Unita", "Proprietari"]
        : pageKey === "censimento-immobili"
          ? ["Codice", "Immobile", "Zona", "Proprietario", "Catasto", "Stato"]
        : pageKey === "censimento-proprietari"
          ? ["Proprietario", "Tipo", "Percorso", "Telefono", "Catasto", "Stato"]
          : ["Zona", "Vie/Palazzi", "Proprietari", "Aggiornato"];
  const tableRows =
    pageKey === "censimento-contatti" || pageKey === "censimento-nuovo-contatto"
      ? censusOwners.map((owner) => [
          owner.name,
          owner.type,
          owner.note || "-",
          owner.phone || "-",
          cadastralLabel(owner),
          owner.nextStep || owner.status,
        ])
      : pageKey === "censimento-vie"
      ? censusStreets.map((street) => [street.zone, street.street, String(street.complexes), street.updatedAt])
      : pageKey === "censimento-complessi"
        ? censusComplexes.map((complex) => [
            complex.zone,
            complex.street,
            complex.name,
            String(complex.units || "-"),
            String(complex.owners),
          ])
        : pageKey === "censimento-immobili"
          ? censusProperties.map((property) => [
              property.code,
              property.title,
              property.zone,
              property.owner || "-",
              cadastralLabel(property),
              property.status,
            ])
        : pageKey === "censimento-proprietari"
          ? censusOwners.map((owner) => [
              owner.name,
              owner.type,
              owner.note || "-",
              owner.phone || "-",
              cadastralLabel(owner),
              owner.status,
            ])
          : censusAreas.map((area) => [
              area.zone,
              String(area.buildings),
              String(area.contacts),
              area.updatedAt,
            ]);

  function ensureArea(
    areas: CensusAreaRecord[],
    zone: string,
    contactDelta = 0,
    buildingDelta = 0,
  ) {
    const existing = areas.some((area) => sameLabel(area.zone, zone));
    if (!existing) {
      return [
        {
          id: makeId("area"),
          zone,
          buildings: Math.max(0, buildingDelta),
          contacts: Math.max(0, contactDelta),
          updatedAt: nowLabel(),
        },
        ...areas,
      ];
    }

    return areas.map((area) =>
      sameLabel(area.zone, zone)
        ? {
            ...area,
            buildings: Math.max(0, area.buildings + buildingDelta),
            contacts: Math.max(0, area.contacts + contactDelta),
            updatedAt: nowLabel(),
          }
        : area,
    );
  }

  function ensureStreet(streets: CensusStreetRecord[], zone: string, street: string, complexDelta = 0) {
    const existing = streets.some((item) => sameLabel(item.zone, zone) && sameLabel(item.street, street));
    if (!existing) {
      return [
        {
          id: makeId("street"),
          zone,
          street,
          complexes: Math.max(0, complexDelta),
          updatedAt: nowLabel(),
        },
        ...streets,
      ];
    }

    return streets.map((item) =>
      sameLabel(item.zone, zone) && sameLabel(item.street, street)
        ? {
            ...item,
            complexes: Math.max(0, item.complexes + complexDelta),
            updatedAt: nowLabel(),
          }
        : item,
    );
  }

  function ensureComplex(
    complexes: CensusComplexRecord[],
    zone: string,
    street: string,
    name: string,
    units = 0,
    ownerDelta = 0,
  ) {
    const existing = complexes.some(
      (item) => sameLabel(item.zone, zone) && sameLabel(item.street, street) && sameLabel(item.name, name),
    );
    if (!existing) {
      return [
        {
          id: makeId("complex"),
          zone,
          street,
          name,
          units,
          owners: Math.max(0, ownerDelta),
          updatedAt: nowLabel(),
        },
        ...complexes,
      ];
    }

    return complexes.map((item) =>
      sameLabel(item.zone, zone) && sameLabel(item.street, street) && sameLabel(item.name, name)
        ? {
            ...item,
            units: units > 0 ? units : item.units,
            owners: Math.max(0, item.owners + ownerDelta),
            updatedAt: nowLabel(),
          }
        : item,
    );
  }

  function linkOwnerToProperty(
    properties: PropertyRecord[],
    propertyLabel: string,
    zone: string,
    contactName: string,
    details: Partial<PropertyRecord> = {},
    linkAsOwner = true,
  ): PropertyRecord[] {
    if (!propertyLabel) {
      return properties;
    }

    const {
      phone: contactPhone,
      taxCode: contactTaxCode,
      ...propertyDetails
    } = details;
    const existing = properties.some((property) => sameLabel(property.title, propertyLabel) || sameLabel(property.code, propertyLabel));
    if (!existing) {
      return [
        {
          id: makeId("property"),
          code: `FS-${String(250 + properties.length).padStart(3, "0")}`,
          title: propertyLabel,
          zone,
          status: "Censito",
          price: "Da valutare",
          owner: linkAsOwner ? contactName : "Proprietario da associare",
          portals: "Privato",
          kind: "vendita",
          ...(linkAsOwner ? details : propertyDetails),
          updatedAt: nowLabel(),
        },
        ...properties,
      ];
    }

    return properties.map((property) => {
      if (!sameLabel(property.title, propertyLabel) && !sameLabel(property.code, propertyLabel)) {
        return property;
      }

      const nextOwner = linkAsOwner
        ? appendOwnerLabel(property.owner, contactName)
        : removeOwnerLabel(property.owner, contactName);
      const ownerWasRemoved = !linkAsOwner && nextOwner === "Proprietario da associare";

      return {
        ...property,
        owner: nextOwner,
        status: linkAsOwner
          ? "Proprietario collegato"
          : ownerWasRemoved && property.status === "Proprietario collegato"
            ? "Censito"
            : property.status,
        phone: linkAsOwner
          ? contactPhone || property.phone
          : ownerWasRemoved
            ? ""
            : property.phone,
        taxCode: linkAsOwner
          ? contactTaxCode || property.taxCode
          : ownerWasRemoved
            ? ""
            : property.taxCode,
        sheet: details.sheet || property.sheet,
        parcel: details.parcel || property.parcel,
        subaltern: details.subaltern || property.subaltern,
        cadastralCategory: details.cadastralCategory || property.cadastralCategory,
        rooms: details.rooms || property.rooms,
        source: details.source || property.source,
        details: {
          ...property.details,
          ...details.details,
        },
        updatedAt: nowLabel(),
      };
    });
  }

  function saveCensus(values: Record<string, string>) {
    const zone = fieldValue(values, "Zona", fieldValue(values, "area", "Zona da definire"));
    const street = fieldValue(values, "Via", fieldValue(values, "street", "Via da definire"));
    const complexName =
      fieldValue(values, "Palazzo / Complesso") ||
      fieldValue(values, "Complesso") ||
      fieldValue(values, "buildingName", "Complesso da definire");
    const unitsValue = Number.parseInt(fieldValue(values, "Unita", "0"), 10);
    const units = Number.isFinite(unitsValue) && unitsValue > 0 ? unitsValue : 0;

    if (pageKey === "censimento-zone") {
      onCommit(
        (currentData) => ({
          ...currentData,
          censusAreas: ensureArea(currentData.censusAreas, zone),
        }),
        `Zona ${zone} salvata.`,
      );
      return;
    }

    if (pageKey === "censimento-vie") {
      onCommit(
        (currentData) => ({
          ...currentData,
          censusAreas: ensureArea(currentData.censusAreas, zone),
          censusStreets: ensureStreet(currentData.censusStreets ?? [], zone, street),
        }),
        `Via ${street} collegata alla zona ${zone}.`,
      );
      return;
    }

    if (pageKey === "censimento-complessi") {
      onCommit(
        (currentData) => {
          const complexExists = (currentData.censusComplexes ?? []).some(
            (item) => sameLabel(item.zone, zone) && sameLabel(item.street, street) && sameLabel(item.name, complexName),
          );
          const complexDelta = complexExists ? 0 : 1;
          return {
            ...currentData,
            censusAreas: ensureArea(currentData.censusAreas, zone, 0, complexDelta),
            censusStreets: ensureStreet(currentData.censusStreets ?? [], zone, street, complexDelta),
            censusComplexes: ensureComplex(currentData.censusComplexes ?? [], zone, street, complexName, units),
          };
        },
        `Complesso ${complexName} salvato in ${street}.`,
      );
      return;
    }

    if (pageKey === "censimento-immobili") {
      const propertyLabel = fieldValue(values, "Immobile", "Immobile da definire");
      const sheet = fieldValue(values, "Foglio");
      const parcel = fieldValue(values, "Particella");
      const subaltern = fieldValue(values, "Subalterno");
      const cadastralCategory = fieldValue(values, "Categoria catastale");
      const rooms = fieldValue(values, "Vani");
      onCommit(
        (currentData) => {
          const complexExists = (currentData.censusComplexes ?? []).some(
            (item) => sameLabel(item.zone, zone) && sameLabel(item.street, street) && sameLabel(item.name, complexName),
          );
          const complexDelta = complexExists ? 0 : 1;
          const propertyExists = currentData.properties.some(
            (property) => sameLabel(property.title, propertyLabel) || sameLabel(property.code, propertyLabel),
          );
          return {
            ...currentData,
            properties: propertyExists
              ? currentData.properties.map((property) =>
                  sameLabel(property.title, propertyLabel) || sameLabel(property.code, propertyLabel)
                    ? {
                        ...property,
                        zone,
                        status: "Censito",
                        sheet: sheet || property.sheet,
                        parcel: parcel || property.parcel,
                        subaltern: subaltern || property.subaltern,
                        cadastralCategory: cadastralCategory || property.cadastralCategory,
                        rooms: rooms || property.rooms,
                        source: "Censimento",
                        updatedAt: nowLabel(),
                      }
                    : property,
                )
              : [
                  {
                    id: makeId("property"),
                    code: `FS-${String(250 + currentData.properties.length).padStart(3, "0")}`,
                    title: propertyLabel,
                    zone,
                    status: "Censito",
                    price: "Da valutare",
                    owner: "Proprietario da associare",
                    portals: "Privato",
                    kind: "vendita" as const,
                    sheet,
                    parcel,
                    subaltern,
                    cadastralCategory,
                    rooms,
                    source: "Censimento",
                    updatedAt: nowLabel(),
                  },
                  ...currentData.properties,
                ],
            censusAreas: ensureArea(currentData.censusAreas, zone, 0, complexDelta),
            censusStreets: ensureStreet(currentData.censusStreets ?? [], zone, street, complexDelta),
            censusComplexes: ensureComplex(currentData.censusComplexes ?? [], zone, street, complexName),
            activities: [
              createActivity({
                title: `Immobile censito ${propertyLabel}`,
                type: "Censimento",
                property: propertyLabel,
                note: `Zona: ${zone} / Via: ${street} / Complesso: ${complexName}`,
              }),
              ...currentData.activities,
            ],
          };
        },
        `Immobile ${propertyLabel} salvato nel censimento.`,
      );
      return;
    }

    const firstName = fieldValue(values, "Nome", fieldValue(values, "ownerFirstName"));
    const lastName = fieldValue(values, "Cognome", fieldValue(values, "ownerLastName"));
    const ownerName = formatFullName(firstName, lastName, fieldValue(values, "Proprietario", "Referente da definire"));
    const phone =
      fieldValue(values, "Numero") ||
      fieldValue(values, "Telefono") ||
      fieldValue(values, "primaryPhone");
    const email = fieldValue(values, "Email", fieldValue(values, "email"));
    const taxCode = fieldValue(values, "Codice fiscale", fieldValue(values, "ownerTaxCode"));
    const sheet = fieldValue(values, "Foglio", fieldValue(values, "cadastralSheet"));
    const parcel = fieldValue(values, "Particella", fieldValue(values, "cadastralParcel"));
    const subaltern = fieldValue(values, "Subalterno", fieldValue(values, "cadastralSubaltern"));
    const cadastralCategory = fieldValue(values, "Categoria catastale", fieldValue(values, "cadastralCategory"));
    const rooms = fieldValue(values, "Vani", fieldValue(values, "cadastralRooms", fieldValue(values, "rooms")));
    const propertyLabel = fieldValue(values, "Immobile collegato", fieldValue(values, "propertyLabel"));
    const contactType = fieldValue(values, "contactRole", "Referente");
    const isOwnerRole = /^(proprietario|comproprietario)$/i.test(contactType.trim());
    const contactStatus = fieldValue(
      values,
      "surveyStatus",
      isOwnerRole ? "Proprietario censito" : "Referente censito",
    );
    const censusNote = fieldValue(values, "surveyNotes");
    const nextContact = [
      fieldValue(values, "nextContactDate"),
      fieldValue(values, "nextContactTime"),
      fieldValue(values, "nextContactReason"),
    ].filter(Boolean).join(" / ");
    const ownerPath = `Zona: ${zone} / Via: ${street} / Complesso: ${complexName}`;

    onCommit(
      (currentData) => {
        const existingContact = currentData.contacts.find((contact) =>
          sameLabel(contact.name, ownerName),
        );
        const existingProperty = currentData.properties.find(
          (property) =>
            sameLabel(property.title, propertyLabel) ||
            sameLabel(property.code, propertyLabel),
        );
        const linkedAlready =
          !!existingContact &&
          /proprietario/i.test(existingContact.type) &&
          !!existingProperty &&
          propertyOwnerNames(existingProperty).some((owner) =>
            sameLabel(owner, ownerName),
          );
        const ownerDelta = isOwnerRole
          ? linkedAlready
            ? 0
            : 1
          : linkedAlready
            ? -1
            : 0;
        const complexExists = (currentData.censusComplexes ?? []).some(
          (item) => sameLabel(item.zone, zone) && sameLabel(item.street, street) && sameLabel(item.name, complexName),
        );
        const complexDelta = complexExists ? 0 : 1;
        const contactExists = currentData.contacts.some((contact) => sameLabel(contact.name, ownerName));
        const updatedContacts = contactExists
          ? currentData.contacts.map((contact) =>
              sameLabel(contact.name, ownerName)
                ? {
                    ...contact,
                    firstName: firstName || contact.firstName,
                    lastName: lastName || contact.lastName,
                    type: contactType,
                    status: contactStatus,
                    phone: phone || contact.phone,
                    email: email || contact.email,
                    taxCode: taxCode || contact.taxCode,
                    sheet: sheet || contact.sheet,
                    parcel: parcel || contact.parcel,
                    subaltern: subaltern || contact.subaltern,
                    cadastralCategory: cadastralCategory || contact.cadastralCategory,
                    rooms: rooms || contact.rooms,
                    property: propertyLabel || contact.property,
                    note: censusNote || ownerPath,
                    nextStep: nextContact || (propertyLabel ? `Collegato a ${propertyLabel}` : "Associare immobile"),
                    details: values,
                    updatedAt: nowLabel(),
                  }
                : contact,
            )
          : [
              {
                id: makeId("contact"),
                name: ownerName,
                firstName,
                lastName,
                type: contactType,
                status: contactStatus,
                source: "Censimento",
                owner: fieldValue(values, "surveyOperator", "Daniele"),
                phone,
                email,
                taxCode,
                sheet,
                parcel,
                subaltern,
                cadastralCategory,
                rooms,
                property: propertyLabel,
                note: censusNote || ownerPath,
                nextStep: nextContact || (propertyLabel ? `Collegato a ${propertyLabel}` : "Associare immobile"),
                details: values,
                updatedAt: nowLabel(),
              },
              ...currentData.contacts,
            ];

        return {
          ...currentData,
          contacts: updatedContacts,
          properties: linkOwnerToProperty(
            currentData.properties,
            propertyLabel,
            zone,
            ownerName,
            {
              phone,
              taxCode,
              sheet,
              parcel,
              subaltern,
              cadastralCategory,
              rooms,
              source: "Censimento",
              details: values,
            },
            isOwnerRole,
          ),
          censusAreas: ensureArea(currentData.censusAreas, zone, ownerDelta, complexDelta),
          censusStreets: ensureStreet(currentData.censusStreets ?? [], zone, street, complexDelta),
          censusComplexes: ensureComplex(currentData.censusComplexes ?? [], zone, street, complexName, 0, ownerDelta),
          activities: [
            createActivity({
              title: `${isOwnerRole ? "Proprietario" : "Referente"} ${ownerName}`,
              type: "Censimento",
              contact: ownerName,
              property: propertyLabel,
              note: ownerPath,
            }),
            ...currentData.activities,
          ],
        };
      },
      propertyLabel
        ? `${ownerName} collegato come ${contactType.toLowerCase()} a ${propertyLabel}.`
        : `${ownerName} salvato come ${contactType.toLowerCase()} censito.`,
    );
  }

  function selectSite(id: CensimentoSiteId) {
    const site = findCensimentoSite(id);
    if (!site) {
      return;
    }
    if (site.mode === "external") {
      window.open(site.url, "_blank", "noopener,noreferrer");
      onAction(`${site.label} aperto in una scheda del browser.`);
      return;
    }
    setActiveSiteId(id);
  }

  return (
    <CensimentoWorkspace
      sites={censimentoSites}
      activeSite={activeSite}
      onSelectSite={selectSite}
      onClose={() => setActiveSiteId(null)}
      cyborgView={
        <CyborgPanel
          preview={(batch) => mergeCyborgImport(data, batch)}
          onImport={(batch) => {
            const preview = mergeCyborgImport(data, batch);
            // Verifica il salvataggio prima di chiudere l'anteprima (quota browser inclusa).
            privateStorage.setItem(crmStorageKey, JSON.stringify({ ...data, contacts: preview.contacts, properties: preview.properties }));
            onCommit((current) => {
              const merged = mergeCyborgImport(current, batch);
              return { ...current, contacts: merged.contacts, properties: merged.properties };
            }, "Dati CYBORG CENS importati nel Censimento");
          }}
        />
      }
      mapView={
        <Suspense fallback={<p className="property-map-empty">Carico la mappa…</p>}>
          <PropertyMap properties={data.properties} onCoordinatesChange={saveMapPositions} />
        </Suspense>
      }
    >
    <div className="workspace-grid">

      <Panel className="span-12" title="Fasi censimento">
        <div className="census-phase-grid">
          {phaseCards.map((phase, index) => (
            <article className={index === ["censimento-zone", "censimento-vie", "censimento-complessi", "censimento-immobili", "censimento-proprietari"].indexOf(pageKey) ? "active" : ""} key={phase.label}>
              <span>{phase.label}</span>
              <strong>{phase.value}</strong>
              <small>{phase.text}</small>
            </article>
          ))}
        </div>
      </Panel>

      {pageKey === "censimento-proprietari" && filtersOpen ? (
        <Panel
          className="span-12"
          title="Filtro proprietari"
          action={activeFilters(filters).length ? "Azzera filtri" : undefined}
          onPanelAction={() => {
            setFilters({});
            onAction("Filtri censimento azzerati.");
          }}
        >
          <QuickForm
            button="Filtra"
            fields={searchFilterFields}
            required={false}
            onSubmit={(values) => {
              setFilters(values);
              onAction(`Filtro censimento applicato: ${valuesSummary(values)}.`);
            }}
          />
        </Panel>
      ) : null}

      <Panel
        className="span-8"
        title={pageTitle}
        action={pageKey === "censimento-contatti" || pageKey === "censimento-proprietari"
          ? (filtersOpen ? "Chiudi filtri" : "Filtri")
          : "Selezione"}
        onPanelAction={() => {
          if (pageKey === "censimento-contatti" || pageKey === "censimento-proprietari") {
            setFiltersOpen((open) => !open);
            return;
          }
          onAction("Usa la tabella per controllare il livello corrente del censimento.");
        }}
      >
        <DataTable
          columns={tableColumns}
          rows={tableRows}
          actions={[
            {
              label: pageKey === "censimento-proprietari" ? "Agenda" : "Apri",
              onClick: (rowIndex) => {
                if (pageKey === "censimento-proprietari") {
                  const owner = censusOwners[rowIndex];
                  if (!owner) {
                    return;
                  }
                  onCommit(
                    (currentData) => ({
                      ...currentData,
                      activities: [
                        createActivity({
                          title: `Ricontatto proprietario ${owner.name}`,
                          type: "Censimento",
                          contact: owner.name,
                          note: owner.note,
                          day: "Domani",
                        }),
                        ...currentData.activities,
                      ],
                    }),
                    `Ricontatto proprietario fissato per ${owner.name}.`,
                  );
                  return;
                }
                const selected = tableRows[rowIndex]?.slice(0, 3).filter(Boolean).join(" / ");
                onAction(selected ? `Selezionato: ${selected}.` : "Elemento censimento selezionato.");
              },
            },
          ]}
        />
      </Panel>
      {(pageKey !== "censimento-contatti" || filtersOpen) ? (
      <Panel
        className={pageKey === "censimento-nuovo-contatto" || pageKey === "censimento-contatti" ? "span-12 crm-form-panel" : "span-4 crm-form-panel"}
        title={formTitle}
      >
        {pageKey === "censimento-nuovo-contatto" ? (
          <StructuredQuickForm
            requiredDefault={false}
            sections={censusContactFormSections}
            submitLabel="Salva contatto censimento"
            onSubmit={saveCensus}
          />
        ) : (
          <QuickForm
            button={pageKey === "censimento-contatti" ? "Filtra" : "Salva"}
            fields={formFields}
            required={pageKey !== "censimento-contatti"}
            onSubmit={(values) => {
              if (pageKey === "censimento-contatti") {
                setFilters(values);
                onAction(`Filtro contatti censimento applicato: ${valuesSummary(values)}.`);
                return;
              }
              saveCensus(values);
            }}
          />
        )}
      </Panel>
      ) : null}
    </div>
    </CensimentoWorkspace>
  );
}
