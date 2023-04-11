
const getOrientation = () => {
  const orientation = window.orientation;
  {
    switch(orientation) {
      case 0: return 0;
      case 90: return 90;
      case 180: return 180;
      case -90: return -90;
      default: return 0;
    }
  }

  if (screen.orientation) {
    const type = screen.orientation.type;
    switch (type) {
      case "portrait-primary":
        console.log("Portrait Primary");
        return 0;
      case "landscape-primary":
        console.log("Landscape Primary.");
        return 90;
      case "portrait-secondary":
        console.log("Portrait Secondary");
        return 180;
      case "landscape-secondary":
        console.log("Landscape Secondary");
        return -90;
      default:
        console.log("The orientation API isn't supported in this browser :(");
        return 0;
    }
  }
  return 0;
}

let run = false;
let count = 0;
let orient = "";

const startVideo = (mediaStream) => {
  console.log("Got the web cam stream");
  const srcVideo = document.querySelector("#srcVideo");
  srcVideo.srcObject = mediaStream;
  const canvas = document.querySelector("#canvasVideo");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const sendImage = () => {
    const orientation = getOrientation();
    // console.log("Orientation is ", orientation);
    if (orientation == 90 || orientation == -90) {
      canvas.width = 640;
      canvas.height = 480;
    } else {
      canvas.width = 480;
      canvas.height = 640;
    }
    ctx.translate(canvas.width/2,canvas.height/2);
    ctx.rotate(orientation*Math.PI/180);
    ctx.drawImage(srcVideo, -canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
    // const photo = canvas.toDataURL('image/png');

    canvas.toBlob(function(blob) {
      const formData = new FormData();
      formData.append('filetoupload', blob, 'image'+count+'.png');
      axios.post('/uploadForm', formData);

      const orientData = new FormData();
      const textblob = new Blob([orient], {type : 'text/plain'})
      orientData.append('filetoupload', textblob, 'orient'+count+'.txt');
      axios.post('/uploadForm', orientData);

      count++;
    }, 'image/png', 0.7);
    if (run) setTimeout(sendImage, 2000);
  };

  const stopVideo = () => {
    console.log("Stopping");
    if (run == false) return;
    run = false;
  };

  document.querySelector("#start").onclick = () => {
    console.log("Starting");
    if (run == true) return;
    run = true;
    sendImage();
    // setTimeout(stopVideo, 20000);
  };

  document.querySelector("#stop").onclick = stopVideo;
};

 const onReady = () => {
  // navigator.mediaDevices.getUserMedia({ video: true }).then((mediaStream) => {
  navigator.mediaDevices.getUserMedia(
    {audio: false, video: {facingMode:{exact: "environment"}}}
  ).then(startVideo)
  .catch((error) => {
    console.error("ERROR, could not start back facing camera. Trying front facing");
    navigator.mediaDevices.getUserMedia({ video: true }).then(startVideo);
  });
};

onReady();

const trim = (value) => Math.round(value*100)/100;
const handleOrientation = (event) => {
  if (run) {
    orient = trim(event.beta)+","+trim(event.gamma)+","+trim(event.alpha);
    // console.log(orient);
  }
}
window.addEventListener("deviceorientation", handleOrientation);
// window.addEventListener("devicemotion", handleAcceleration);