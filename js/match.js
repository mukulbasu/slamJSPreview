let debugFile = "debug";
const fetchData = async (debugFile, search) => {
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
    return resp[0][key];
}

const Line = (obj) => {
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    for(prop in obj) {
        line.setAttribute(prop, obj[prop])  
    }
    return line;
}
let lastLineNode = null;
let lastMatch = null;
const INLIER_COLOR = 'rgb(0,255,0)';
const INLIER_COLOR_HIGHLIGHT = 'rgb(0,128,255)';
const OUTLIER_COLOR = 'rgb(255, 128, 0)';
const OUTLIER_COLOR_HIGHLIGHT = 'rgb(255, 0, 0)';
let matchIndex = 0;
let width = 0;
let height = 0;

const getColor = (match) => match.INLIER == "1"? INLIER_COLOR : OUTLIER_COLOR;
const getColorHighlight = (match) => match.INLIER == "1"? INLIER_COLOR_HIGHLIGHT : OUTLIER_COLOR_HIGHLIGHT;

const fetchInlierComputes = async (match) => {
    let inlierCompute1, inlierCompute2;
    const inlierComputes = await fetchData(debugFile, "COMPUTE_INLIER_MATCH:POSE_FID="+match.POSE_FID+";RID="+match.RID+";LID="+match.LID);
    console.log("inlierComputes", inlierComputes);
    inlierComputes.forEach(inlierCompute => {
        if (match.FPID1 == inlierCompute.FPID && match.FID1 == inlierCompute.FID) {
            inlierCompute1 = inlierCompute;
        } else if (match.FPID2 == inlierCompute.FPID && match.FID2 == inlierCompute.FID) {
            inlierCompute2 = inlierCompute;
        }
    })
    return [inlierCompute1, inlierCompute2];
}

const updateMatchDetails = async (match) => {
    const [inlierCompute1, inlierCompute2] = await fetchInlierComputes(match);
    
    document.getElementById("LID").innerHTML = match.LID;
    document.getElementById("KPTrans").innerHTML = 
        inlierCompute1?inlierCompute1.KPX+", "+inlierCompute1.KPY+", "+inlierCompute1.KPZ:"NONE";

    const details1 = {
        FID: match.FID1,
        FPID: match.FPID1,
        Inlier: inlierCompute1?inlierCompute1.INLIER == "1"? "YES":"NO":"-",
        Reason: inlierCompute1?inlierCompute1.REASON:"NA",
        X: inlierCompute1?inlierCompute1.X+", "+inlierCompute1.PX:"NONE",
        Y: inlierCompute1?inlierCompute1.Y+", "+inlierCompute1.PY:"NONE",
    }
    
    const match1 = document.getElementById("Match1");
    for (const key in details1) {
        match1.getElementsByClassName(key)[0].innerHTML = details1[key];
    }
    const details2 = {
        FID: match.FID2,
        FPID: match.FPID2,
        Inlier: inlierCompute2?inlierCompute2.INLIER == "1"? "YES":"NO":"-",
        Reason: inlierCompute2?inlierCompute2.REASON:"NA",
        X: inlierCompute2?inlierCompute2.X+", "+inlierCompute2.PX:"NONE",
        Y: inlierCompute2?inlierCompute2.Y+", "+inlierCompute2.PY:"NONE",
    }
    const match2 = document.getElementById("Match2");
    for (const key in details2) {
        match2.getElementsByClassName(key)[0].innerHTML = details2[key];
    }
}

const updatePoseDetails = (match) => {
    if (match.TX1) {
        document.getElementById("PoseTrans1").innerHTML = match.FID1+": "+match.TX1+", "+match.TY1+", "+match.TZ1;
        document.getElementById("PoseRot1").innerHTML = match.FID1+": "+match.RX1+", "+match.RY1+", "+match.RZ1;
    } else {
        document.getElementById("PoseTrans1").innerHTML = match.FID1+": None";
        document.getElementById("PoseRot1").innerHTML = match.FID1+": None";
    }

    if (match.TX2) {
        document.getElementById("PoseTrans2").innerHTML = match.FID2+": "+match.TX2+", "+match.TY2+", "+match.TZ2;
        document.getElementById("PoseRot2").innerHTML = match.FID2+": "+match.RX2+", "+match.RY2+", "+match.RZ2;
    } else {
        document.getElementById("PoseTrans2").innerHTML = match.FID2+": None";
        document.getElementById("PoseRot2").innerHTML = match.FID2+": None";
    }
}

