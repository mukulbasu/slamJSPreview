import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.138.3/examples/jsm/controls/OrbitControls.js';
import { TrackballControls } from 'https://unpkg.com/three@0.138.3/examples/jsm//controls/TrackballControls.js';
import CameraControls from '/js/camera-controls.module.js';
CameraControls.install({ THREE: THREE });


const cameraObj = (current, origin) => {
    const result = new THREE.Group();
    const group = new THREE.Group();

    const geometry = new THREE.ConeGeometry(2, 2, 4);


    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    //Origin is Red, current is Blue
    const color = current ? 0x0000FF : origin ? 0xFF0000 : 0x00FF00;
    const meshMaterial = new THREE.MeshPhongMaterial({ color: color, emissive: 0x072534, side: THREE.DoubleSide, flatShading: true });

    group.add(new THREE.LineSegments(geometry, lineMaterial));
    group.add(new THREE.Mesh(geometry, meshMaterial));
    group.rotateX(-Math.PI / 2);
    group.rotateY(Math.PI / 4);
    result.add(group);
    return result;
}

const INLIER_COLOR = 0x90EE90; //Light Green
const INLIER_COLOR_HIGHLIGHT = 0x8888FF; //Light Blue
const OUTLIER_COLOR = 0xFFA500; //Light Orange
const OUTLIER_COLOR_HIGHLIGHT = 0x990000; //Light Red

const getColor = (current, isValid) => {
    if (isValid) {
        if (current) return INLIER_COLOR_HIGHLIGHT;
        else return INLIER_COLOR;
    } else {
        if (current) return OUTLIER_COLOR_HIGHLIGHT;
        else return OUTLIER_COLOR;
    }
}

const getCube = (width, height, depth, color) => {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({ color });
    return new THREE.Mesh(geometry, material);
}

const landmarkObj = (current, isValid, isNew, isOld, isMatch) => {
    const group = new THREE.Group();
    if (isMatch) {
        group.add(getCube(3, 3, 3, getColor(current, isValid)));
    }
    if (isNew) {
        group.add(getCube(4, 2, 2, 0x800080));
    }
    if (isOld) {
        group.add(getCube(2, 4, 2, 0x808080))
    }
    group.name = "landmarkObj";
    return group;
}

let renderer1, renderer2;
let scene1, scene2;
let camera1, camera2;
let control1 = undefined, control2 = undefined;
let floor1, floor2;
const floorDepth = 250;
const gridSize = floorDepth * 2;
const cameraSetUp = [
    [0, 1, 0],
    [-1, 0, 0],
    [0, -1, 0],
    [1, 0, 0]
];
const floorPositions = [
    [0, -floorDepth, 0],
    [floorDepth, 0, 0],
    [0, floorDepth, 0],
    [-floorDepth, 0, 0]
];
let cameraSetUpIndex = 0;
let rotate = false;
export const renderStart = () => {
    console.log("Render called");
    const cameraPosition1 = [5, 8, -30];
    const cameraPosition2 = [-10, 0, -20];
    [renderer1, scene1, floor1] = createScene(document.getElementById("canvas1"), cameraPosition1);
    [renderer2, scene2, floor2] = createScene(document.getElementById("canvas2"), cameraPosition2);

    const setCamera = () => {
        if (control1 != undefined) {
            control1.dispose();
            control1 = undefined;
        }
        [camera1, control1] = createCamera(scene1, cameraPosition1, renderer1, document.getElementById("canvas1"));
        if (control2 != undefined) {
            control2.dispose();
            control2 = undefined;
        }
        [camera2, control2] = createCamera(scene2, cameraPosition2, renderer2, document.getElementById("canvas2"));
        floor1.position.set(...floorPositions[cameraSetUpIndex]);
        floor2.position.set(...floorPositions[cameraSetUpIndex]);
        if (cameraSetUpIndex % 2 == 1) {
            floor1.rotation.set(0, 0, Math.PI / 2);
            floor2.rotation.set(0, 0, Math.PI / 2);
        } else {
            floor1.rotation.set(0, 0, 0);
            floor2.rotation.set(0, 0, 0);
        }
    }
    setCamera();
    document.getElementById("rotateCamera").onclick = () => {
        cameraSetUpIndex = (cameraSetUpIndex + 1) % cameraSetUp.length;
        console.log("rotate camera click", cameraSetUpIndex);
        setCamera();
    }

    const clock = new THREE.Clock();
    function animate() {
        // const delta = clock.getDelta();
        // const elapsed = clock.getElapsedTime();
        // const updated1 = control1.update( delta );
        // const updated2 = control2.update( delta );

        requestAnimationFrame(animate);

        control1.update();
        control2.update();
        // if (updated1) 
        renderer1.render(scene1, camera1);
        // if (updated2) 
        renderer2.render(scene2, camera2);
    }
    animate();
}


