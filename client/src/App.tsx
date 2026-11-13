import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from './auth/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import ResourcesPage from './pages/ResourcesPage'
import ResourceDetailPage from './pages/ResourceDetailPage'
import ResourceEditorPage from './pages/ResourceEditorPage'
import MyBookingsPage from './pages/MyBookingsPage'
import BookingQueuePage from './pages/BookingQueuePage'
import ApprovalHistoryPage from './pages/ApprovalHistoryPage'
import AdminCalendarPage from './pages/AdminCalendarPage'
import NotificationsPage from './pages/NotificationsPage'
import WaitlistPage from './pages/WaitlistPage'
import ReportsPage from './pages/ReportsPage'
import CanteenPage from './pages/CanteenPage'
import CanteenManagementPage from './pages/CanteenManagementPage'
import EventAccessPage from './pages/EventAccessPage'
import AccessDeniedPage from './pages/AccessDeniedPage'
import SecurityVerificationPage from './pages/SecurityVerificationPage'
import ProfilePage from './pages/ProfilePage'
import BookingConfirmationPage from './pages/BookingConfirmationPage'
import { lastWorkspace } from './auth/landing'

function HomeEntry() {
  const auth = useAuth()
  if (auth.status === 'authenticated' && auth.user) return <Navigate to={lastWorkspace(auth.user)} replace />
  return <>
    {auth.status === 'unavailable' && <div className="cr-home-connection-note" role="alert"><span>CampusReserve cannot reach the booking server right now. You can browse the website, then retry your session when the connection is restored.</span><button type="button" onClick={() => void auth.retrySession()}>Try again</button></div>}
    <HomePage />
  </>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeEntry />} />
      <Route path="/products" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/access-denied" element={<ProtectedRoute><AccessDeniedPage /></ProtectedRoute>} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="resources/:id" element={<ResourceDetailPage />} />
        <Route path="bookings" element={<MyBookingsPage />} />
        <Route path="bookings/:id/confirmation" element={<BookingConfirmationPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="canteen/notifications" element={<NotificationsPage />} />
        <Route path="events/notifications" element={<NotificationsPage />} />
        <Route path="waitlist" element={<WaitlistPage />} />
        <Route path="canteen" element={<CanteenPage />} />
        <Route path="canteen/manage" element={<CanteenManagementPage />} />
        <Route path="events" element={<EventAccessPage />} />
        <Route path="security" element={<SecurityVerificationPage />} />
        <Route path="manage/reports" element={<ReportsPage />} />
        <Route path="manage/bookings" element={<BookingQueuePage />} />
        <Route path="manage/bookings/history" element={<ApprovalHistoryPage />} />
        <Route path="manage/calendar" element={<AdminCalendarPage />} />
        <Route path="manage/resources" element={<ResourcesPage manage />} />
        <Route path="manage/resources/new" element={<ResourceEditorPage />} />
        <Route path="manage/resources/:id/edit" element={<ResourceEditorPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
