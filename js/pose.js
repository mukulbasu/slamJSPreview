import * as threeD from '/js/threeD.js';

let debugFile = window.location.hash === ""?"debug":window.location.hash.split("#")[1];
console.log("DebugFile ", window.location.hash, debugFile);

const fetchData = async (debugFile, search) => {
    console.log("Search", search);
    const response = await fetch('/debug/'+debugFile+'/'+search);
    const respJson = await response.json();
    console.log(respJson);
    const resp = respJson.lines.map((line) => {
        // console.log("Line ", line);
        const values = line.split(":");
        // console.log("Values", values);
        const name = values[0];
        const result = {name};
        values[1].split(";").forEach(value => {
            const list = value.split("=");
            result[list[0]] = list[1];
        });
        return result;
    })
    return resp;
}

const fetchDataKey = async (debugFile, search, key) => {
    const resp = await fetchData(debugFile, search);
    console.log("RESP", resp);
    return resp.length>0?resp[0][key]:"None";
}

const Circle = (obj) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    for(const prop in obj) {
        circle.setAttribute(prop, obj[prop]);
    }
    return circle;
}
let lastCircleNode = null;
let lastKp = null;
const INLIER_COLOR = 'rgb(0,255,0)';
const INLIER_COLOR_HIGHLIGHT = 'rgb(0,128,255)';
const OUTLIER_COLOR = 'rgb(255,128,0)';
const OUTLIER_COLOR_HIGHLIGHT = 'rgb(255,0,0)';
let frameIndex = 0;
let width = 0;
let height = 0;
let landmarkFrames = [];

let landmarkIndex = 0;
const compare = ( a, b ) => {
    if ( Number(a) < Number(b)){
        return -1;
    }
    if ( Number(a) > Number(b)){
        return 1;
    }
    return 0;
}

const getColor = (kp, highlight) => {
    if (kp.INLIER === "1") 
        if (highlight) return INLIER_COLOR_HIGHLIGHT;
        else return INLIER_COLOR;
    else
        if (highlight) return OUTLIER_COLOR_HIGHLIGHT;
        else return OUTLIER_COLOR;
}

const getWidth = (kp) => kp.FIXED == "1"||Number(kp.SIZE) > 3? 3:1;

const drawKeypoints = async (poseFrame, fid, rid, kpId = "-1", frameDetails) => {

    clearCompare();
    const RID = rid == "-1"? "0" : rid;
    const kpDetails = await fetchData(debugFile, "COMPUTE_INLIER_POSE:POSE_FID="+poseFrame+";RID="+ RID +";.*FID="+fid+";");
    console.log("KP Details", kpDetails);
    const drawNode = document.getElementById("DrawWindow");
    drawNode.innerHTML = '';
    
    let count = 0;
    let inlierCount = 0;
    kpDetails.forEach(kp => {
        const circleNode = Circle({
            'cx': Number(kp.X) + width/2,
            'cy': Number(kp.Y) + height/2,
            'r': 15,
            'stroke': getColor(kp, false),
            'stroke-width': getWidth(kp),
            'fill-opacity': 0.1,
            'class': 'showCircle',
        });
        drawNode.appendChild(circleNode);
        circleNode.onclick = event => {
            clearCompare();
            console.log("Clicked on Landmark:", kp.LID, "; KP index", kp.FPID);
            if (null != lastCircleNode) {
                lastCircleNode.setAttribute('stroke', getColor(lastKp, false));
                lastCircleNode.setAttribute('fill-opacity', 0.1);
            }
            circleNode.setAttribute('stroke', getColor(kp, true));
            circleNode.setAttribute('fill-opacity', 0.4);
            lastCircleNode = circleNode;
            lastKp = kp;
                    
            document.getElementById("LID").innerHTML = kp.LID;
            document.getElementById("KPID").innerHTML = kp.FPID;
            document.getElementById("Distance").innerHTML = Math.round(100 * Math.sqrt(Math.pow(Number(kp.KPX), 2)+Math.pow(Number(kp.KPY), 2)+Math.pow(Number(kp.KPZ), 2)))/100;
            document.getElementById("KPTrans").innerHTML = kp.KPX+", "+kp.KPY+", "+kp.KPZ;
            document.getElementById("KPXY").innerHTML = kp.X+", "+kp.Y;
            document.getElementById("PXY").innerHTML = kp.PX+", "+kp.PY;
            document.getElementById("INLIER").innerHTML = kp.INLIER;
            document.getElementById("REASON").innerHTML = kp.REASON;
            document.getElementById("FRAMES").innerHTML = kp.FRAMES.split(",").map(ele => ele.split("_")[0]).filter(ele => ele !== "").sort((a, b) => Number(a)-Number(b)).join(", ");
            landmarkFrames = kp.FRAMES.replace(/(^,)|(,$)/g, "").split(",").sort(compare);


            document.getElementById("thisFrameId").innerHTML = kp.FID;
            document.getElementById("thisFpId").innerHTML = kpId;
            document.getElementById("thisLId").innerHTML = kp.LID;

            threeD.renderLandmarks(kpDetails, kp.LID, frameDetails);
            if (slideShowInterval) startSlideShow();
        };
        if (kpId === "-1") {
            if (count == 0) circleNode.onclick();
        } else {
            if (kpId === kp.FPID) circleNode.onclick();
        }
        if (kp.INLIER == "1") inlierCount++;
        count++;
    })

    document.getElementById("INLIERCNT").innerHTML = inlierCount;
    document.getElementById("TOTALCNT").innerHTML = count;
}

