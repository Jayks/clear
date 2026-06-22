import { db } from "@/lib/db/client";
import { groups } from "@/lib/db/schema/groups";
import { groupMembers } from "@/lib/db/schema/group-members";
import { expenses } from "@/lib/db/schema/expenses";
import { expenseSplits } from "@/lib/db/schema/expense-splits";

// Real-world coordinates from the Pan-India Explorer itinerary (Chennai →
// Pondicherry → Delhi → Agra → Jaipur) — gives the Map view a genuinely
// cross-country spread instead of one tight cluster on a single beach.
const PLACES = {
  chennaiAirport:       { lat: 12.9941, lng: 80.1709, name: "Chennai International Airport" },
  chennaiTNagar:        { lat: 13.0418, lng: 80.2341, name: "T. Nagar, Chennai" },
  chennaiMarina:        { lat: 13.0500, lng: 80.2824, name: "Marina Beach, Chennai" },
  pondicherryFrench:    { lat: 11.9340, lng: 79.8306, name: "French Quarter, Pondicherry" },
  pondicherryPromenade: { lat: 11.9304, lng: 79.8367, name: "Promenade Beach, Pondicherry" },
  delhiCP:              { lat: 28.6315, lng: 77.2167, name: "Connaught Place, Delhi" },
  delhiRedFort:         { lat: 28.6562, lng: 77.2410, name: "Red Fort, Delhi" },
  delhiChandniChowk:    { lat: 28.6506, lng: 77.2303, name: "Chandni Chowk, Delhi" },
  delhiHumayun:         { lat: 28.5933, lng: 77.2507, name: "Humayun's Tomb, Delhi" },
  delhiDilliHaat:       { lat: 28.5679, lng: 77.2110, name: "Dilli Haat, Delhi" },
  agraExpressway:       { lat: 27.5000, lng: 77.6800, name: "Yamuna Expressway, near Agra" },
  agraTaj:              { lat: 27.1751, lng: 78.0421, name: "Taj Mahal, Agra" },
  jaipurEnRoute:        { lat: 27.0500, lng: 76.6500, name: "Dausa highway dhaba, en route to Jaipur" },
  jaipurHawaMahal:      { lat: 26.9239, lng: 75.8267, name: "Hawa Mahal, Jaipur" },
} as const;

