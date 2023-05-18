
THREE.DeviceOrientationControls = function( object ) {

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
  slamWorker.postMessage({operation: "addImage", imageData: imageData, alpha, beta, gamma});
  return imageData;
};

let scale = -1;
let distX = 0, velX = 0, countX = 0, avgDistX = 0;
let lastAccX = -1, accXs = [], imgs = [], edgeImgs = [], midImgs = [], initDists = [];

const storeImage = () => {
  startTime = Date.now();
  ctx.drawImage(srcVideo, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, width, height);
  imgs.push({ imageData, alpha, beta, gamma });
};

function handleAcceleration(event) {
  if (event.acceleration.x * lastAccX < 0) {
    let length = Math.round((accXs.length + 1)/2);
    length = length < 0? 0 : length;
    const accXs1 = accXs.slice(0, length);
    accXs1.forEach( acc => {
      velX += acc;
      distX += Math.abs(velX);
    });
    midImgs.push(imgs[0]);
    if (midImgs.length > 10) midImgs.shift();
    edgeImgs.push(imgs[length]);
    if (edgeImgs.length > 10) edgeImgs.shift();
    
    console.log("Dist total ", distX, ", ", avgDistX, ", ", accXs.length);
    if (distX > 500) {
      if (0 == avgDistX) {
        avgDistX = distX;
        countX = 1;
      // } else if (distX > minX && distX < maxX) {
      } else {
        avgDistX = avgDistX*0.8 + 0.2*distX;
        countX += 1;
      }
    }
    initDists.push(distX);

    // 3<---2<---1
    // --------->4
    // 5<---------
    // --------->6
    //Check if ready for initialization
    if (initDists.length > 6 && avgDistX > 500) {
      let totalDist = 0;
      let i = 0;
      for (; i < 6; i++) {
        const val = initDists[initDists.length - 1 - i];
        if (val > avgDistX * 1.4 || val < avgDistX * 0.6) break;
        totalDist += val;
      }
      if (i == 6) {
        //ready for initialization
        //extract 5 edge images and 1 mid image
        if (edgeImgs.length < 5) console.error("Not enough initImgs");
        if (midImgs.length < 5) console.error("Not enough midImgs");
        const initImgs = [];
        initImgs.push(midImgs[midImgs.length - 5]);
        initImgs.push(edgeImgs[edgeImgs.length - 5]);
        initImgs.push(edgeImgs[edgeImgs.length - 4]);
        initImgs.push(edgeImgs[edgeImgs.length - 3]);
        initImgs.push(edgeImgs[edgeImgs.length - 2]);
        initImgs.push(edgeImgs[edgeImgs.length - 1]);
        
        totalDist = totalDist/100;
        slamWorker.postMessage({operation: "initializeMap", initImgs, totalDist});
        window.removeEventListener("devicemotion", handleAcceleration);
        document.getElementById("status").innerHTML = "Initializing";
      }
    }

    distX = 0;
    velX = 0;
    const accXs2 = accXs.slice(length);
    accXs2.forEach(acc => {
      velX += acc;
      distX += Math.abs(velX);
    });
    accXs = [];
    imgs = [];
  }
  accXs.push(event.acceleration.x);
  storeImage();

  if (event.acceleration.x != 0) lastAccX = event.acceleration.x;

  // console.log("Values :", trim(event.acceleration.x), ", ", alpha);
}


const startVideo = (mediaStream) => {
  console.log("Got the web cam stream");
  srcVideo.srcObject = mediaStream;

  let startTime = Date.now();
  slamWorker.postMessage({operation: "start", width, height});

  window.addEventListener("deviceorientation", handleOrientation);
  window.addEventListener("devicemotion", handleAcceleration);
};


const threejsRender = () => {
  const threejsContainer = document.getElementById("threejs-container");
  threejsWidth = threejsContainer.offsetWidth;
  threejsHeight = threejsContainer.offsetHeight;
  console.log(threejsWidth, threejsHeight);
  // scene
  const scene = new THREE.Scene();
  // camera
  camera = new THREE.PerspectiveCamera(30, threejsWidth / threejsHeight, 0.1, 1000);
  camera.position.set(0, 0, 0);
  deviceOrientationControls = new THREE.DeviceOrientationControls(camera);

  // Light
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);
  const pointLight = new THREE.PointLight(0xffffff, 0.2);
  pointLight.position.x = 2;
  pointLight.position.y = 3;
  pointLight.position.z = 4;
  scene.add(pointLight);

  const geometry = new THREE.BoxGeometry( 2, 2, 2 ); 
  const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} ); 
  const cube = new THREE.Mesh( geometry, material ); 
  cube.position.set(0, -10, 50);
  // camera.lookAt(0, 0, 500);
  scene.add( cube );
  
  // responsiveness
  window.addEventListener('resize', () => {
    threejsWidth = threejsContainer.offsetWidth;
    threejsHeight = threejsContainer.offsetHeight;
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

console.log("Initializing");
const dummy = () => {}

const slamWorker = new Worker("js/slamWorker.js");
let camX = 0, camY = 0, camZ = 0;
slamWorker.onmessage = (e) => {
  if (e.data.operation === "translations") {
    const trans = e.data.translations;
    console.log("Translations: ", trans[0], trans[1], trans[2], ", ", Date.now() - startTime, "ms");
    document.getElementById("pose1").textContent = trim(trans[0]);
    document.getElementById("pose2").textContent = trim(trans[1]);
    document.getElementById("pose3").textContent = trim(trans[2]);
    const weight = 0.5;
    if (e.data.result == 0) {
      camX = (1 - weight) * camX - weight * Number(trans[0]);
      camY = (1 - weight) * camY - weight * Number(trans[2]);
      camZ = (1 - weight) * camZ + weight * Number(trans[1]);
      document.getElementById("pose1s").textContent = camX;
      document.getElementById("pose2s").textContent = camY;
      document.getElementById("pose3s").textContent = camZ;
      camera.position.set(camX, camY, camZ);
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
  }
}