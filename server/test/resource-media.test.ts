import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { inspectJpeg, isPublicHttpsUrl, MAX_PHOTO_BYTES, photoFilenamePattern } from '../src/utils/resource-media.ts'
import { canManageResources, canViewResource } from '../src/utils/resource-access.ts'

// A generated 2x3 solid-colour JPEG, not a college photograph.
const jpeg = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAADAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDqKKKK5jjP/9k=', 'base64')

test('reads dimensions from a JPEG', () => assert.deepEqual(inspectJpeg(jpeg), { width: 2, height: 3 }))
test('rejects SVG, HTML and empty input', () => {
  for (const value of ['', '<svg onload="alert(1)"></svg>', '<html>test</html>']) assert.equal(inspectJpeg(Buffer.from(value)), null)
})
test('rejects oversized bytes', () => assert.equal(inspectJpeg(Buffer.alloc(MAX_PHOTO_BYTES + 1)), null))
test('rejects a truncated JPEG', () => assert.equal(inspectJpeg(jpeg.subarray(0, -2)), null))
test('rejects invalid segment lengths', () => { const bytes = Buffer.from(jpeg); bytes.writeUInt16BE(0, 4); assert.equal(inspectJpeg(bytes), null) })
test('rejects zero or excessive dimensions', () => {
  const marker = jpeg.indexOf(Buffer.from([0xff, 0xc0]))
  for (const width of [0, 4097]) { const bytes = Buffer.from(jpeg); bytes.writeUInt16BE(width, marker + 7); assert.equal(inspectJpeg(bytes), null) }
})
test('rejects too many decoded pixels', () => {
  const marker = jpeg.indexOf(Buffer.from([0xff, 0xc0]))
  const bytes = Buffer.from(jpeg); bytes.writeUInt16BE(4096, marker + 5); bytes.writeUInt16BE(4096, marker + 7)
  assert.equal(inspectJpeg(bytes), null)
})
test('rejects headers without an image scan', () => {
  const marker = jpeg.indexOf(Buffer.from([0xff, 0xda]))
  assert.equal(inspectJpeg(Buffer.concat([jpeg.subarray(0, marker), Buffer.from([0xff, 0xd9])])), null)
})
test('accepts generated UUID photo names', () => assert.equal(photoFilenamePattern.test(`${randomUUID()}.jpg`), true))
for (const filename of ['../photo.jpg', 'photo.svg', '..%2fsecret', '/etc/passwd', 'abc.jpg', `${randomUUID()}.jpg.html`]) {
  test(`rejects unsafe photo name ${filename}`, () => assert.equal(photoFilenamePattern.test(filename), false))
}
for (const value of ['https://example.com/tour', 'https://tour.example.edu/view?id=42', 'https://example.com:443/tour']) {
  test(`allows public HTTPS link ${value}`, () => assert.equal(isPublicHttpsUrl(value), true))
}
for (const value of ['javascript:alert(1)', 'data:text/html,test', 'http://example.com', '//example.com', 'https://localhost', 'https://127.0.0.1', 'https://127.1', 'https://2130706433', 'https://[::1]', 'https://x.local', 'https://x.internal', 'https://x.localhost', 'https://example.com.', 'https://user:secret@example.com', 'https://example.com:8443']) {
  test(`rejects unsafe tour link ${value.replace('user:secret', '[credentials]')}`, () => assert.equal(isPublicHttpsUrl(value), false))
}
for (const role of ['ADMIN', 'SUPER_ADMIN', 'FACULTY', 'STAFF', undefined]) {
  test(`visibility boundaries for ${role ?? 'anonymous'}`, () => {
    const admin = role === 'ADMIN' || role === 'SUPER_ADMIN'
    assert.equal(canManageResources(role), admin)
    for (const status of ['ACTIVE', 'INACTIVE', 'ARCHIVED']) {
      assert.equal(canViewResource(role, { status, isDemo: true }), admin)
      assert.equal(canViewResource(role, { status, isDemo: false }), admin || (role !== undefined && status === 'ACTIVE'))
    }
  })
}