const drawMatches = async (poseFrame, frame1, frame2, frameMatchDetail) => {
    const matchTypeNode = document.getElementById("MatchType");
    let matchType = matchTypeNode.value;
    if (matchType === "RANSAC_MATCH:") matchType = "RANSAC_MATCH:RID="+frameMatchDetail.RID+";";
    const matches = await fetchData(debugFile, matchType+"POSE_FID="+poseFrame+";FID1="+frame1+";FID2="+frame2);
    const matchNode = document.getElementById("DrawWindow");
    matchNode.innerHTML = '';
    const templateLineNode = document.getElementById("TemplateLine");
    let count = 0, inlierCount = 0, outlierCount = 0;
    matches.forEach(match => {
        if (match.START) {
            updatePoseDetails(match);
            return;
        }
        if (match.END) return;
        const lineNode = Line({
            'width': 0,
            'height': 0,
            'x1': Number(match.X1)+width/2,
            'y1': Number(match.Y1)+height/2,
            'x2': Number(match.X2)+width*1.5,
            'y2': Number(match.Y2)+height/2,
            'stroke': getColor(match),
            'stroke-width': 2,
            'class': 'showLine',
        });
        const hiddenLineNode = Line({
            'width': 0,
            'height': 0,
            'x1': Number(match.X1)+width/2,
            'y1': Number(match.Y1)+height/2,
            'x2': Number(match.X2)+width*1.5,
            'y2': Number(match.Y2)+height/2,
            'stroke': 'rgb(255,128,0)',
            'stroke-width': 10,
            'stroke-opacity': '0.0',
            'class': 'hiddenLine'
        });
        matchNode.appendChild(lineNode);
        matchNode.appendChild(hiddenLineNode);
        hiddenLineNode.onclick = event => {
            console.log("Clicked on line", match.LID, match);
            if (null != lastLineNode) lastLineNode.setAttribute('stroke', getColor(lastMatch));
            lineNode.setAttribute('stroke', getColorHighlight(match));
            lastLineNode = lineNode;
            lastMatch = match;
            updateMatchDetails(match);
        };
        if (count == 0) hiddenLineNode.onclick();
        if (match.INLIER == "1") inlierCount++;
        else outlierCount++;
        count++;
    })

    document.getElementById("InlierCount").innerHTML = inlierCount;
    document.getElementById("OutlierCount").innerHTML = outlierCount;
    document.getElementById("TotalCount").innerHTML = count;
}

const showFrames = async (frame1, frame2) => {
    document.getElementById("Img1").src=await fetchDataKey(debugFile, "FRAME_PATH:FID="+frame1, "PATH");
    document.getElementById("Img2").src=await fetchDataKey(debugFile, "FRAME_PATH:FID="+frame2, "PATH");
    // document.getElementById("Img2").src="/data/data4/image1.png";
}

let delayFrameShow = null;
const onFrameSelected = async (frameMatchDetail) => {
    const poseFrame = Number(frameMatchDetail.POSE_FID);
    const frame1 = Number(frameMatchDetail.FID1);
    const frame2 = Number(frameMatchDetail.FID2);
    const ransacSelected = frameMatchDetail.RID;
    document.getElementById("RID").innerHTML = ransacSelected;
    document.getElementById("VALID").innerHTML = frameMatchDetail.VALID == "0"? "INVALID": "VALID";


    document.getElementById("PoseFrame").innerHTML = poseFrame;
    document.getElementById("Frame1").innerHTML = frame1;
    document.getElementById("Frame2").innerHTML = frame2;
    console.log("Frame1, Frame2", poseFrame, frame1, frame2);

    if (null != delayFrameShow) {
        clearTimeout(delayFrameShow);
        delayFrameShow = null;
    }
    delayFrameShow = setTimeout(async () => {
        await showFrames(frame1, frame2);
        await drawMatches(poseFrame, frame1, frame2, frameMatchDetail);
    }, 500);
}

