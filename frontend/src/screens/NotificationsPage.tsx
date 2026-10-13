'use client'

import ProtoTopBar from '@/components/ProtoTopBar'
import BottomNav from '@/components/BottomNav'
import AuthGate from '@/components/AuthGate'
import NotificationList from '@/components/NotificationList'
import { useNotifications } from '@/hooks/useNotifications'
import ui from '@/styles/ui.module.css'

/** Все уведомления — на телефоне сюда ведёт строка в профиле */
export default function NotificationsPage() {
  return (
    <div className={`${ui.page} protoPage`}>
      <ProtoTopBar />
      <div className={ui.content}>
        <AuthGate reason="Войдите, чтобы видеть уведомления">{() => <Notifications />}</AuthGate>
      </div>
      <BottomNav />
    </div>
  )
}

function Notifications() {
  const { items, unread, markRead, markAll } = useNotifications(true)
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1 className={ui.title}>Уведомления</h1>
        {unread > 0 && (
          <button className={`${ui.ghost} ${ui.small}`} onClick={markAll}>
            Прочитать все
          </button>
        )}
      </div>
      <div style={{ maxWidth: 720 }}>
        <NotificationList items={items} onOpen={markRead} />
      </div>
    </>
  )
}
