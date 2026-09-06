'use client'

import Link from 'next/link'
import styles from './Header.module.css'
import { useAuth } from '@/hooks/useAuth'
import dynamic from "next/dynamic";
import { useEffect, useState } from 'react';

const YandexMap = dynamic(() => import("@/components/YandexMap"), {
  ssr: false,
});

interface HeaderProps {
  showBack?: boolean
  showMobileMap?: boolean
  title?: string
}

export default function Header({ showBack = false, showMobileMap = false, title }: HeaderProps) {
  const { isAuthenticated } = useAuth();
  const [isMapShown, setIsMapShown] = useState(false);
  const [isMapFixed, setIsMapFixed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 650);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div>

      <header className={styles.header}>
        <div className={styles.statusBar}>
          <span className={styles.time}>{time}</span>
        </div>
        <div className={styles.navBar}>
          {showBack && (
            <Link href="/" className={styles.backButton}>
              ←
            </Link>
          )}
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}>
              <div className={styles.square1}></div>
              <div className={styles.square2}></div>
            </div>
            <span className={styles.logoText}>Cloud.co-</span>
          </Link>
          {!isMobile && (
            <button className={styles.filesButton} onClick={() => setIsMapShown(prev => !prev)}>
              🗺️ Карты
            </button>
          )}
          {!showBack && (
            <Link href="/filesystem" className={styles.filesButton}>
              📁 Файлы
            </Link>
          )}
          <div className={styles.rightActions}>
            <button className={styles.notificationButton}>🔔</button>

            <Link href={isAuthenticated ? '/filesystem' : '/login'} className={styles.profilePicture}>
              <div className={styles.profilePlaceholder}>
                <span>👤</span>
              </div>
            </Link>
          </div>
        </div>
        {title && <h1 className={styles.pageTitle}>{title}</h1>}
      </header>

      <div
        className="overflow-hidden transition-[height]"
        style={{ height: (isMapShown || (isMobile && showMobileMap) ? '400px' : '0px'), transitionDuration: '1.5s' }}
      >
        <YandexMap />
      </div>
    </div>
  )
}
