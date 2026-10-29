import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { collegePhotoCollections, isCollegePhotoUrl, resourcePhotos } from '../src/resources/college-photos.ts'

test('all 17 identified photos exist and the unidentified lab is excluded', () => {
  const photos = collegePhotoCollections.flatMap((item) => item.photos)
  assert.equal(collegePhotoCollections.length, 6)
  assert.equal(photos.length, 17)
  for (const photo of photos) {
    assert.ok(existsSync(new URL(`../public${photo.url}`, import.meta.url)))
    assert.ok(isCollegePhotoUrl(photo.url))
    assert.ok(!photo.url.includes('IFS02622'))
  }
  assert.equal(isCollegePhotoUrl('/campus/../private.jpg'), false)
})

test('college photos match normalized names but never unrelated or demo resources', () => {
  assert.equal(resourcePhotos({ name: ' Kavukattu-Hall ', images: [], isDemo: false }).length, 4)
  assert.equal(resourcePhotos({ name: 'Lab 1', images: [], isDemo: false }).length, 0)
  assert.equal(resourcePhotos({ name: 'Kavukattu Hall', images: [], isDemo: true }).length, 0)
})

test('uploaded resource photos take priority over the bundled gallery', () => {
  const images = [{ id: 'existing', url: '/api/resource-images/existing.jpg', altText: 'Saved photo', sortOrder: 0 }]
  assert.equal(resourcePhotos({ name: 'Chapel', images, isDemo: false }), images)
})
