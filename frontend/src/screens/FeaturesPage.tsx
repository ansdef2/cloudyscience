'use client'

import Header from '@/components/Header'
import FeatureCard from '@/components/FeatureCard'
import styles from './FeaturesPage.module.css'

export default function FeaturesPage() {
  const features = [
    {
      title: 'Удалённое управление машиной',
      description: 'Можно в любой момент что-то поправить. Позволяет работать над проектом из дома. Делает ресурсоёмкие задачи доступнее.',
      icon: '🖥️',
      gradient: 'purple' as const,
    },
    {
      title: 'Файловая система',
      description: 'Позволяет удобно управлять файлами в проекте. Можно легко загружать файлы на машины и экономить время. Удобно обмениваться файлами с командой.',
      icon: '📁',
      gradient: 'blue' as const,
    },
    {
      title: 'Автоматизация процессов',
      description: 'Автоматическая загрузка файлов за час до сессии. Автоматическое удаление файлов после аренды. Все процессы оптимизированы для вашего удобства.',
      icon: '⚙️',
      gradient: 'orange' as const,
    },
  ]

  const remoteControlBenefits = [
    'Можно в любой момент что-то поправить',
    'Позволяет работать над проектом из дома',
    'Делает ресурсоёмкие задачи доступнее',
  ]

  const fileSystemBenefits = [
    'Позволяет удобно управлять файлами в проекте',
    'Можно легко загружать файлы на машины и экономить время',
    'Удобно обмениваться файлами с командой',
    'С программой для компьютера файлы будут всегда актуальными',
  ]

  return (
    <div className={styles.container}>
      <Header showBack />
      
      <div className={styles.content}>
        <h1 className={styles.title}>Возможности платформы</h1>
        <p className={styles.subtitle}>
          Cloud.co - это не просто аренда оборудования, это полноценная экосистема для работы с ресурсоёмкими задачами
        </p>

        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>

        <div className={styles.detailedSection}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Удалённое управление машиной</h2>
            <div className={styles.benefitsList}>
              {remoteControlBenefits.map((benefit, index) => (
                <div key={index} className={styles.benefitItem}>
                  <span className={styles.benefitIcon}>✓</span>
                  <span className={styles.benefitText}>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Файловая система</h2>
            <div className={styles.benefitsList}>
              {fileSystemBenefits.map((benefit, index) => (
                <div key={index} className={styles.benefitItem}>
                  <span className={styles.benefitIcon}>✓</span>
                  <span className={styles.benefitText}>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.processSection}>
          <h2 className={styles.processTitle}>Процесс аренды</h2>
          
          <div className={styles.processSteps}>
            <div className={styles.processStep}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Выбор машины</h3>
                <p className={styles.stepDescription}>Выберите подходящее оборудование из каталога</p>
              </div>
            </div>

            <div className={styles.processArrow}>→</div>

            <div className={styles.processStep}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Выбор файлов</h3>
                <p className={styles.stepDescription}>Загрузите файлы для работы на машине</p>
              </div>
            </div>

            <div className={styles.processArrow}>→</div>

            <div className={styles.processStep}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Выбор времени</h3>
                <p className={styles.stepDescription}>Выберите удобное время для аренды</p>
              </div>
            </div>

            <div className={styles.processArrow}>→</div>

            <div className={styles.processStep}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Автозагрузка</h3>
                <p className={styles.stepDescription}>Файлы автоматически загрузятся за час до сессии</p>
              </div>
            </div>

            <div className={styles.processArrow}>→</div>

            <div className={styles.processStep}>
              <div className={styles.stepNumber}>5</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Начало работы</h3>
                <p className={styles.stepDescription}>Начните работу с оборудованием</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
