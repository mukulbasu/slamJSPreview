let slam, imgBuffer;
let started = false;

var Module = {
  preRun: [],
  postRun: [],
  print: (function() {
    return function(text) {
      if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
      console.log(text);
      postMessage({operation: "print", text});
    };
  })(),
  setStatus: function(text) {
    if (!Module.setStatus.last) Module.setStatus.last = { time: Date.now(), text: '' };
    if (text === Module.setStatus.last.text) return;
    var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
    var now = Date.now();
    if (m && now - Module.setStatus.last.time < 30) return; // if this is a progress update, skip it if too soon
    Module.setStatus.last.time = now;
    Module.setStatus.last.text = text;
    if (m) {
      text = m[1];
      postMessage({operation: "status", complete: false, m, text});
    } else {
      postMessage({operation: "status", complete: true, text});
    }
  },
  totalDependencies: 0,
  monitorRunDependencies: function(left) {
    this.totalDependencies = Math.max(this.totalDependencies, left);
    Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
  }
};
Module.setStatus('Downloading...');

importScripts("/js/slam.js");

Module.onRuntimeInitialized = async (_) => {
  postMessage({operation: "module_ready"});
};

onmessage = (e) => {
  console.log("Message received from main script", e.data.operation);
  
  if (e.data.operation === "start") {
    console.log("Initializing Web worker");
    slam = Module._initialize(e.data.width, e.data.height, 30);
    console.log("Initialized SLAM: ", slam,". Creating buffer");
    imgBuffer = Module._create_image_buffer(e.data.width, e.data.height);
    console.log("Created buffer ", imgBuffer);
    started = true;
  } else if (e.data.operation === "initializeMap") {
    if (!started) {
      console.error("Initialize map called without starting");
      setTimeout(() => postMessage({operation: "translations", translations: [0, 0, 0]}), 500);
      return;
    }
    console.log("InitImgs ", e.data.initImgs);
    const startTime = Date.now();
    e.data.initImgs.forEach((initImg) => {
      const {imageData, alpha, beta, gamma} = initImg;
      Module.HEAP8.set(imageData.data, imgBuffer);
      console.log("Adding image");
      const result = Module._add_image(slam, imgBuffer, imageData.height, imageData.width, alpha, beta, gamma);
    });
    console.log("Initializing Map");
    const result = Module._initialize_map(slam, e.data.totalDist);
    console.log("Map Initialized ", result, Date.now() - startTime, "ms");
    if (result == 1) postMessage({operation: "initialized_map"});
    else postMessage({operation: "not_initialized_map"})
  } else if (e.data.operation === "addImage") {
    if (!started) {
      console.error("Add Image called without starting");
      setTimeout(() => postMessage({operation: "translations", translations: [0, 0, 0]}), 500);
      return;
    }
    const imageData = e.data.imageData;
    const {alpha, beta, gamma} = e.data;
    Module.HEAP8.set(imageData.data, imgBuffer);
    console.log("Adding image");
    const startTime = Date.now();
    const result = Module._add_image(slam, imgBuffer, imageData.height, imageData.width, alpha, beta, gamma);
    console.log("Translations Added image ", Date.now() - startTime, "ms");
    const translations = [Module._get_trans(slam, 0), Module._get_trans(slam, 1), Module._get_trans(slam, 2)];
    // console.log("Translations: ", Module._get_trans(slam, 0), Module._get_trans(slam, 1), Module._get_trans(slam, 2), "\n\n\n");
    postMessage({operation: "translations", translations, result});
  } else if (e.data.operation === "stop") {
    if (!started) {
      console.log("Already stopped");
      return;
    }
    console.log("Freeing buffer");
    Module._clear(imgBuffer);
    console.log("Freed buffer. Freeing Slam");
    Module._clear(slam);
    console.log("Freed slam");
    started = false;
  }
};