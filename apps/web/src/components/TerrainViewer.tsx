'use client';

import { useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface TerrainViewerProps {
  routePoints: any[];
  insights: any;
  timeProgress: number;
}

function TerrainScene({ routePoints, timeProgress }: TerrainViewerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.Line>(null);

  const terrainGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1000, 1000, 50, 50);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i);
      positions.setZ(i, z + Math.random() * 50);
    }
    positions.needsUpdate = true;
    return geometry;
  }, []);

  const pathPoints = useMemo(() => {
    if (!routePoints.length) return [];
    
    const visiblePoints = routePoints.slice(0, Math.floor(routePoints.length * timeProgress));
    return visiblePoints.map((point: any) => {
      const loc = point.location || {};
      return new THREE.Vector3(
        (loc.lng || 0) * 1000 - 500,
        (loc.altitude || 0) * 0.1,
        (loc.lat || 0) * 1000 - 500
      );
    });
  }, [routePoints, timeProgress]);

  useEffect(() => {
    if (pathPoints.length > 0 && lineRef.current) {
      const geometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
      lineRef.current.geometry = geometry;
    }
  }, [pathPoints]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <mesh ref={meshRef} geometry={terrainGeometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#6B9B7A" flatShading />
      </mesh>
      {pathPoints.length > 0 && (
        <line ref={lineRef as any}>
          <bufferGeometry />
          <lineBasicMaterial color="#4A7C59" linewidth={3} />
        </line>
      )}
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </>
  );
}

export function TerrainViewer(props: TerrainViewerProps) {
  return (
    <Canvas camera={{ position: [0, 200, 500], fov: 50 }}>
      <TerrainScene {...props} />
    </Canvas>
  );
}