const createScene = (canvas, cameraPosition) => {
    let scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({ canvas: canvas });
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);


    const dirLight1 = new THREE.DirectionalLight(0xffffff);
    dirLight1.position.set(1000, 1000, -1000);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff);
    dirLight2.position.set(-1000, -1000, -1000);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xffffff);
    dirLight3.position.set(0, 0, 1000);
    scene.add(dirLight3);

    const ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);

    scene.background = new THREE.Color(0xffffff);
    scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

    const floor = new THREE.GridHelper(gridSize, 15, 0x808080, 0x808080);
    floor.position.set(...floorPositions[cameraSetUpIndex]);
    // scene.add( floor );

    const pos = [
        [0, floorDepth, 0],
        [0, -floorDepth, 0],
        [floorDepth, 0, 0],
        [-floorDepth, 0, 0],
        [0, 0, floorDepth],
        [0, 0, -floorDepth],
    ]
    for (let i = 0; i < 6; i++) {
        const floors = new THREE.GridHelper(gridSize, 5, 0x808080, 0x808080);
        floors.position.set(...pos[i]);
        if (i > 3) {
            floors.rotation.set(Math.PI / 2, 0, 0);
        } else if (i > 1) {
            floors.rotation.set(0, 0, Math.PI / 2);
        }
        scene.add(floors);
    }

    console.log("Height and Width", canvas.offsetWidth, canvas.offsetHeight);

    return [renderer, scene, floor];
}

const createCamera = (scene, cameraPosition, renderer, canvas) => {
    const camera = new THREE.PerspectiveCamera(75, canvas.offsetWidth / canvas.offsetHeight, 0.1, 100000);
    camera.position.set(...cameraPosition);
    camera.up.set(...cameraSetUp[cameraSetUpIndex]);
    scene.add(camera);

    // const controls = new OrbitControls( camera, renderer.domElement );
    // controls.listenToKeyEvents( canvas ); // optional
    // controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    // controls.dampingFactor = 0.05;
    // controls.screenSpacePanning = true;
    // controls.minDistance = 1;
    // controls.maxDistance = 500;
    // controls.maxPolarAngle = Math.PI;


    // const controls = new CameraControls( camera, renderer.domElement );


    const controls = new TrackballControls(camera, renderer.domElement);

    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;

    controls.keys = ['KeyA', 'KeyS', 'KeyD'];

    window.addEventListener('resize', () => {
        camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

        controls.handleResize();
    });
    return [camera, controls];
}


const amplitude = (list) => {
    let sum = 0;
    for (const index in list) {
        sum += Math.pow(list[index], 2);
    }
    return Math.sqrt(sum);
}


let otherFramesVisible = false;
let scale = 1;
let dirX = 1, dirY = 1, dirZ = 1;

export const render = (frames, originFrame, currentFrameId) => {
    document.getElementById("otherCameraToggle").onclick = () => {
        console.log("Clicked Toggle");
        otherFramesVisible = !otherFramesVisible;
        render(frames, originFrame, currentFrameId);
    }
    renderFrames(frames, originFrame, currentFrameId, scene1);
    renderFrames(frames, originFrame, currentFrameId, scene2);
}

const renderFrames = (frames, originFrame, currentFrameId, scene) => {
    const delList = [];
    let gridHelper;
    let camera;
    scene.children.forEach(child => {
        if (child.name === "cameraObj") delList.push(child);
        if (child.type === "GridHelper") gridHelper = child;
        if (child.type === "PerspectiveCamera") camera = child;
    });
    delList.forEach(child => scene.remove(child));
    let maxX = 0, minX = 99999, maxY = 0, minY = 9999, maxZ = 0, minZ = 99999;
    for (let index = 0; index < 2; index++) {
        const frame = frames[index];
        const X = Number(frame.TX), Y = Number(frame.TY), Z = Number(frame.TZ);
        if (maxX < X) maxX = X;
        if (maxY < Y) maxY = Y;
        if (maxZ < Z) maxZ = Z;
        if (minX > X) minX = X;
        if (minY > Y) minY = Y;
        if (minZ > Z) minZ = Z;
    }
    scale = 10 / amplitude([maxX - minX, maxY - minY, maxZ - minZ]);

    for (const index in frames) {
        const frame = frames[index];
        const frameId = Number(frame.FID);
        if (!otherFramesVisible && frameId != currentFrameId) continue;

        const obj = cameraObj(frameId == currentFrameId, frameId == Number(originFrame.OID));
        obj.name = "cameraObj";
        obj.position.set(dirX * scale * Number(frame.TX),
            dirY * scale * Number(frame.TY),
            dirZ * scale * Number(frame.TZ));
        obj.rotation.set(0, Math.PI, 0);
        obj.rotation.set(Number(frame.RX) * Math.PI / 180, Number(frame.RY) * Math.PI / 180, Number(frame.RZ) * Math.PI / 180);

        scene.add(obj);
    }

    const obj = cameraObj(Number(originFrame.OID) == currentFrameId, true);
    obj.name = "cameraObj";
    obj.position.set(dirX * scale * Number(originFrame.TX),
        dirY * scale * Number(originFrame.TY),
        dirZ * scale * Number(originFrame.TZ));
    obj.rotation.set(0, Math.PI, 0);
    obj.rotation.set(Number(originFrame.RX) * Math.PI / 180, Number(originFrame.RY) * Math.PI / 180, Number(originFrame.RZ) * Math.PI / 180);

    scene.add(obj);
}

