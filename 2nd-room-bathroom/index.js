// https://threejs.org/
// https://codepen.io/ricardoolivaalonso/pen/KKbWGNZ
// https://www.youtube.com/watch?v=Q7AOvWpIVHU&t=147s
import * as THREE from 'three';
import {
    OrbitControls
} from 'three/addons/controls/OrbitControls.js';
import {
    GLTFLoader
} from 'three/addons/loaders/GLTFLoader.js';
import {
    EffectComposer
} from 'three/addons/postprocessing/EffectComposer.js';
import {
    RenderPass
} from 'three/addons/postprocessing/RenderPass.js';
import {
    UnrealBloomPass
} from 'three/addons/postprocessing/UnrealBloomPass.js';

const canvas = document.querySelector('.webgl');
const scene = new THREE.Scene();
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

// Add AmbientLight as default otherwise it's dark where
// there is no light shining
const ambientLight = new THREE.AmbientLight(0x909090); // soft white light
scene.add(ambientLight);

// Set background color, otherwise it's just grey
scene.background = new THREE.Color(0xADD8E6); // Light blue color

// Show axesHelper 
var axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 1, 100);
camera.position.set(-1.5, 2.5, -1.5);
scene.add(camera);

//Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enableZoom = true;
controls.enablePan = true;
controls.minDistance = 0;
controls.maxDistance = 10;
controls.target = new THREE.Vector3(1, 1, 1);

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
});

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // strength
    0.4, // radius
    2 // threshold
);
composer.addPass(bloomPass);

// Lighting
const addCeilingLight = (scene, pos) => {
    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(pos.x, 3, pos.z);    // 3 is ceiling height
    light.angle = Math.PI / 12;
    light.penumbra = 1;
    light.decay = 2;
    light.distance = 10;

    light.castShadow = true;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 10;
    light.shadow.focus = 1;
    scene.add(light);

    const target = new THREE.Object3D();
    target.position.set(pos.x, 0, pos.z); // 0 to point towards floor
    light.target = target;

    scene.add(light.target);
}
addCeilingLight(scene, {
    x: -0.5,
    z: 0.5
});
addCeilingLight(scene, {
    x: -0.5,
    z: 0
});
addCeilingLight(scene, {
    x: -0.5,
    z: -0.5
});
addCeilingLight(scene, {
    x: 0.5,
    z: -0.5
});
// Create a RectAreaLight for mirror
const mirrorRectAreaLight = new THREE.RectAreaLight(0xffffff, 5, 2, 1.2); // White light, full intensity

// TODO: The is hard coded, position light based on mesh
mirrorRectAreaLight.position.copy(new THREE.Vector3(-1.4, 1.7, 0));
mirrorRectAreaLight.lookAt(2, 1.7, 0);
scene.add(mirrorRectAreaLight);

// Materials
const createSolidCollorMaterial = (color, opts) => new THREE.MeshStandardMaterial(Object.assign({
    color: color,
    side: THREE.DoubleSide,
}, opts));
// Load textures for meshs
const textureLoader = new THREE.TextureLoader();
const createTextureMaterial = (url, opts) => {
    const texture = textureLoader.load(url);
    texture.flipY = false;
    texture.encoding = THREE.sRGBEncoding;

    return new THREE.MeshStandardMaterial(Object.assign({
        map: texture,
        side: THREE.DoubleSide
    }, opts));
};
const createWrappedMaterial = url => {
    const texture = textureLoader.load(url);
    texture.flipY = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.encoding = THREE.sRGBEncoding;

    return new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide
    });
};

