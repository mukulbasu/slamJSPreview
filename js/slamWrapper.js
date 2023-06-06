import * as THREE from 'three';
import { TrackballControls } from '/js/TrackballControls.js';

const DeviceOrientationControls = function( object ) {

	var scope = this;

	this.object = object;
	this.object.rotation.reorder( "YXZ" );

	this.enabled = true;

	this.deviceOrientation = {};
	this.screenOrientation = 0;

	this.alpha = 0;
	this.alphaOffsetAngle = Math.PI/2;
	this.betaOffsetAngle = 0;
	this.gammaOffsetAngle = 0;


	var onDeviceOrientationChangeEvent = function( event ) {

		scope.deviceOrientation = event;

	};

	var onScreenOrientationChangeEvent = function() {

		scope.screenOrientation = window.orientation || 0;

	};

	// The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

	var setObjectQuaternion = function() {

		var zee = new THREE.Vector3( 0, 0, 1 );

		var euler = new THREE.Euler();

		var q0 = new THREE.Quaternion();

		var q1 = new THREE.Quaternion( - Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ); // - PI/2 around the x-axis

		return function( quaternion, alpha, beta, gamma, orient ) {

			euler.set( beta, alpha, - gamma, 'YXZ' ); // 'ZXY' for the device, but 'YXZ' for us

			quaternion.setFromEuler( euler ); // orient the device

			quaternion.multiply( q1 ); // camera looks out the back of the device, not the top

			quaternion.multiply( q0.setFromAxisAngle( zee, - orient ) ); // adjust for screen orientation

		};

	}();

	this.connect = function() {

		onScreenOrientationChangeEvent(); // run once on load

		window.addEventListener( 'orientationchange', onScreenOrientationChangeEvent, false );
		window.addEventListener( 'deviceorientation', onDeviceOrientationChangeEvent, false );

		scope.enabled = true;

	};

	this.disconnect = function() {

		window.removeEventListener( 'orientationchange', onScreenOrientationChangeEvent, false );
		window.removeEventListener( 'deviceorientation', onDeviceOrientationChangeEvent, false );

		scope.enabled = false;

	};

	this.update = function() {

		if ( scope.enabled === false ) return;

		var alpha = scope.deviceOrientation.alpha ? THREE.Math.degToRad( scope.deviceOrientation.alpha ) + this.alphaOffsetAngle : 0; // Z
		var beta = scope.deviceOrientation.beta ? THREE.Math.degToRad( scope.deviceOrientation.beta ) + this.betaOffsetAngle : 0; // X'
		var gamma = scope.deviceOrientation.gamma ? THREE.Math.degToRad( scope.deviceOrientation.gamma ) + this.gammaOffsetAngle : 0; // Y''
		var orient = scope.screenOrientation ? THREE.Math.degToRad( scope.screenOrientation ) : 0; // O

		setObjectQuaternion( scope.object.quaternion, alpha, beta, gamma, orient );
    scope.object.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 22/7);
		this.alpha = alpha;
	};

	this.updateAlphaOffsetAngle = function( angle ) {

		this.alphaOffsetAngle = angle;
		this.update();

	};

	this.updateBetaOffsetAngle = function( angle ) {

		this.betaOffsetAngle = angle;
		this.update();

	};

	this.updateGammaOffsetAngle = function( angle ) {

		this.gammaOffsetAngle = angle;
		this.update();

	};

	this.dispose = function() {

		this.disconnect();

	};

	this.connect();

};

const trim = (value) => Math.round(value*100)/100;

let alpha, beta, gamma;
let camera = "";
let deviceOrientationControls = "";

function handleOrientation(event) {
  ({alpha, beta, gamma} = event);
  if (deviceOrientationControls != "") {
    deviceOrientationControls.update();
  }
}

