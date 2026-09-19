import type { Prisma } from '../generated/prisma/client.js'
import { enqueueEmail } from './email.js'

interface BookingMailData {
  referenceCode: string
  title: string
  requesterEmail: string
  requesterName: string
  assignedToName: string
  assignedToEmail: string
  assignedToPhone: string
  resourceName: string
  occurrences: Array<{ sequenceNumber: number; startAt: Date; endAt: Date; status: string }>
}

function dateTime(value: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(value)
}

function htmlText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function bookingDetails(data: BookingMailData): string {
  const dates = data.occurrences.map((occurrence) =>
    `Occurrence ${occurrence.sequenceNumber}: ${dateTime(occurrence.startAt)} – ${dateTime(occurrence.endAt)} (${occurrence.status})`,
  ).join('\n')
  return [
    `Booking ID: ${data.referenceCode}`,
    `Title: ${data.title}`,
    `Resource: ${data.resourceName}`,
    dates,
    `Assigned to: ${data.assignedToName}`,
    `Coordinator email: ${data.assignedToEmail}`,
    `Coordinator phone: ${data.assignedToPhone}`,
  ].join('\n')
}

async function queueBookingMail(
  transaction: Prisma.TransactionClient,
  data: BookingMailData,
  subject: string,
  intro: string,
): Promise<void> {
  const details = bookingDetails(data)
  const text = `${intro}\n\n${details}\n\nCampusReserve`
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.55"><h2>${htmlText(subject)}</h2><p>${htmlText(intro)}</p><pre style="font-family:inherit;white-space:pre-wrap">${htmlText(details)}</pre><p>CampusReserve</p></div>`
  await enqueueEmail(transaction, { to: data.requesterEmail, subject, text, html })
}

export async function queueBookingSubmittedMail(transaction: Prisma.TransactionClient, data: BookingMailData): Promise<void> {
  await queueBookingMail(transaction, data, `Booking request received · ${data.referenceCode}`, 'Your CampusReserve booking request has been submitted successfully. Keep this email as your submission evidence.')
}

export async function queueBookingDecisionMail(
  transaction: Prisma.TransactionClient,
  data: BookingMailData,
  approved: boolean,
  reason: string | null,
): Promise<void> {
  const intro = approved
    ? 'Your CampusReserve booking request has been approved.'
    : `Your CampusReserve booking request was rejected.${reason ? ` Reason: ${reason}` : ''}`
  await queueBookingMail(transaction, data, `${approved ? 'Booking approved' : 'Booking rejected'} · ${data.referenceCode}`, intro)
}

export async function queueOccurrenceDecisionMail(
  transaction: Prisma.TransactionClient,
  data: BookingMailData,
  approved: boolean,
  reason: string | null,
  occurrenceNumber: number,
): Promise<void> {
  const intro = approved
    ? `Occurrence ${occurrenceNumber} of your CampusReserve booking has been approved.`
    : `Occurrence ${occurrenceNumber} of your CampusReserve booking was rejected.${reason ? ` Reason: ${reason}` : ''}`
  await queueBookingMail(transaction, data, `${approved ? 'Booking date approved' : 'Booking date rejected'} · ${data.referenceCode}`, intro)
}

export async function queueBookingChangedMail(
  transaction: Prisma.TransactionClient,
  data: BookingMailData,
  subject: string,
  intro: string,
): Promise<void> {
  await queueBookingMail(transaction, data, subject, intro)
}

export function bookingMailData(
  booking: {
    referenceCode: string
    title: string
    assignedToName: string
    assignedToEmail: string
    assignedToPhone: string
    requester: { name: string; email: string }
    occurrences: Array<{ sequenceNumber: number; startAt: Date; endAt: Date; status: string; resource: { name: string } }>
  },
): BookingMailData {
  const firstResource = booking.occurrences[0]?.resource.name ?? 'Campus resource'
  return {
    referenceCode: booking.referenceCode,
    title: booking.title,
    requesterEmail: booking.requester.email,
    requesterName: booking.requester.name,
    assignedToName: booking.assignedToName,
    assignedToEmail: booking.assignedToEmail,
    assignedToPhone: booking.assignedToPhone,
    resourceName: firstResource,
    occurrences: booking.occurrences.map((occurrence) => ({
      sequenceNumber: occurrence.sequenceNumber,
      startAt: occurrence.startAt,
      endAt: occurrence.endAt,
      status: occurrence.status,
    })),
  }
}