let delayFrameShow = null;
const onFrameSelected = async (frameDetails, originFrames, kpId = "-1") => {
    document.getElementById("PoseFrame").innerHTML = frameDetails.FID;
    document.getElementById("RID").innerHTML = frameDetails.RID;
    document.getElementById("PoseDistance").innerHTML = Math.round(100 * Math.sqrt(Math.pow(Number(frameDetails.TX), 2)+Math.pow(Number(frameDetails.TY), 2)+Math.pow(Number(frameDetails.TZ), 2)))/100;;
    document.getElementById("PoseTrans").innerHTML = frameDetails.TX+", "+frameDetails.TY+", "+frameDetails.TZ;
    document.getElementById("PoseRot").innerHTML = frameDetails.RX+", "+frameDetails.RY+", "+frameDetails.RZ;

    if (null != delayFrameShow) {
        clearTimeout(delayFrameShow);
        delayFrameShow = null;
    }
    const filtered = originFrames.filter(originFrame => originFrame.POSE_FID === frameDetails.POSE_FID && originFrame.FID === frameDetails.FID);
    const originFrame = filtered.length > 0 ? filtered[0] : originFrames[0];
    delayFrameShow = setTimeout(async () => {
        threeD.render(frames, originFrame, Number(frameDetails.FID));
        fetchDataKey(debugFile, "FRAME_PATH:FID="+frameDetails.FID+";", "PATH").then((link) => document.getElementById("Img").src=link);
        fetchDataKey(debugFile, "POSE_TIME:POSE_FID="+frameDetails.FID+";", "TIME").then(time => document.getElementById("PoseTime").innerHTML=time)
        await drawKeypoints(frameDetails.POSE_FID, frameDetails.FID, frameDetails.RID, kpId, frameDetails);
    }, 500);
}

let lastCompareCircle = undefined;
const clearCompare = () => {
    const drawNode = document.getElementById("DrawWindow");
    try {
        const del = [].slice.call(drawNode.children).filter(ele => ele.className.baseVal == "compareCircle");
        del.forEach(ele => drawNode.removeChild(ele));
    } catch (err) {}
}

const onCompareSelected = async (frameDetails, kpId, x, y) => {
    clearCompare();
    document.getElementById("compareFrameId").innerHTML = frameDetails.FID;
    document.getElementById("compareFpId").innerHTML = kpId;

    fetchDataKey(debugFile, "FRAME_PATH:FID="+frameDetails.FID+";", "PATH").then((link) => document.getElementById("ImgOrigin").src=link);
    const kpDetails = await fetchData(debugFile, "COMPUTE_INLIER_POSE:POSE_FID="+frameDetails.POSE_FID+";RID="+ frameDetails.RID +";.*FPID="+kpId+";FID="+frameDetails.FID+";");
    console.log("KP Details", kpDetails);
    let kp;
    if (kpDetails.length == 0) {
        document.getElementById("compareLId").innerHTML = "WAS NOT FOUND IN POSE";
        kp = {X: x, Y: y};
    } else {
        kp = kpDetails[0];
        document.getElementById("compareLId").innerHTML = kp.LID;
    }

    const drawNode = document.getElementById("DrawWindow");
    const circleNode = Circle({
        'cx': Number(kp.X) + 3*width/2,
        'cy': Number(kp.Y) + height/2,
        'r': 15,
        'stroke': getColor(kp, true),
        'stroke-width': getWidth(kp),
        'fill-opacity': 0.1,
        'class': 'compareCircle',
    });
    drawNode.appendChild(circleNode);
    lastCompareCircle = circleNode;
}

const showOrigin = () => {
    clearCompare();
    document.getElementById("ImgOrigin").src=originPath;
    document.getElementById("compareFrameId").innerHTML = originFrameId;
    document.getElementById("compareFpId").innerHTML = "";
    document.getElementById("compareLId").innerHTML = "";
}