const width = 480;
const height = 640;
const srcVideo = document.querySelector("#srcVideo");
const canvas = document.querySelector("#canvasVideo");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const captureImage = () => {
  startTime = Date.now();
  ctx.drawImage(srcVideo, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const rot = camera.rotation;
  slamWorker.postMessage({operation: "addImage", imageData: imageData,
      x: rot.x, y: rot.y, z: rot.z, order: rot.order});
  return imageData;
};

let scale = -1;
let distX = 0, velX = 0, countX = 0, avgDistX = 0;
let lastAccX = -1, accXs = [], imgs = [], edgeImgs = [], midImgs = [], initDists = [];

const storeImage = () => {
  startTime = Date.now();
  ctx.drawImage(srcVideo, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const rot = camera.rotation;
  imgs.push({ imageData, x: rot.x, y: rot.y, z: rot.z, order: rot.order });
};

let smoothedAcc = 0;
let staticCount = 0;
let moved = false, stored = false;
function handleAcceleration(event) {
  smoothedAcc = 0.8*smoothedAcc + 0.2*event.acceleration.x;
  if (Math.abs(event.acceleration.x) < 0.5) {
    staticCount++;
    if (staticCount >= 6) {
      console.log("Storing image");
      storeImage();
      stored = true;
    }
    if (staticCount >= 9 && moved == true) {
      console.log("Initializing");
      if (imgs.length < 6) console.error("Not enough initImgs");
      const initImgs = [];
      // initImgs.push(imgs[imgs.length - 10]);
      // initImgs.push(imgs[imgs.length - 9]);
      // initImgs.push(imgs[imgs.length - 8]);
      // initImgs.push(imgs[imgs.length - 7]);
      initImgs.push(imgs[imgs.length - 6]);
      initImgs.push(imgs[imgs.length - 5]);
      initImgs.push(imgs[imgs.length - 4]);
      initImgs.push(imgs[imgs.length - 3]);
      initImgs.push(imgs[imgs.length - 2]);
      initImgs.push(imgs[imgs.length - 1]);
      console.log("InitMsgs being sent ", initImgs);
      
      slamWorker.postMessage({operation: "initializeMap", initImgs, totalDist:10});
      window.removeEventListener("devicemotion", handleAcceleration);
      distX = 0, velX = 0, countX = 0, avgDistX = 0;
      lastAccX = -1, accXs = [], imgs = [], edgeImgs = [], midImgs = [], initDists = [];
      document.getElementById("status").innerHTML = "Initializing";
      moved = false;
    } else if (imgs.length >= 9) {
      const imgsLen = imgs.length;
      console.log("Deleting", imgs.length);
      for (let i = 0; i < 3; i++) imgs.shift();//Delete all except last 3
      console.log("Deleted", imgs.length);
    }
  } else {
    staticCount = 0;
    if (stored == true) moved = false;
    if (Math.abs(event.acceleration.x) > 1) {
      moved = true;
      stored = false;
    }
  }

  console.log("Values :", trim(event.acceleration.x), ", ", staticCount, ", ", moved);
}

let startTime;
const startVideo = (mediaStream) => {
  console.log("Got the web cam stream");
  srcVideo.srcObject = mediaStream;

  startTime = Date.now();
  slamWorker.postMessage({operation: "start", width, height});

  window.addEventListener("deviceorientation", handleOrientation);
  window.addEventListener("devicemotion", handleAcceleration);
};


const threejsRender = () => {
  const threejsContainer = document.getElementById("threejs-container");
  const threejsWidth = threejsContainer.offsetWidth;
  const threejsHeight = threejsContainer.offsetHeight;
  console.log(threejsWidth, threejsHeight);
  // scene
  const scene = new THREE.Scene();
  // camera
  camera = new THREE.PerspectiveCamera(30, threejsWidth / threejsHeight, 0.1, 1000);
  camera.position.set(0, 0, 0);
  camera.up.set(0, -1, 0);
  deviceOrientationControls = new DeviceOrientationControls(camera);

  // Light
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);
  const pointLight = new THREE.PointLight(0xffffff, 0.2);
  pointLight.position.x = 2;
  pointLight.position.y = 3;
  pointLight.position.z = 4;
  scene.add(pointLight);

  const geometry = new THREE.BoxGeometry( 1, 1, 1); 
  const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} ); 
  const cube = new THREE.Mesh( geometry, material ); 
  cube.position.set(0, -3, -27);
  // camera.lookAt(0, 0, 500);
  scene.add( cube );
  
  // responsiveness
  window.addEventListener('resize', () => {
    const threejsWidth = threejsContainer.offsetWidth;
    const threejsHeight = threejsContainer.offsetHeight;
    camera.aspect = threejsWidth / threejsHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(threejsWidth, threejsHeight);
    renderer.render(scene, camera);
  })
  // renderer
  const renderer = new THREE.WebGL1Renderer( { alpha: true } );
  // const renderer = new THREE.WebGL1Renderer();
  renderer.setClearColor( 0x000000, 0 );
  renderer.setSize(threejsWidth, threejsHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // animation
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  // rendering the scene
  threejsContainer.append(renderer.domElement);
  renderer.render(scene, camera);
  animate();
}
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

