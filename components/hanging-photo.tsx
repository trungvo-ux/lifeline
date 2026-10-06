"use client"

import { useMemo, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Physics, RigidBody, BallCollider, CuboidCollider, useRopeJoint, useSphericalJoint } from "@react-three/rapier"
import { useTexture } from "@react-three/drei"
import * as THREE from "three"
import type { RapierRigidBody } from "@react-three/rapier"

function PhotoOnString() {
  const fixed = useRef<RapierRigidBody>(null!)
  const joint1 = useRef<RapierRigidBody>(null!)
  const joint2 = useRef<RapierRigidBody>(null!)
  const joint3 = useRef<RapierRigidBody>(null!)
  const card = useRef<RapierRigidBody>(null!)
  const ropeRef = useRef<THREE.Mesh>(null!)
  const texture = useTexture("/images/retro-studio.png")
  const ropeTexture = useTexture("/images/braided-rope.svg")
  const repeatingRopeTexture = useMemo(() => {
    const copy = ropeTexture.clone()
    copy.wrapS = THREE.RepeatWrapping
    copy.repeat.set(3, 1)
    copy.needsUpdate = true
    return copy
  }, [ropeTexture])
  const [dragged, setDragged] = useState<THREE.Vector3 | null>(null)
  const curve = useRef(new THREE.CatmullRomCurve3(Array.from({ length: 5 }, () => new THREE.Vector3())))
  const ropeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d7c9b1", map: repeatingRopeTexture, bumpMap: repeatingRopeTexture, bumpScale: 0.006, roughness: 1 }), [repeatingRopeTexture])
  const point = useMemo(() => new THREE.Vector3(), [])
  const direction = useMemo(() => new THREE.Vector3(), [])

  useRopeJoint(fixed, joint1, [[0, 0, 0], [0, 0, 0], 0.7])
  useRopeJoint(joint1, joint2, [[0, 0, 0], [0, 0, 0], 0.7])
  useRopeJoint(joint2, joint3, [[0, 0, 0], [0, 0, 0], 0.7])
  useSphericalJoint(joint3, card, [[0, 0, 0], [0, 1.35, 0]])

  useFrame(({ pointer, camera }) => {
    if (!card.current || !fixed.current || !joint1.current || !joint2.current || !joint3.current) return

    if (dragged) {
      point.set(pointer.x, pointer.y, 0.5).unproject(camera)
      direction.copy(point).sub(camera.position).normalize()
      point.copy(camera.position).addScaledVector(direction, -camera.position.z / direction.z)
      card.current.setNextKinematicTranslation({ x: point.x - dragged.x, y: point.y - dragged.y, z: 0 })
      joint1.current.wakeUp()
      joint2.current.wakeUp()
      joint3.current.wakeUp()
    }

    const rotation = card.current.rotation()
    const translation = card.current.translation()
    curve.current.points[0].set(0, 1.35, 0).applyQuaternion(new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w))
    curve.current.points[0].x += translation.x
    curve.current.points[0].y += translation.y
    curve.current.points[0].z += translation.z
    curve.current.points[1].copy(joint3.current.translation())
    curve.current.points[2].copy(joint2.current.translation())
    curve.current.points[3].copy(joint1.current.translation())
    curve.current.points[4].copy(fixed.current.translation())
    const oldGeometry = ropeRef.current.geometry
    ropeRef.current.geometry = new THREE.TubeGeometry(curve.current, 48, 0.019, 8, false)
    oldGeometry.dispose()

    const angular = card.current.angvel()
    card.current.setAngvel({ x: angular.x, y: angular.y - rotation.y * 0.2, z: angular.z }, true)
  })

  return (
    <>
      <RigidBody ref={fixed} type="fixed" position={[0, 5, 0]} colliders={false} />
      <RigidBody ref={joint1} position={[0, 4.3, 0]} colliders={false} linearDamping={2} angularDamping={2}><BallCollider args={[0.055]} /></RigidBody>
      <RigidBody ref={joint2} position={[0, 3.6, 0]} colliders={false} linearDamping={2} angularDamping={2}><BallCollider args={[0.055]} /></RigidBody>
      <RigidBody ref={joint3} position={[0, 2.9, 0]} colliders={false} linearDamping={2} angularDamping={2}><BallCollider args={[0.055]} /></RigidBody>
      <RigidBody ref={card} position={[0.75, 6.2, 0]} type={dragged ? "kinematicPosition" : "dynamic"} colliders={false} linearDamping={1.8} angularDamping={2.5}>
        <CuboidCollider args={[0.98, 1.35, 0.04]} />
        <group
          onPointerDown={(event) => {
            event.stopPropagation()
            ;(event.target as EventTarget & { setPointerCapture(id: number): void }).setPointerCapture(event.pointerId)
            setDragged(event.point.clone().sub(new THREE.Vector3().copy(card.current!.translation())))
          }}
          onPointerUp={(event) => {
            ;(event.target as EventTarget & { releasePointerCapture(id: number): void }).releasePointerCapture(event.pointerId)
            setDragged(null)
          }}
          onPointerMissed={() => setDragged(null)}
        >
          <mesh castShadow>
            <boxGeometry args={[1.96, 2.7, 0.08]} />
            <meshStandardMaterial color="#eee9de" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.35, 0.047]}>
            <planeGeometry args={[1.72, 1.72]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
          </mesh>
          <mesh position={[0, 1.23, 0.055]}>
            <circleGeometry args={[0.045, 24]} />
            <meshStandardMaterial color="#46423c" />
          </mesh>
        </group>
      </RigidBody>
      <mesh ref={ropeRef} material={ropeMaterial}><bufferGeometry /></mesh>
    </>
  )
}

export function HangingPhoto() {
  return (
    <div className="hanging-photo" aria-label="Interactive retro photo hanging from a string">
      <Canvas camera={{ position: [0, 0, 16], fov: 35 }} dpr={[1, 2]}>
        <ambientLight intensity={2} />
        <directionalLight position={[-3, 5, 5]} intensity={2} />
        <Physics gravity={[0, -16, 0]} timeStep={1 / 60} interpolate>
          <PhotoOnString />
        </Physics>
      </Canvas>
    </div>
  )
}
