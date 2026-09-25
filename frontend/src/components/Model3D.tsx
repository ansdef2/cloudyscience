'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './Model3D.module.css'

interface Model3DProps {
  /** Путь к модели: /models/<папка>/<файл>.obj или .glb */
  src: string
  fallbackImage?: string
  alt?: string
}

type State = 'loading' | 'ready' | 'error'

/**
 * Просмотрщик 3D-моделей на three.js. Понимает GLB/GLTF и OBJ.
 * Для OBJ рядом ищется одноимённый .mtl с материалами и текстурами;
 * если его нет, модель показывается с нейтральным материалом.
 *
 * three.js подгружается только при открытии вкладки «3D», чтобы не
 * утяжелять остальные страницы.
 */
export default function Model3D({ src, fallbackImage, alt = '3D-модель' }: Model3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<State>('loading')
  const [hintVisible, setHintVisible] = useState(true)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let disposed = false
    let cleanup: (() => void) | undefined
    let hintCleanup: (() => void) | undefined

    const init = async () => {
      const THREE = await import('three')
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

      if (disposed) return

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      mount.appendChild(renderer.domElement)

      scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a3a, 2.2))
      const keyLight = new THREE.DirectionalLight(0xffffff, 2)
      keyLight.position.set(3, 5, 4)
      scene.add(keyLight)
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.8)
      fillLight.position.set(-4, 2, -3)
      scene.add(fillLight)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.enablePan = false

      const resize = () => {
        const { clientWidth: width, clientHeight: height } = mount
        if (!width || !height) return
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }

      const observer = new ResizeObserver(resize)
      observer.observe(mount)
      resize()

      let frame = 0
      const animate = () => {
        frame = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }

      /**
       * Ставит модель в центр сцены и подбирает расстояние камеры.
       * Считаем по описанной сфере, а не по сторонам габаритного
       * параллелепипеда: иначе угловатые модели вылезают за кадр.
       */
      const frameObject = (object: any) => {
        const box = new THREE.Box3().setFromObject(object)
        const center = box.getCenter(new THREE.Vector3())

        object.position.sub(center)
        scene.add(object)

        const radius = box.getBoundingSphere(new THREE.Sphere()).radius || 1
        // Запас 1.25, чтобы модель не упиралась в края
        const distance = (radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.25

        // Смотрим на угол, а не в грань: иначе объём не читается
        camera.position.set(distance * 0.55, distance * 0.42, distance * 0.72)
        camera.near = distance / 100
        camera.far = distance * 100
        camera.updateProjectionMatrix()

        controls.minDistance = radius * 1.2
        controls.maxDistance = distance * 4
        controls.target.set(0, 0, 0)
        controls.update()
      }

      const lower = src.toLowerCase()
      const directory = src.slice(0, src.lastIndexOf('/') + 1)

      try {
        if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
          const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
          const gltf = await new GLTFLoader().loadAsync(src)
          if (disposed) return
          frameObject(gltf.scene)
        } else {
          const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js')
          const { MTLLoader } = await import('three/examples/jsm/loaders/MTLLoader.js')

          const objLoader = new OBJLoader()

          // Материалы лежат в отдельном файле; без него модель будет серой,
          // но геометрия всё равно покажется
          const mtlPath = src.replace(/\.obj$/i, '.mtl')
          let hasMaterials = false
          try {
            const materials = await new MTLLoader().setResourcePath(directory).loadAsync(mtlPath)
            materials.preload()
            objLoader.setMaterials(materials)
            hasMaterials = true
          } catch {
            // .mtl рядом нет — обойдёмся нейтральным материалом
          }

          const object = await objLoader.loadAsync(src)
          if (disposed) return

          if (!hasMaterials) {
            const neutral = new THREE.MeshStandardMaterial({
              color: 0xb9bdc8,
              roughness: 0.55,
              metalness: 0.1,
            })
            object.traverse((node: any) => {
              if (node.isMesh) node.material = neutral
            })
          }

          frameObject(object)
        }

        setState('ready')
        animate()

        // Подсказка нужна только первые секунды, дальше она мешает смотреть
        const hintTimer = setTimeout(() => setHintVisible(false), 3500)
        const hideOnDrag = () => setHintVisible(false)
        controls.addEventListener('start', hideOnDrag)
        hintCleanup = () => {
          clearTimeout(hintTimer)
          controls.removeEventListener('start', hideOnDrag)
        }
      } catch {
        if (!disposed) setState('error')
      }

      cleanup = () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        controls.dispose()
        renderer.dispose()
        renderer.domElement.remove()
        scene.traverse((node: any) => {
          node.geometry?.dispose?.()
          const material = node.material
          if (Array.isArray(material)) material.forEach((item) => item.dispose?.())
          else material?.dispose?.()
        })
      }
    }

    init()

    return () => {
      disposed = true
      hintCleanup?.()
      cleanup?.()
    }
  }, [src])

  if (state === 'error') {
    return (
      <div className={styles.container}>
        {fallbackImage ? (
          <img src={fallbackImage} alt={alt} className={styles.fallbackImage} />
        ) : (
          <p className={styles.note}>Не удалось загрузить 3D-модель</p>
        )}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div ref={mountRef} className={styles.canvas} aria-label={alt} />
      {state === 'loading' && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Загрузка 3D-модели...</p>
        </div>
      )}
      {state === 'ready' && hintVisible && (
        <p className={styles.hint}>Потяните, чтобы повернуть</p>
      )}
    </div>
  )
}