let otherLandmarksVisible = true;

export const renderLandmarks = (landmarks, currentLandmarkId, frameDetails) => {
    document.getElementById("otherLandmarkToggle").onclick = () => {
        console.log("Clicked Toggle");
        otherLandmarksVisible = !otherLandmarksVisible;
        renderLandmarks(landmarks, currentLandmarkId);
    }
    renderLandmarksScene(landmarks, currentLandmarkId, scene1, frameDetails);
    renderLandmarksScene(landmarks, currentLandmarkId, scene2, frameDetails);
}

const renderLandmarksScene = (landmarks, currentLandmarkId, scene, frameDetails) => {
    const delList = [];
    let gridHelper;
    let camera;
    scene.children.forEach(child => {
        if (child.name === "landmarkObj") delList.push(child);
        if (child.type === "GridHelper") gridHelper = child;
        if (child.type === "PerspectiveCamera") camera = child;
    });
    delList.forEach(child => scene.remove(child));

    // const landmarkIds = new Set();
    // for (const index in landmarks) {
    //     const landmark = landmarks[index];
    //     landmarkIds.add(landmark.LID);
    //     const landmarkId = Number(landmark.LID);
    //     if (!otherLandmarksVisible && landmarkId != currentLandmarkId) continue;

    //     const obj = landmarkObj(landmarkId == currentLandmarkId, landmark.INLIER === "1");
    //     obj.name = "landmarkObj";
    //     obj.position.set(dirX*scale*Number(landmark.KPX), 
    //             dirY*scale*Number(landmark.KPY), 
    //             dirZ*scale*Number(landmark.KPZ));
    //     scene.add( obj );
    // }

    const oldLandmarks = frameDetails.OLD_LANDMARKS.split(",");
    const newLandmarks = frameDetails.NEW_LANDMARKS.split(",");
    const landmarkGroups = [oldLandmarks, newLandmarks];
    const LID = 0, X = 1, Y = 2, Z = 3, FIXED = 4;
    const landmarkMap = {}
    for (const i in landmarkGroups) {
        const landmarkGroup = landmarkGroups[i];
        for (const j in landmarkGroup) {
            const values = landmarkGroup[j].split("_");
            landmarkMap[values[LID]] = { LID: values[LID], KPX: values[X], KPY: values[Y], KPZ: values[Z], FIXED: values[FIXED], OLD: i == 0, NEW: i == 1, MATCH: false, INLIER: false };
        }
    }
    for (const index in landmarks) {
        const landmark = landmarks[index];
        if (landmark.LID in landmarkMap) {
            // landmarkMap[landmark.LID] = { ...landmarkMap[LID], ...landmark, INLIER:landmark.INLIER === "1", MATCH: true };
            landmarkMap[landmark.LID] = { ...landmarkMap[landmark.LID], INLIER: landmark.INLIER === "1", MATCH: true };
        } else {
            landmarkMap[landmark.LID] = { FIXED: "0", OLD: false, NEW: false, MATCH: true, ...landmark, INLIER: landmark.INLIER === "1" };
        }
    }

    for (const LID in landmarkMap) {
        const landmark = landmarkMap[LID];
        const obj = landmarkObj(LID == currentLandmarkId, landmark.INLIER, landmark.NEW, landmark.OLD, landmark.MATCH);
        obj.position.set(dirX * scale * Number(landmark.KPX),
            dirY * scale * Number(landmark.KPY),
            dirZ * scale * Number(landmark.KPZ));
        scene.add(obj);
    }
}