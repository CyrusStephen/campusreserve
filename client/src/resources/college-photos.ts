import type { Resource, ResourceImage } from './types'

export interface CollegePhotoCollection {
  name: string
  key: string
  photos: ResourceImage[]
}

function collection(key: string, name: string, files: [string, string][]): CollegePhotoCollection {
  return { key, name, photos: files.map(([file, caption], sortOrder) => ({
    id: `college-${key}-${sortOrder}`, url: `/campus/${file}`, altText: `${name} — ${caption}`, sortOrder,
  })) }
}

export const collegePhotoCollections = [
  collection('kavukattu-hall', 'Kavukattu Hall', [
    ['kavukattu_hall.jpg', 'panoramic view of the seating and stage'],
    ['kavukattu_hall_2.jpg', 'entrance corridor'],
    ['kavukattu_hall_3.jpg', 'stage and upper seating'],
    ['kavukattu_hall_4.jpg', 'central aisle facing the stage'],
  ]),
  collection('padiyara-hall', 'Padiyara Hall', [['padiyara_hall.jpg', 'seating and stage']]),
  collection('chapel', 'Chapel', [
    ['chapel_1.jpg', 'interior and pews'], ['chapel_2.jpg', 'covered corridor'], ['chapel_3.jpg', 'exterior and courtyard'],
  ]),
  collection('basketball-court', 'Basketball Court', [
    ['basketball_court.jpg', 'indoor court and spectator seating'],
    ['basketball_court_2.jpg', 'court facing the basketball hoop'],
    ['basketball_court_3.jpg', 'sports building exterior'],
    ['basketball_court_4.jpg', 'court and stands from the side'],
  ]),
  collection('hockey-ground', 'Hockey Ground', [
    ['hockey_ground.jpg', 'ground facing the pavilion'], ['hockey_ground_1.jpg', 'wide view of the ground'],
  ]),
  collection('sports-open-ground', 'Sports Open Ground', [
    ['sports_open_ground_1.jpg', 'playing field and track'],
    ['sport_open_ground_2.jpg', 'field facing the sports building'],
    ['sports_open_ground_3.jpg', 'wide view of the field and sports building'],
  ]),
]

const bundledUrls = new Set(collegePhotoCollections.flatMap((item) => item.photos.map((photo) => photo.url)))
export function isCollegePhotoUrl(url: string): boolean { return bundledUrls.has(url) }

function normalizedName(name: string): string { return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() }

export function resourcePhotos(resource: Pick<Resource, 'name' | 'images' | 'isDemo'>): ResourceImage[] {
  if (resource.images.length || resource.isDemo) return resource.images
  const name = normalizedName(resource.name)
  return collegePhotoCollections.find((item) => normalizedName(item.name) === name)?.photos ?? []
}
