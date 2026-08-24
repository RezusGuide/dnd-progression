import * as THREE from 'three'

// A stylized, low-poly laptop scene. At progress=0 the camera sits right up
// against the screen (as if you were looking out of it, filling the
// viewport); as the user scrolls, the camera pulls back and down until the
// whole laptop - resting on a little brick pedestal - is in frame, with
// five glowing portal markers hovering around it. Those portals are purely
// visual; the actual clickable hotspots are HTML buttons the React layer
// positions every frame by projecting each portal's 3D position onto the
// screen (see projectPoint) - real, accessible, keyboard-reachable buttons
// that just happen to be invisible until the scene reveals them.

const PORTAL_LOCAL_POSITIONS = [
    { key: 'portfolio', pos: new THREE.Vector3(-2.6, 1.6, 0.6), color: 0x3ddc6f },
    { key: 'media', pos: new THREE.Vector3(-1.3, 2.3, -1.8), color: 0xffffff },
    { key: 'useful', pos: new THREE.Vector3(1.5, 2.4, -1.6), color: 0xff2e97 },
    { key: 'dnd', pos: new THREE.Vector3(2.7, 1.5, 0.7), color: 0xc9a24b },
    { key: 'minecraft', pos: new THREE.Vector3(0, 2.9, -0.4), color: 0x5d9c3e },
]

function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

function buildLaptop() {
    const group = new THREE.Group()

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.55, metalness: 0.3 })
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 1.7), baseMat)
    base.position.y = 0.07
    group.add(base)

    const keyDeck = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 0.02, 1.35),
        new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.7 })
    )
    keyDeck.position.set(0, 0.145, 0.05)
    group.add(keyDeck)

    const trackpad = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.005, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x333540, roughness: 0.4, metalness: 0.5 })
    )
    trackpad.position.set(0, 0.156, 0.55)
    group.add(trackpad)

    // Screen pivots up from the back edge of the base.
    const screenPivot = new THREE.Group()
    screenPivot.position.set(0, 0.14, -0.78)
    screenPivot.rotation.x = -1.85 // opened ~106deg from resting flat on the base
    group.add(screenPivot)

    const lidBack = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 1.62, 0.07),
        new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.5, metalness: 0.35 })
    )
    lidBack.position.set(0, 0.81, -0.02)
    screenPivot.add(lidBack)

    const screenGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.36, 1.42),
        new THREE.MeshStandardMaterial({
            color: 0x0a1f2e,
            emissive: 0x2fd8ff,
            emissiveIntensity: 0.9,
            roughness: 0.3,
        })
    )
    screenGlow.position.set(0, 0.83, 0.02)
    screenPivot.add(screenGlow)

    const screenLight = new THREE.PointLight(0x2fd8ff, 1.1, 6, 2)
    screenLight.position.set(0, 0.9, 0.6)
    group.add(screenLight)

    // A little brick pedestal under the laptop, echoing the reference photo.
    const brickMat = new THREE.MeshStandardMaterial({ color: 0x8a4a34, roughness: 0.9 })
    const brickMat2 = new THREE.MeshStandardMaterial({ color: 0x74392a, roughness: 0.9 })
    const bricks = new THREE.Group()
    const layout = [
        [-0.9, -0.5], [0, -0.5], [0.9, -0.5],
        [-0.9, 0.5], [0, 0.5], [0.9, 0.5],
    ]
    layout.forEach(([x, z], i) => {
        const brick = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.4, 0.85),
            i % 2 === 0 ? brickMat : brickMat2
        )
        brick.position.set(x, -0.2, z)
        bricks.add(brick)
    })
    bricks.position.y = 0
    group.add(bricks)

    return { group, screenPivot, screenGlow, ledge: base }
}

function buildPortals() {
    const group = new THREE.Group()
    const meshes = {}
    PORTAL_LOCAL_POSITIONS.forEach(({ key, pos, color }) => {
        const marker = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.14, 0),
            new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, roughness: 0.3 })
        )
        marker.position.copy(pos)
        marker.userData.key = key
        marker.userData.basePos = pos.clone()
        group.add(marker)
        meshes[key] = marker
    })
    return { group, meshes }
}

