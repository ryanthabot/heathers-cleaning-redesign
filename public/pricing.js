// The business's prices, kept in one place.
//
// The page uses this file for the pricing picker and for the estimate shown in
// the quote form. The Worker (src/inquiry.js) imports it to put the same figure
// in the two emails it sends. Change a price here and it changes everywhere.

export const BUSINESS = {
  name: "Heather's Cleaning Services",
  initial: "H", // shown in the round mark at the top of each email
  tagline: "Come home to spotless.",
  firstCleanOffer: "15% off", // must match the offer band on the page
  phone: "(905) 904-1566",
  phoneHref: "tel:+19059041566",
  email: "heatherbond2024@hotmail.com",
  website: "https://heatherscleaning.ca",
  websiteLabel: "heatherscleaning.ca",
};

// `label` is the short form used on the pricing picker, `long` the form used in
// the quote form and in emails, and `phrase` fits "a ... home" in a sentence.
export const HOME_SIZES = [
  { id: "studio", label: "Studio / 1BR", long: "studio or 1 bedroom", phrase: "studio or one-bedroom" },
  { id: "2br", label: "2BR", long: "2 bedrooms", phrase: "two-bedroom" },
  { id: "3br", label: "3BR", long: "3 bedrooms", phrase: "three-bedroom" },
  { id: "4br", label: "4BR+", long: "4 bedrooms or more", phrase: "four-bedroom-or-larger" },
];

// Standard clean by home size: `once` is the one-time price,
// `biweekly` is the price per clean on a bi-weekly schedule.
export const STANDARD_CLEAN = {
  studio: { once: 100, biweekly: 75 },
  "2br": { once: 150, biweekly: 125 },
  "3br": { once: 175, biweekly: 150 },
  "4br": { once: 200, biweekly: 175 },
};

// Move-in / move-out cleans are a flat rate that depends on home size.
// The client gave a range, not a price per size.
export const MOVE_CLEAN = { low: 125, high: 175 };

export const SERVICES = [
  { id: "standard", label: "Standard clean" },
  { id: "deep", label: "Deep clean" },
  { id: "move", label: "Move-in / move-out" },
  { id: "unsure", label: "Not sure yet" },
];

export const FREQUENCIES = [
  { id: "once", label: "One-time" },
  { id: "biweekly", label: "Every two weeks" },
];

export function homeSize(id) {
  return HOME_SIZES.find((s) => s.id === id) || null;
}

export function service(id) {
  return SERVICES.find((s) => s.id === id) || null;
}

export function frequency(id) {
  return FREQUENCIES.find((f) => f.id === id) || null;
}

export function money(n) {
  return "$" + n;
}

// The estimated price for a set of choices, or null when there is nothing to show.
//
// It only ever uses prices the business has published, so a "standard clean"
// estimate is that business's listed flat rate. The final price is always
// confirmed by the business afterwards.
export function estimate(serviceId, homeSizeId, frequencyId) {
  const svc = service(serviceId);
  if (!svc) return null;

  if (svc.id === "standard") {
    const size = homeSize(homeSizeId);
    const rates = size ? STANDARD_CLEAN[size.id] : null;
    const freq = frequency(frequencyId);

    if (rates && freq) {
      const perClean = freq.id === "biweekly";
      const amount = perClean ? rates.biweekly : rates.once;
      return {
        kind: "price",
        highlight: true,
        headline: money(amount),
        description: [svc.label, size.long, perClean ? "every two weeks" : "one-time"].join(" · "),
        sentence: perClean
          ? `${money(amount)} per clean, every two weeks, for a standard clean of a ${size.phrase} home.`
          : `${money(amount)} for a one-time standard clean of a ${size.phrase} home.`,
      };
    }

    if (rates) {
      return {
        kind: "options",
        highlight: true,
        headline: `${money(rates.once)} or ${money(rates.biweekly)}`,
        description: [svc.label, size.long, "one-time, or per clean every two weeks"].join(" · "),
        sentence: `${money(rates.once)} for a one-time standard clean of a ${size.phrase} home, or ${money(rates.biweekly)} per clean on a bi-weekly schedule.`,
      };
    }

    const lowest = Math.min(...Object.values(STANDARD_CLEAN).map((r) => r.biweekly));
    return {
      kind: "from",
      highlight: true,
      headline: `From ${money(lowest)}`,
      description: [svc.label, "choose a home size for your price"].join(" · "),
      sentence: `From ${money(lowest)} per clean on a bi-weekly schedule, for a standard clean.`,
    };
  }

  if (svc.id === "move") {
    return {
      kind: "range",
      highlight: true,
      headline: `${money(MOVE_CLEAN.low)}–${money(MOVE_CLEAN.high)}`,
      description: [svc.label, "flat rate, depending on home size"].join(" · "),
      sentence: `${money(MOVE_CLEAN.low)} to ${money(MOVE_CLEAN.high)} as a flat rate for a move-in / move-out clean, depending on home size.`,
    };
  }

  if (svc.id === "deep") {
    return {
      kind: "quote",
      highlight: false,
      headline: "Free quote",
      description: [svc.label, "priced for your home"].join(" · "),
      sentence: "Free quote. Deep cleans are priced for your home.",
    };
  }

  return null;
}
