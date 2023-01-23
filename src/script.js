import GUI from 'lil-gui';
import gsap from 'gsap';
import {
    BufferAttribute,
    BufferGeometry,
    Clock,
    ConeGeometry,
    DirectionalLight,
    Group,
    Mesh,
    MeshToonMaterial,
    NearestFilter,
    PerspectiveCamera,
    Points,
    PointsMaterial,
    Scene,
    TextureLoader,
    TorusGeometry,
    TorusKnotGeometry,
    WebGLRenderer,
} from 'three';

/**
 * Debug
 */
const gui = new GUI();

const parameters = {
    materialColor: '#ffeded',
};

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new Scene();

const textureLoader = new TextureLoader();
// this is a texture with an image of 3px where each px is a color.
const gradientTexture = textureLoader.load('/textures/gradients/3.jpg');
// this magfilter makes or loader do not try to mix the 3 colors provided on the texture.
// Instead, it selects the nearest one and apply it on the draw position
gradientTexture.magFilter = NearestFilter;
/**
 * Objects
 */
const objectDistance = 4;
// mesh toon material is a light based material so it only appears with light
const material = new MeshToonMaterial({
    color: parameters.materialColor,
    gradientMap: gradientTexture,
});
const mesh1 = new Mesh(new TorusGeometry(1, 0.4, 16, 68), material);
const mesh2 = new Mesh(new ConeGeometry(1, 2, 32), material);
const mesh3 = new Mesh(new TorusKnotGeometry(0.8, 0.35, 100, 16), material);

mesh1.position.x = 2;

mesh2.position.y = -objectDistance;
mesh2.position.x = -2;

mesh3.position.y = -objectDistance * 2;
mesh3.position.x = 2;

scene.add(mesh1, mesh2, mesh3);

const sectionMeshes = [mesh1, mesh2, mesh3];

gui.addColor(parameters, 'materialColor').onChange(() => {
    material.color.set(parameters.materialColor);
    particlesMaterial.color.set(parameters.materialColor);
});

/**
 * Particles
 */
const particlesCount = 200;
const positions = new Float32Array(particlesCount * 3);
for (let i = 0; i < particlesCount; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 10;
    // for the y axe we need to start high enough and then spread far enough below so that we cam reach
    // the end of the screll. It recives the half of objectDistance (2) and then, decreases with a big number
    // Math.random() * 10. Since our hole page is objectDistance * 3, this should be enough to fill all views
    positions[i3 + 1] = objectDistance * 0.5 - Math.random() * objectDistance * sectionMeshes.length;
    positions[i3 + 2] = (Math.random() - 0.5) * 10;
}

const particlesGeometry = new BufferGeometry();
particlesGeometry.setAttribute('position', new BufferAttribute(positions, 3));
const particlesMaterial = new PointsMaterial({
    color: parameters.materialColor,
    sizeAttenuation: true,
    size: 0.03,
});
const particles = new Points(particlesGeometry, particlesMaterial);
scene.add(particles);
/**
 * Lights
 */
const directionalLight = new DirectionalLight('#ffffff', 1);
directionalLight.position.set(1, 1, 0);
scene.add(directionalLight);
/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */

// Group
// we need to use a camera group to allow moving the camera position itself on scrolling
const cameraGroup = new Group();
scene.add(cameraGroup);

// Base camera
const camera = new PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
camera.position.z = 6;
cameraGroup.add(camera);

/**
 * Renderer
 */
const renderer = new WebGLRenderer({
    canvas: canvas,
    alpha: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * scroll
 */

let scrollY = window.scrollY;
let currentSection = 0;
window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    // this function works because we settle sections the size of one view port height,
    // so we can fing in wich section we are by rounding the division of y scroll with viewport.height
    const newSection = Math.round(scrollY / sizes.height);
    if (newSection !== currentSection) {
        currentSection = newSection;
        gsap.to(sectionMeshes[currentSection].rotation, {
            duration: 1.5,
            ease: 'power2.out',
            x: '+=6',
            y: '+=3',
            z: '+=1.5',
        });
    }
});

/**
 * Cursor
 */
const cursor = {
    x: 0,
    y: 0,
};
window.addEventListener('mousemove', ($event) => {
    // dividing or cursor with sizes value normalize
    // the values to ensure they are the same regarding the resolution

    // subtracting -0.5 create a graph value where behind the center its negative
    cursor.x = $event.clientX / sizes.width - 0.5;
    cursor.y = $event.clientY / sizes.height - 0.5;
});
/**
 * Animate
 */
const clock = new Clock();
let previousTime = 0;

const tick = () => {
    const elapsedTime = clock.getElapsedTime();

    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;

    // ANIMATE CAMERA
    // 1) negative value is to invert the direction.
    // 2) dividing by the sizes.height will make our scroll of one view port size move the camera
    //      one unit. (one unit defined by us)
    // 3) multiplying this by objectDistance will make it move exaclyt the distance of the objects (4)
    // if we divide scrollY
    camera.position.y = (-scrollY / sizes.height) * objectDistance;

    // PARALAX
    const amplitude = 0.4;
    const parallaxX = cursor.x * amplitude;
    const parallaxY = -cursor.y * amplitude;
    // we need to use a camera group to allow moving the camera position itself on scrolling

    // on each frame, instead of moving the camera straight to the target, we are going to move
    // by a fraction closer to the destination by 'easing', 'smoothing' or 'learping' the movement so it
    // looks slower and not so robotic. Multiplying it to deltatime already do this job, but deltatime is
    // so low that we need to actually increase the value of the movement instead of decreasing. So for 1/10
    // of the movement (* 0.1) it will have a similar behavior of 5 (* 5 * deltatime)
    // deltaTime normalize screen frequency. We don't want different animations on screens of 60hz vs 144hz
    const fraction = 5;
    cameraGroup.position.x += (parallaxX - cameraGroup.position.x) * fraction * deltaTime;
    cameraGroup.position.y += (parallaxY - cameraGroup.position.y) * fraction * deltaTime;
    // animate meshes

    for (const mesh of sectionMeshes) {
        mesh.rotation.x += deltaTime * 0.1;
        mesh.rotation.y += deltaTime * 0.13;
    }
    // Render
    renderer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
};

tick();