const blackMaterial = createSolidCollorMaterial(0x000000);
const whiteMaterial = createSolidCollorMaterial(0xffffff);
const goldMaterial = createSolidCollorMaterial(0xd2c28e);
const vanityMaterial = createTextureMaterial('./img/vanity.png');
const mirrorMaterial = createTextureMaterial('./img/mirror.png');
const mirrorLightMaterial = createSolidCollorMaterial(0xffffff, {
    emissive: 0xffffff, // Emissive color
    emissiveIntensity: 1 // Adjust intensity as needed
});
const floorTileMaterial = createWrappedMaterial('./img/floor-tile.png');
const wallTileMaterial = createWrappedMaterial('./img/tile-2x4.png');
const wallAccentTileMaterial = createWrappedMaterial('./img/accent-tile-2x4.png');
const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd1edf3,
    metalness: 0,
    roughness: 0,
    envMapIntensity: 0.9,
    clearcoat: 1,
    transparent: true,
    transmission: .95,
    opacity: 1,
    reflectivity: 0.01, // <-- <-- Adjust reflection
    thickness: 0.1 // <-- Adjust refraction
});


// Used to do object detect to hide objects blocking view
const raycaster = new THREE.Raycaster();
const cameraWorldPosition = new THREE.Vector3();
const allObjects = [];
const centerPosition = new THREE.Vector3();
const targetWorldPosition = centerPosition;

// Loader
const loader = new GLTFLoader();
loader.load('./model.glb',
    (gltf) => {
        const model = gltf.scene

        // model.scale.set(4, 4, 4);

        model.traverse(child => {
            if (child.name !== 'Window' && child.name !== 'Soap_Box') {
                // These object are shown/hidden depending on camera position
                allObjects.push(child);
            }
            console.log(child);
            if (child.name === 'Vanity') {
                child.material = vanityMaterial;
            } else if (
                child.name === 'Mirror_Box' ||
                child.name === 'Mirror_Light'
            ) {
                child.material = mirrorLightMaterial;
            } else if (child.name === 'Mirror_Front') {
                child.material = mirrorMaterial;
            } else if (
                child.name === 'Room_Floor' ||
                child.name === 'Shower_Floor' ||
                child.name === 'Shower_Curb') {
                child.material = floorTileMaterial;
            } else if (
                child.name.startsWith('Wall_Tile') ||
                child.name === 'Shower_Curb_Cap') {
                child.material = wallTileMaterial;
            } else if (
                child.name === 'Shower_Door_Rail' ||
                child.name.startsWith('Fastener') ||
                child.name.startsWith('Roller')) {
                child.material = blackMaterial;
            } else if (
                child.name === 'Shower_Door_Fixed' ||
                child.name === 'Shower_Door_Sliding') {
                child.material = glassMaterial;
            } else if (child.name.startsWith('Soap_Box_Wall_Tile')) {
                child.material = wallAccentTileMaterial;
            } else if (child.name.startsWith('Tile_Trim')) {
                child.material = goldMaterial;
            } else if (child.name === 'Window' || child.name === 'Soap_Box') {
                child.visible = false;
            } else {
                child.material = whiteMaterial;
            }
        });
        scene.add(model)

        // Get center of model
        const box = new THREE.Box3();
        box.setFromObject(model);
        box.getCenter(centerPosition);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded')
    }
)

// Handler to re-render on page resize
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
});

// Render loop
const render = () => {
    controls.update()

    // renderer.render(scene, camera)
    composer.render(scene, camera)

    // Update wall viewability based on whether they're blocking the view
    camera.getWorldPosition(cameraWorldPosition);
    const dir = cameraWorldPosition.clone().sub(targetWorldPosition).normalize();
    const maxDistance = cameraWorldPosition.distanceTo(targetWorldPosition);
    raycaster.set(targetWorldPosition, dir);

    const intersectedObjects = raycaster.intersectObjects(allObjects);
    allObjects.forEach(obj => {
        const intersectedObject = intersectedObjects.find(i => i.object.name === obj.name);
        // Is between camera and target
        const isBlockingView = !!intersectedObject && intersectedObject.distance < maxDistance;
        // obj.material.opacity = isBlockingView ? 0.2 : 1;
        // obj.material.wireframe = isBlockingView;
        obj.visible = !isBlockingView;
    });

    window.requestAnimationFrame(render);
};
render();