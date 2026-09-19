import { ArrowLeft, LockKeyhole, ShieldAlert, UtensilsCrossed } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'
import ThemeToggle from '../components/ThemeToggle'

export default function AccessDeniedPage() {
  const auth = useAuth()
  const service = new URLSearchParams(useLocation().search).get('service')
  const canteenStaff = auth.user?.role === 'CANTEEN_STAFF'
  const serviceName = service === 'events' ? 'Event Access' : service === 'canteen' ? 'Canteen Orders' : service === 'admin' ? 'administrator tools' : 'Space Bookings'

  return <main className="grid min-h-screen place-items-center bg-[#f7f6f3] px-5 py-12 text-[#191919] dark:bg-[#191919] dark:text-[#f7f6f3]">
    <section className="w-full max-w-xl">
      <div className="mb-7 flex items-center justify-between"><Link className="inline-flex items-center gap-2 font-semibold" to="/"><ArrowLeft size={18} />All products</Link><ThemeToggle /></div>
      <div className="rounded-3xl border-2 border-black bg-white p-8 shadow-[8px_8px_0_#191919] dark:border-white dark:bg-neutral-900 dark:shadow-[8px_8px_0_#f7f6f3]">
        <span className="grid size-14 place-items-center rounded-2xl border-2 border-red-800 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-100"><ShieldAlert size={28} /></span>
        <p className="mt-7 text-sm font-bold uppercase tracking-[.12em] text-red-700 dark:text-red-300">Access denied</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">You can’t open {serviceName}.</h1>
        <p className="mt-4 text-lg leading-8 text-neutral-600 dark:text-neutral-300">{canteenStaff ? <>Your <strong>CANTEEN STAFF</strong> account is restricted to canteen operations.</> : <>Your <strong>{auth.user?.role.replaceAll('_', ' ')}</strong> account does not have administrator permission.</>} This protects booking, event and institutional data from unauthorized access.</p>
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-950"><LockKeyhole className="mt-1 shrink-0" size={20} /><p className="m-0 text-sm leading-6">Contact a CampusReserve administrator if your responsibilities require access to this workspace.</p></div>
        <div className="mt-7 flex flex-wrap gap-3"><Link className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700" to={canteenStaff ? '/app/canteen/manage' : '/app'}>{canteenStaff ? <UtensilsCrossed size={18} /> : <ArrowLeft size={18} />}{canteenStaff ? 'Return to Canteen Console' : 'Return to Space Bookings'}</Link><Link className="rounded-xl border-2 border-black px-5 py-3 font-semibold dark:border-white" to="/">View all products</Link></div>
      </div>
    </section>
  </main>
}
