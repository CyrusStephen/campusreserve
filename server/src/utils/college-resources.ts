import { resourceCreateSchema } from './resource-input.js'

export const collegeBetaPolicy = {
  advanceBookingDays: 60,
  minimumNoticeHours: 24,
  maximumDurationMinutes: 8 * 60,
  bufferBeforeMinutes: 30,
  bufferAfterMinutes: 30,
  cancellationDeadlineHours: 24,
} as const

export function normalizeCollegeResourceName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const venues = [
  { name: 'Kavukattu Hall', slug: 'sbc-kavukattu-hall', type: 'HALL', description: 'College hall for approved programmes, meetings and gatherings.' },
  { name: 'Padiyara Hall', slug: 'sbc-padiyara-hall', type: 'HALL', description: 'College hall for approved meetings and programmes.' },
  { name: 'Basketball Court', slug: 'sbc-basketball-court', type: 'SPORTS_FACILITY', description: 'College basketball court for approved sports activities.' },
  { name: 'Hockey Ground', slug: 'sbc-hockey-ground', type: 'SPORTS_FACILITY', description: 'College hockey ground for approved sports activities.' },
  { name: 'Sports Open Ground', slug: 'sbc-sports-open-ground', type: 'SPORTS_FACILITY', description: 'College open sports ground for approved activities.' },
] as const

export const collegeBetaResources = venues.map((venue) => ({
  slug: venue.slug,
  input: resourceCreateSchema.parse({
    name: venue.name, type: venue.type, status: 'ACTIVE',
    description: `${venue.description} Beta setup: the 100-person capacity is a temporary testing limit, not a verified venue capacity.`,
    building: 'St Berchmans College', location: venue.name,
    capacity: 100, totalQuantity: 1, isExclusive: true, features: [], tourUrl: null,
    instructions: 'Beta testing: confirm the actual capacity and venue-specific permissions with the college before operational use. Every booking requires approval. Leave the space clean, return equipment and report damage to the administrator.',
    ...collegeBetaPolicy,
  }),
}))