export async function seedDemoGroup(userId: string, displayName: string | null) {
  // 1. Group
  const [group] = await db
    .insert(groups)
    .values({
      name: "Pan-India Explorer · Sample",
      description: "A pre-loaded sample trip — explore all features freely!",
      groupType: "trip",
      defaultCurrency: "INR",
      startDate: "2026-02-01",
      endDate: "2026-02-07",
      budget: "65000",
      createdBy: userId,
      isDemo: true,
      // No coverPhotoUrl — the no-photo card already renders a vivid
      // cyan trip gradient + tree pattern, so there's no need to guess at
      // an external image URL that might not resolve.
    })
    .returning();

  // 2. Members
  const [userM, arjun, meera, rohan, divya] = await db
    .insert(groupMembers)
    .values([
      { groupId: group.id, userId, displayName, role: "admin" },
      { groupId: group.id, guestName: "Arjun" },
      { groupId: group.id, guestName: "Meera" },
      { groupId: group.id, guestName: "Rohan" },
      { groupId: group.id, guestName: "Divya" },
    ])
    .returning();

  const all5 = [userM.id, arjun.id, meera.id, rohan.id, divya.id];

  // Helper for the plain equal-split expenses (every amount below divides
  // cleanly by 5 — no remainder handling needed, unlike the nest seeder).
  async function addEqual(
    paidByMemberId: string,
    description: string,
    category: string,
    amount: number,
    expenseDate: string,
    location: { lat: number; lng: number; name: string },
  ) {
    const [e] = await db.insert(expenses).values({
      groupId: group.id, paidByMemberId,
      description, category,
      amount: String(amount), currency: "INR", expenseDate, createdByUserId: userId,
      location,
    }).returning();
    await db.insert(expenseSplits).values(all5.map((memberId) => ({
      expenseId: e.id, memberId, shareAmount: String(amount / 5), splitType: "equal" as const, splitValue: null,
    })));
    return e;
  }

  // ── Day 1 · Chennai arrival (2 close-together pins) ───────────────────────
  await addEqual(arjun.id, "Airport taxi to hotel", "transport", 1800, "2026-02-01", PLACES.chennaiAirport);
  await addEqual(userM.id, "Welcome dinner at Murugan Idli Shop, T. Nagar", "food", 4200, "2026-02-01", PLACES.chennaiTNagar);

  // ── Day 2 · Chennai → Pondicherry day trip (spread-out same day) ──────────
  await addEqual(meera.id, "Breakfast at Marina Beach café", "food", 2200, "2026-02-02", PLACES.chennaiMarina);
  await addEqual(rohan.id, "French Quarter walking tour tickets", "sightseeing", 3000, "2026-02-02", PLACES.pondicherryFrench);
  await addEqual(divya.id, "Seafood lunch on the Promenade", "food", 6500, "2026-02-02", PLACES.pondicherryPromenade);

  // ── Day 3 · Fly Chennai → Delhi (cross-country same-day spread) ───────────
  await addEqual(arjun.id, "Airport lounge snacks before departure", "food", 1500, "2026-02-03", PLACES.chennaiAirport);
  await addEqual(userM.id, "Late dinner near hotel, Connaught Place", "food", 3800, "2026-02-03", PLACES.delhiCP);

  // ── Day 4 · Delhi sightseeing (6 close-together pins) ─────────────────────
  await addEqual(meera.id, "Red Fort entry tickets (5 pax)", "sightseeing", 2000, "2026-02-04", PLACES.delhiRedFort);
  await addEqual(rohan.id, "Street food crawl at Chandni Chowk", "food", 3200, "2026-02-04", PLACES.delhiChandniChowk);

  // Exact split — Meera sat this one out (stayed back at the hotel).
  const [eRickshaw] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: divya.id,
    description: "Auto-rickshaw rides across Old Delhi", category: "transport",
    amount: "1200", currency: "INR", expenseDate: "2026-02-04", createdByUserId: userId,
    location: PLACES.delhiChandniChowk,
  }).returning();
  await db.insert(expenseSplits).values(
    [userM.id, arjun.id, rohan.id, divya.id].map((memberId) => ({
      expenseId: eRickshaw.id, memberId, shareAmount: "300", splitType: "exact" as const, splitValue: "300",
    }))
  );

  await addEqual(userM.id, "Humayun's Tomb entry tickets (5 pax)", "sightseeing", 1500, "2026-02-04", PLACES.delhiHumayun);

  // Shares split — Arjun and Rohan bought less than the others.
  const [eSouvenir] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: arjun.id,
    description: "Souvenir shopping at Dilli Haat", category: "shopping",
    amount: "5400", currency: "INR", expenseDate: "2026-02-04", createdByUserId: userId,
    location: PLACES.delhiDilliHaat,
  }).returning();
  await db.insert(expenseSplits).values([
    { expenseId: eSouvenir.id, memberId: userM.id, shareAmount: "1350", splitType: "shares" as const, splitValue: "2" },
    { expenseId: eSouvenir.id, memberId: arjun.id, shareAmount: "675",  splitType: "shares" as const, splitValue: "1" },
    { expenseId: eSouvenir.id, memberId: meera.id, shareAmount: "1350", splitType: "shares" as const, splitValue: "2" },
    { expenseId: eSouvenir.id, memberId: rohan.id, shareAmount: "675",  splitType: "shares" as const, splitValue: "1" },
    { expenseId: eSouvenir.id, memberId: divya.id, shareAmount: "1350", splitType: "shares" as const, splitValue: "2" },
  ]);

  await addEqual(meera.id, "Dinner at Connaught Place", "food", 4600, "2026-02-04", PLACES.delhiCP);

  // ── Day 5 · Delhi → Agra (spread-out same day) ─────────────────────────────
  await addEqual(rohan.id, "Hotel checkout breakfast, Connaught Place", "food", 2100, "2026-02-05", PLACES.delhiCP);

  // Percentage split — same 30/20/20/15/15 weighting as the old sample's fuel expense.
  const [eFuel] = await db.insert(expenses).values({
    groupId: group.id, paidByMemberId: divya.id,
    description: "Expressway tolls and fuel to Agra", category: "transport",
    amount: "2800", currency: "INR", expenseDate: "2026-02-05", createdByUserId: userId,
    location: PLACES.agraExpressway,
  }).returning();
  await db.insert(expenseSplits).values([
    { expenseId: eFuel.id, memberId: userM.id, shareAmount: "840", splitType: "percentage" as const, splitValue: "30" },
    { expenseId: eFuel.id, memberId: arjun.id, shareAmount: "560", splitType: "percentage" as const, splitValue: "20" },
    { expenseId: eFuel.id, memberId: meera.id, shareAmount: "560", splitType: "percentage" as const, splitValue: "20" },
    { expenseId: eFuel.id, memberId: rohan.id, shareAmount: "420", splitType: "percentage" as const, splitValue: "15" },
    { expenseId: eFuel.id, memberId: divya.id, shareAmount: "420", splitType: "percentage" as const, splitValue: "15" },
  ]);

  // ── Day 6 · Agra (1 isolated pin) ──────────────────────────────────────────
  await addEqual(userM.id, "Taj Mahal entry tickets and guide (5 pax)", "sightseeing", 4000, "2026-02-06", PLACES.agraTaj);

  // ── Day 7 · Agra → Jaipur (spread-out same day) ────────────────────────────
  await addEqual(arjun.id, "Lunch at highway dhaba near Dausa", "food", 2600, "2026-02-07", PLACES.jaipurEnRoute);
  await addEqual(meera.id, "Hawa Mahal & City Palace entry tickets (5 pax)", "sightseeing", 3500, "2026-02-07", PLACES.jaipurHawaMahal);

  return group;
}
