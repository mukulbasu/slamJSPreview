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
importScripts("/js/slamConfigWasm.js");

Module.onRuntimeInitialized = async (_) => {
  postMessage({operation: "module_ready"});
};

onmessage = (e) => {
  console.log("Message received from main script", e.data.operation);
  
  if (e.data.operation === "start") {
    console.log("Initializing Web worker");
    const cfgReader = Module._config_reader();
    const encoder = new TextEncoder();
    for (const key in SlamConfig) {
      console.log(key, SlamConfig[key]);
      const keyBytes = encoder.encode(key + '\0');
      const valBytes = encoder.encode(SlamConfig[key] + '\0');
      const keyPtr = Module._allocateMemory(keyBytes.length);
      const valPtr = Module._allocateMemory(valBytes.length);
      const keyMemory = new Uint8Array(wasmMemory.buffer, keyPtr, keyBytes.length);
      keyMemory.set(keyBytes);
      const valMemory = new Uint8Array(wasmMemory.buffer, valPtr, valBytes.length);
      valMemory.set(valBytes);
      Module._config_set(cfgReader, keyPtr, valPtr);
      Module._freeMemory(keyPtr);
      Module._freeMemory(valPtr);
    }
    slam = Module._initialize(cfgReader);
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
      const {imageData, x, y, z, order} = initImg;
      Module.HEAP8.set(imageData.data, imgBuffer);
      console.log("Adding image ", x, y, z, order);
      const result = Module._add_image(slam, imgBuffer, imageData.height, imageData.width, x, y, z);
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
    const {imageData, x, y, z, order} = e.data;
    Module.HEAP8.set(imageData.data, imgBuffer);
    console.log("Adding image");
    const startTime = Date.now();
    const result = Module._add_image(slam, imgBuffer, imageData.height, imageData.width, x, y, z);
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


  } else if (e.data.operation === "keyframes") {
    let index = 0;
    translations = [];
    while (true) {
      const trans0 = Module._get_keyframe_trans(slam, 0, index); 
      if (trans0 === -9999) break;
      const trans1 = Module._get_keyframe_trans(slam, 1, index);
      const trans2 = Module._get_keyframe_trans(slam, 2, index);
      translations.push([ trans0, trans1, trans2 ]);
      index++;
    }
    postMessage({operation: "keyframes", translations});
  }
};