let poseScene;
const poseRender = () => {
  const floorDepth = 250;
  const gridSize = floorDepth * 2;
  const floorPositions = [0, -floorDepth, 0];
  let scene = new THREE.Scene();
  poseScene = scene;
  const canvas = document.getElementById("pose-container");
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
  floor.position.set(...floorPositions);
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


  const camera2 = new THREE.PerspectiveCamera(75, canvas.offsetWidth / canvas.offsetHeight, 0.1, 100000);
  camera2.position.set(5, 8, -30);
  camera2.up.set(0, 1, 0);
  scene.add(camera2);

  const controls = new TrackballControls(camera2, renderer.domElement);

  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;

  controls.keys = ['KeyA', 'KeyS', 'KeyD'];

  window.addEventListener('resize', () => {
      camera2.aspect = canvas.offsetWidth / canvas.offsetHeight;
      camera2.updateProjectionMatrix();
      renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

      controls.handleResize();
  });
  function animate() {
    requestAnimationFrame(animate);

    controls.update();
    renderer.render(scene, camera2);
  }
  animate();
}

let keyframeTrans;
let latestTrans;

const renderPoseFrames = () => {
  const delList = [];
  poseScene.children.forEach(child => {
    if (child.name === "cameraObj") delList.push(child);
  });
  delList.forEach(child => poseScene.remove(child));

  const allTrans = [...keyframeTrans, latestTrans];
  for (const index in allTrans) {
      const trans = allTrans[index];
      if (trans) {
        const obj = cameraObj(index == allTrans.length-1, index == 0);
        obj.name = "cameraObj";
        obj.position.set(trans[0], trans[1], trans[2]);
        obj.rotation.set(0, Math.PI, 0);
        poseScene.add(obj);
      }
  }
};

console.log("Initializing");
const dummy = () => {}

const slamWorker = new Worker("js/slamWorker.js");
let camX = 0, camY = 0, camZ = 0;
slamWorker.onmessage = (e) => {
  if (e.data.operation === "translations") {
    const trans = e.data.translations;
    latestTrans = e.data.translations;
    console.log("Translations: ", trans[0], trans[1], trans[2], ", ", Date.now() - startTime, "ms");
    document.getElementById("pose1").textContent = trim(trans[0]);
    document.getElementById("pose2").textContent = trim(trans[1]);
    document.getElementById("pose3").textContent = trim(trans[2]);
    const weight = 1.0;
    if (e.data.result == 0) {
      camX = (1 - weight) * camX + weight * Number(trans[0]);
      camY = (1 - weight) * camY - weight * Number(trans[1]);
      camZ = (1 - weight) * camZ - weight * Number(trans[2]);
      document.getElementById("pose1s").textContent = trim(camX);
      document.getElementById("pose2s").textContent = trim(camY);
      document.getElementById("pose3s").textContent = trim(camZ);
      camera.position.set(camX, camY, camZ);
      renderPoseFrames();
    }
    document.getElementById("time").textContent = (Date.now() - startTime).toString() + " ms";
    document.getElementById("result").textContent = result == 1? "True" : "False";
    setTimeout(captureImage, 0);
  } else if(e.data.operation == "initialized_map") {
    document.getElementById("status").innerHTML = "Initialized";
    setTimeout(captureImage, 0);
  } else if(e.data.operation == "not_initialized_map") {
    document.getElementById("status").innerHTML = "Initialize";
    slamWorker.postMessage({operation: "start", width, height});
    window.addEventListener("devicemotion", handleAcceleration);
  } else if (e.data.operation === "print") {
    const element = document.getElementById('output');
    if (element) element.value = ''; // clear browser cache
    const text = e.data.text;
    {
      if (element) {
        element.value += text + "\n";
        element.scrollTop = element.scrollHeight; // focus on bottom
      }
    };
  } else if (e.data.operation === "status") {
    const text = e.data.text;
    if (e.data.complete == false) {
      console.log("Download complete");
    }
  } else if (e.data.operation === "keyframes") {
    keyframeTrans = e.data.translations;
    renderPoseFrames();
  } else if (e.data.operation === "module_ready") {
    console.log("MODULE READY");
    navigator.mediaDevices.getUserMedia(
      {audio: false, video: {facingMode:{exact: "environment"}, frameRate: { ideal: 10, max: 15 }}}
    ).then(startVideo)
    .catch((error) => {
      console.error("ERROR, could not start back facing camera. Trying front facing");
      navigator.mediaDevices.getUserMedia({ video: true }).then(startVideo);
    });
    document.getElementById("toggleView").onclick = (event) => {
      const video = document.getElementById("srcVideo");
      const canvas = document.getElementById("canvasVideo");
      if (video.style.zIndex == "100") {
        video.style.zIndex = "99";
        canvas.style.zIndex = "100";
      } else {
        video.style.zIndex = "100";
        canvas.style.zIndex = "99";
      }
    };
    threejsRender();
    poseRender();
    setInterval(() => {
      slamWorker.postMessage({operation: "keyframes"});
    }, 2000);
  }
}