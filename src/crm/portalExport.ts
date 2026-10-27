type Listing = { code: string; title: string; zone: string; price: string; kind: string; portals: string };

export function portalExport(properties: Listing[]) {
  return {
    properties: properties
      .filter(item => item.portals === "Da sincronizzare" || /^\d+\/\d+$/.test(item.portals))
      .map(({ code, title, zone, price, kind }) => ({ code, title, zone, price, kind })),
  };
}