export function createHomeScene(container) {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x05070a)
    scene.fog = new THREE.Fog(0x05070a, 6, 16)

    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 60)

    // WebGL context creation can fail (disabled/blocked GPU, some VMs,
    // certain locked-down browser configs). Fail soft here instead of
    // throwing mid-effect - Home.jsx checks `failed` and shows a plain
    // static page instead of the 3D scene rather than crashing the app.
    let renderer
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    } catch (err) {
        console.error('WebGL unavailable, falling back to static Home page:', err)
        return { failed: true, setProgress: () => {}, resize: () => {}, dispose: () => {}, projectPoint: () => null, portalKeys: [] }
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x8899aa, 0.55))
    const key = new THREE.DirectionalLight(0xffffff, 0.9)
    key.position.set(3, 5, 4)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x4477ff, 0.4)
    rim.position.set(-4, 2, -3)
    scene.add(rim)

    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 1 })
    const ground = new THREE.Mesh(new THREE.CircleGeometry(9, 48), groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.4
    scene.add(ground)

    const { group: laptopGroup, screenGlow } = buildLaptop()
    scene.add(laptopGroup)

    const { group: portalGroup, meshes: portalMeshes } = buildPortals()
    scene.add(portalGroup)

    // Camera path: start pressed up against the glowing screen, end pulled
    // back and slightly above, looking down at the whole laptop + portals.
    const camStart = new THREE.Vector3(0, 0.85, 1.35)
    const camEnd = new THREE.Vector3(0.3, 2.6, 5.6)
    const lookStart = new THREE.Vector3(0, 0.85, -0.4)
    const lookEnd = new THREE.Vector3(0, 0.9, -0.3)

    let progress = 0
    let clock = new THREE.Clock()
    let frameId

    function resize() {
        const { clientWidth, clientHeight } = container
        camera.aspect = clientWidth / Math.max(clientHeight, 1)
        camera.updateProjectionMatrix()
        renderer.setSize(clientWidth, clientHeight, false)
    }
    resize()

    function setProgress(p) {
        progress = Math.min(1, Math.max(0, p))
    }

    function animate() {
        frameId = requestAnimationFrame(animate)
        const t = clock.getElapsedTime()
        const eased = easeInOutCubic(progress)

        camera.position.lerpVectors(camStart, camEnd, eased)
        const look = new THREE.Vector3().lerpVectors(lookStart, lookEnd, eased)
        camera.lookAt(look)

        // Gentle idle glow pulse + portals drifting once revealed.
        screenGlow.material.emissiveIntensity = 0.75 + Math.sin(t * 1.4) * 0.15 * (1 - eased * 0.5)
        portalGroup.visible = eased > 0.05
        Object.values(portalMeshes).forEach((m, i) => {
            m.material.opacity = eased
            m.material.transparent = true
            m.rotation.y = t * 0.6 + i
            m.position.y = m.userData.basePos.y + Math.sin(t * 1.2 + i) * 0.05
        })
        laptopGroup.rotation.y = eased * 0.15

        try {
            renderer.render(scene, camera)
        } catch (err) {
            // A dropped/lost GL context mid-session shouldn't spam errors
            // forever - stop the loop quietly rather than throwing every
            // frame (the visible scene just freezes on its last frame).
            console.error('WebGL render failed, stopping the scene loop:', err)
            cancelAnimationFrame(frameId)
        }
    }
    animate()

    function projectPoint(key) {
        const mesh = portalMeshes[key]
        if (!mesh) return null
        const v = mesh.position.clone().project(camera)
        const { clientWidth, clientHeight } = container
        return {
            x: (v.x * 0.5 + 0.5) * clientWidth,
            y: (-v.y * 0.5 + 0.5) * clientHeight,
            visible: v.z < 1,
        }
    }

    function dispose() {
        cancelAnimationFrame(frameId)
        renderer.dispose()
        scene.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose()
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
                else obj.material.dispose()
            }
        })
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }

    return {
        failed: false,
        setProgress,
        resize,
        dispose,
        projectPoint,
        portalKeys: PORTAL_LOCAL_POSITIONS.map((p) => p.key),
    }
}
