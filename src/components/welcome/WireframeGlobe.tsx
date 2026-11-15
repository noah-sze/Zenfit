import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface WireframeGlobeProps {
  className?: string;
  /** 球體中心水平偏移比例 (0 ~ 1)，預設 0.60 */
  centerXRatio?: number;
  /** 球體中心垂直偏移比例 (0 ~ 1)，預設 0.40 */
  centerYRatio?: number;
  /** 半徑相對於視窗短邊之比例，預設 0.42 */
  radiusRatio?: number;
  /** 桌面端 (>= 1024px) 半徑相對於視窗短邊之比例，未指定時使用 radiusRatio */
  desktopRadiusRatio?: number;
  /** 桌面端 (>= 1024px) 球體中心水平偏移比例 */
  desktopCenterXRatio?: number;
  /** 桌面端 (>= 1024px) 球體中心垂直偏移比例 */
  desktopCenterYRatio?: number;
  /** 滑鼠移動對旋轉速度之影響係數，預設 0.015 (極微沉著視差) */
  mouseInfluence?: number;
}

/**
 * 3D 幾何線框球體晶格視覺組件 (Wireframe Geodesic Globe)
 * 純 Canvas 數學投影矩陣運算，60fps 緩慢深邃自轉，具備滑鼠微幅視差與深淺主題適配。
 */
export function WireframeGlobe({
  className,
  centerXRatio = 0.60,
  centerYRatio = 0.40,
  radiusRatio = 0.42,
  desktopRadiusRatio,
  desktopCenterXRatio,
  desktopCenterYRatio,
  mouseInfluence = 0.015,
}: WireframeGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // 產生 3D 球體頂點與經緯線索引
    const points: Point3D[] = [];
    const lines: [number, number][] = [];
    const numLat = 12;
    const numLon = 24;

    let currentRadius = 0;

    const buildGeometry = (radius: number) => {
      currentRadius = radius;
      points.length = 0;
      lines.length = 0;

      for (let i = 0; i <= numLat; i++) {
        const theta = (i * Math.PI) / numLat;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        for (let j = 0; j < numLon; j++) {
          const phi = (j * 2 * Math.PI) / numLon;
          points.push({
            x: radius * sinTheta * Math.cos(phi),
            y: radius * cosTheta,
            z: radius * sinTheta * Math.sin(phi),
          });
        }
      }

      for (let i = 0; i <= numLat; i++) {
        for (let j = 0; j < numLon; j++) {
          const current = i * numLon + j;
          const nextLon = i * numLon + ((j + 1) % numLon);
          lines.push([current, nextLon]);
          if (i < numLat) {
            const nextLat = (i + 1) * numLon + j;
            lines.push([current, nextLat]);
          }
        }
      }
    };

    const handleResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const parent = canvas.parentElement;
      width = rect.width || parent?.clientWidth || window.innerWidth;
      height = rect.height || parent?.clientHeight || window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const isDesktop = window.innerWidth >= 1024;
      const effectiveRadiusRatio = isDesktop && desktopRadiusRatio !== undefined ? desktopRadiusRatio : radiusRatio;
      const radius = Math.min(width, height) * effectiveRadiusRatio;
      buildGeometry(radius);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    let angleX = 0.2;
    let angleY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const isDesktop = window.innerWidth >= 1024;
      const effectiveCenterXRatio = isDesktop && desktopCenterXRatio !== undefined ? desktopCenterXRatio : centerXRatio;
      const effectiveCenterYRatio = isDesktop && desktopCenterYRatio !== undefined ? desktopCenterYRatio : centerYRatio;
      const cx = width * effectiveCenterXRatio;
      const cy = height * effectiveCenterYRatio;
      targetMouseX = (e.clientX - cx) * 0.00003;
      targetMouseY = (e.clientY - cy) * 0.00003;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(dpr, dpr);

      // 滑鼠視差平滑緩動
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      // 極致緩慢寧靜自轉 (大幅降低滑鼠速度影響，維持深邃沉著)
      angleY += 0.00045 + currentMouseX * mouseInfluence;
      angleX += 0.0002 + currentMouseY * mouseInfluence;

      const isDark = document.documentElement.classList.contains('dark');
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.085)' : 'rgba(0, 0, 0, 0.075)';
      ctx.lineWidth = 1;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      const isDesktop = window.innerWidth >= 1024;
      const effectiveCenterXRatio = isDesktop && desktopCenterXRatio !== undefined ? desktopCenterXRatio : centerXRatio;
      const effectiveCenterYRatio = isDesktop && desktopCenterYRatio !== undefined ? desktopCenterYRatio : centerYRatio;

      const centerX = width * effectiveCenterXRatio;
      const centerY = height * effectiveCenterYRatio;

      const projected = points.map((p) => {
        // 旋轉 Y 軸
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.z * cosY + p.x * sinY;
        // 旋轉 X 軸
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + p.y * sinX;

        // 透視投影 (自適應球體半徑之自然焦距)
        const fov = Math.max(800, currentRadius * 1.6);
        const cameraDist = Math.max(400, currentRadius * 0.9);
        const scale = fov / (fov + z2 + cameraDist);
        return {
          x: centerX + x1 * scale,
          y: centerY + y2 * scale,
        };
      });

      // 繪製線條
      ctx.beginPath();
      for (let i = 0; i < lines.length; i++) {
        const p1 = projected[lines[i][0]];
        const p2 = projected[lines[i][1]];
        if (p1 && p2) {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
      }
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [
    centerXRatio,
    centerYRatio,
    radiusRatio,
    desktopRadiusRatio,
    desktopCenterXRatio,
    desktopCenterYRatio,
    mouseInfluence,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'pointer-events-none absolute inset-0 z-0 h-full w-full select-none',
        className
      )}
      aria-hidden="true"
    />
  );
}
