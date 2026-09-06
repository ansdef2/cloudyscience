"use client";

import { useEffect, useRef, useState } from "react";

export default function YandexMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null); // храним карту
  const scriptLoaded = useRef(false);

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // уже создали карту — выходим
    if (mapInstance.current) return;

    const initMap = () => {
      // @ts-ignore
      ymaps.ready(() => {
        if (mapInstance.current) return;

        try {
          // @ts-ignore
          mapInstance.current = new ymaps.Map(mapRef.current, {
            center: [55.751244, 37.618423],
            zoom: 10,
            controls: ["zoomControl"],
            theme: 'dark'
          });
  
          // @ts-ignore
          const placemark = new ymaps.Placemark(
            [55.751244, 37.618423],
            {},
            {
              iconLayout: "default#image",
              iconImageHref: "/cluster.png", // ← твоя иконка (public/)
              iconImageSize: [40, 40],
              iconImageOffset: [-20, -40], // центрирование
            }
          );
  
          mapInstance.current.geoObjects.add(placemark);
        } catch {

        }
      });
    };

    // если скрипт уже есть — не грузим второй раз
    if (scriptLoaded.current) {
      initMap();
      return;
    }

    const script = document.createElement("script");
    script.src =
      `https://api-maps.yandex.ru/2.1/?apikey=${process.env.YANDEX_MAP_API_KEY}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      scriptLoaded.current = true;
      setIsLoaded(true);
      initMap();
    };

    document.body.appendChild(script);
  }, []);

  return <div ref={mapRef} className="relative" style={{ width: "100%", height: "400px" }}>
    {isLoaded ?
        <></>
        :
        <div className="absolute left-[50%] top-[50%]" style={{ transform: 'translate(-50%, -50%)' }}>
            <div className="bigLoader" />
        </div>
    }
  </div>;
}