let landmarkFrameIndex = 0;
const compareNext = (isNext) => {
    if (isNext) {
        landmarkFrameIndex = landmarkFrameIndex+1;
        if (landmarkFrameIndex >= landmarkFrames.length) landmarkFrameIndex = 0;
    } else {
        landmarkFrameIndex = landmarkFrameIndex-1;
        if (landmarkFrameIndex < 0) landmarkFrameIndex = landmarkFrames.length - 1;
    }

    const landmarkFrame = landmarkFrames[landmarkFrameIndex];
    const values = landmarkFrame.split("_");
    const frameId = values[0];
    const kpId = values[1];
    const x = values[2], y = values[3];
    for (let j = 0; j < frames.length; j++) {
        if (frames[j].FID === frameId) {
            onCompareSelected(frames[j], kpId, x, y);
            break;
        }
    }
}

const stopSlideShow = () => {
    if (slideShowInterval) clearInterval(slideShowInterval);
    slideShowInterval = undefined;
}

const startSlideShow = () => {
    stopSlideShow();
    slideShowInterval = setInterval(() => compareNext(true), 2000);
    compareNext(true);
}

let frames, originFrameId;
let originPath = undefined;
let slideShowInterval = undefined;
const start = async () => {
    frames = await fetchData(debugFile, "FRAME_POSE:")
    frames.sort((a, b) => {
        const diff = Number(a.POSE_FID) - Number(b.POSE_FID);
        if (diff != 0) return diff;
        else return Number(a.FID) - Number(b.FID);
    })
    console.log("Frames", frames);
    threeD.renderStart();

    const dimsData = await fetchData(debugFile, "IMG_DIMS:");
    width = Number(dimsData[0].WIDTH);
    height = Number(dimsData[0].HEIGHT);
    console.log("Dimensions", width, height);
    
    const originFrames = await fetchData(debugFile, "FRAME_ORIGIN:");
    console.log("origin frame ", originFrames);
    if (originFrames.length == 0) {
        document.getElementById("NotInitialized").style.visibility = 'visible';
        return;
    } else {
        originFrameId = Number(originFrames[0].OID);
        document.getElementById("OriginFrameId").innerHTML = originFrameId;
        fetchDataKey(debugFile, "FRAME_PATH:FID="+originFrameId+";", "PATH").then((link) => {
            originPath = link;
            document.getElementById("ImgOrigin").src=link;
        });
    }

    document.getElementById("NextFrame").onclick = (ev) => {
        frameIndex++;
        if (frameIndex >= frames.length) frameIndex = 0;
        console.log("Frame Index", frameIndex);
        onFrameSelected(frames[frameIndex], originFrames);
    }
    document.getElementById("PrevFrame").onclick = (ev) => {
        frameIndex--;
        if (frameIndex < 0 ) frameIndex = frames.length-1;
        console.log("Frame Index", frameIndex);
        onFrameSelected(frames[frameIndex], originFrames);
    }
    landmarkIndex = 0;
    document.onkeydown = (e) => {
        e = e || window.event;
        console.log("Key ", e.key);
        if (e.key === "ArrowLeft") {
            document.getElementById("PrevFrame").onclick();
        } else if (e.key === "ArrowRight") {
            document.getElementById("NextFrame").onclick();
        } else if (e.key === "ArrowUp") {
            // up arrow
            const circles = document.getElementsByClassName("showCircle");
            landmarkIndex--;
            if (landmarkIndex < 0) landmarkIndex = circles.length - 1;
            circles[landmarkIndex].onclick();
        } else if (e.key === "ArrowDown") {
            // down arrow
            const circles = document.getElementsByClassName("showCircle");
            landmarkIndex++;
            if (landmarkIndex >= circles.length) landmarkIndex = 0;
            circles[landmarkIndex].onclick();
        } else if ((e.key === "n" || e.key === 'p') && e.key.length == 1) {
            stopSlideShow();
            compareNext(e.key === 'n');
        } else if ((e.key === "o") && e.key.length == 1) {
            stopSlideShow();
            showOrigin();
        } else if ((e.key === "s") && e.key.length == 1) {
            if (slideShowInterval) stopSlideShow();
            else startSlideShow();
        }
    }
    onFrameSelected(frames[frameIndex], originFrames);
};

document.addEventListener("DOMContentLoaded", async function(event) {
    const fname = document.getElementById("fname");
    fname.onchange = () => {
        console.log("fname change triggered ", fname.value);
        if (fname.value === "") debugFile = "debug";
        else debugFile = fname.value;
        window.location.hash = "#"+debugFile;
        console.log("Debug file is now ", debugFile);
        start();
    }
    
    start();
});