const getMatchIndex = (matchIndex, prevFrameMatchDetails, newFrameMatchDetails) => {
    let newMatchIndex = 0;
    const poseFrame = prevFrameMatchDetails[matchIndex].POSE_FID;
    const frame1 = prevFrameMatchDetails[matchIndex].FID1;
    const frame2 = prevFrameMatchDetails[matchIndex].FID2;
    let poseFrameMatch = -1, frame1Match = -1, frame2Match = -1;
    for (newMatchIndex = 0; newMatchIndex < newFrameMatchDetails.length; newMatchIndex++) {
        if (poseFrame === newFrameMatchDetails[newMatchIndex].POSE_FID) {
            console.log("Found pose frame match");
            if (poseFrameMatch == -1) poseFrameMatch = newMatchIndex;
            if (frame1 === newFrameMatchDetails[newMatchIndex].FID1) {
                console.log("Found frame1 match");
                if (frame1Match == -1) frame1Match = newMatchIndex;
                if (frame2 === newFrameMatchDetails[newMatchIndex].FID2) {
                    console.log("Found frame2 match");
                    return newMatchIndex;
                }
            }
        } else {
            continue;
        }
    }
    if (poseFrameMatch != -1) {
        if (frame1Match != -1) {
            return frame1Match;
        } else return poseFrameMatch;
    } 
    return 0;
} 

let prevFrameMatchDetails = null;
let landmarkIndex = 0;

const onMatchTypeSelected = async () => {
    // const matchTypeNode = document.getElementById("MatchType");
    // const matchType = matchTypeNode.value;
    const frameMatchDetails = await fetchData(debugFile, "MATCH_SUMMARY:");
    // if (null == prevFrameMatchDetails) {
    //     matchIndex = 0;
    // } else {
    //     matchIndex = getMatchIndex(matchIndex, prevFrameMatchDetails, frameMatchDetails);
    // }
    // prevFrameMatchDetails = frameMatchDetails;
    console.log("Frame Details", frameMatchDetails);
    
    document.getElementById("NextMatch").onclick = (ev) => {
        matchIndex++;
        if (matchIndex >= frameMatchDetails.length) matchIndex = 0;
        console.log("Match Index", matchIndex);
        onFrameSelected(frameMatchDetails[matchIndex]);
    }
    document.getElementById("PrevMatch").onclick = (ev) => {
        matchIndex--;
        if (matchIndex < 0 ) matchIndex = frameMatchDetails.length-1;
        console.log("Match Index", matchIndex);
        onFrameSelected(frameMatchDetails[matchIndex]);
    }
    landmarkIndex = 0;
    document.onkeydown = (e) => {
        e = e || window.event;
        console.log("Key ", e.key);
        if (e.key === "ArrowLeft") {
            document.getElementById("PrevMatch").onclick();
        } else if (e.key === "ArrowRight") {
            document.getElementById("NextMatch").onclick();
        } else if (e.key === "ArrowUp") {
            // up arrow
            const lines = document.getElementsByClassName("hiddenLine");
            landmarkIndex--;
            if (landmarkIndex < 0) landmarkIndex = lines.length - 1;
            lines[landmarkIndex].onclick();
        } else if (e.key === "ArrowDown") {
            // down arrow
            const lines = document.getElementsByClassName("hiddenLine");
            landmarkIndex++;
            if (landmarkIndex >= lines.length) landmarkIndex = 0;
            lines[landmarkIndex].onclick();
        } else if (e.key === "r" && e.key.length == 1) {
            document.getElementById("MatchType").value = "ALLMATCHES_RECOMPUTE:RID=.*;";
            onMatchTypeSelected();
        } else if (e.key === "f" && e.key.length == 1) {
            document.getElementById("MatchType").value = "ALLMATCHES_FINAL:RID=.*;";
            onMatchTypeSelected();
        } else if (e.key === "i" && e.key.length == 1) {
            document.getElementById("MatchType").value = "ALLMATCHES_INIT:RID=.*;";
            onMatchTypeSelected();
        }
    }
    onFrameSelected(frameMatchDetails[matchIndex]);
}

document.addEventListener("DOMContentLoaded", async function(event) {
    // const response = await fetch('/debug/debug/ALLMATCHES:CURRFID=1,INLIER=1');
    const limits = await fetchData(debugFile, "LIMITS:")
    
    const start = Number(limits[0].START);
    const end = Number(limits[0].END);
    console.log("Start, End", start, end);

    const dimsData = await fetchData(debugFile, "IMG_DIMS:");
    width = Number(dimsData[0].WIDTH);
    height = Number(dimsData[0].HEIGHT);
    console.log("Dimensions", width, height);

    const matchTypeNode = document.getElementById("MatchType");
    matchTypeNode.onchange = async (event) => {
        await onMatchTypeSelected();
    };
    matchTypeNode.onchange();
});