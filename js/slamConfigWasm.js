
const pathStart = 0;
const pathEnd = 75;
const dataFolder = "data17";
const fileExtension = "png";

const width = 480;
const height = 640;
const ratio = (width / 480);
const focus = 250 * ratio;//200 also works good
const baRegular = {
    pathStart: pathStart.toString(),
    pathEnd: pathEnd.toString(),//190",
    scale: "20",

    preInitFrameBaOption: "1",
    preInitFrameInlierRange: (10 * ratio).toString(),
    preInitFrameGoodFrameRatio: "1.0",
    preInitFrameGoodLandmarkRatio: "0.7",
    preInitFrameCurrFrameGoodLandmarkRatio: "0.7",
    preInitFrameMinGoodLandmarks: "5",
    preInitFrameRansacMatches: "3",
    preInitFrameRansacIterations: "20",//2
    preInitFrameBAIterations: "7", //5
    preInitFrameLookForBest: "t",

    postInitFrameBaOption: "1",
    postInitFrameInlierRange: (10 * ratio).toString(),
    postInitFrameGoodFrameRatio: "1.0",
    postInitFrameGoodLandmarkRatio: "0.7",
    postInitFrameCurrFrameGoodLandmarkRatio: "0.7",
    postInitFrameMinGoodLandmarks: "5",
    postInitFrameRansacMatches: "5",
    postInitFrameRansacIterations: "5",//2
    postInitFrameBAIterations: "7", //5
    postInitFrameLookForBest: "t",

    preInitBABaOption: "1",
    preInitBAInlierRange: (10 * ratio).toString(),
    preInitBAGoodFrameRatio: "1.0",
    preInitBAGoodLandmarkRatio: "0.7",
    preInitBACurrFrameGoodLandmarkRatio: "0.6",
    preInitBAMinGoodLandmarks: "10",
    preInitBARansacMatches: "30", // 10
    preInitBARansacIterations: "10", // 20
    preInitBABAIterations: "30",
    preInitBALookForBest: "t",

    postInitBABaOption: "1",
    postInitBAInlierRange: (10 * ratio).toString(),
    postInitBAGoodFrameRatio: "0.7",//1
    postInitBAGoodLandmarkRatio: "0.70",
    postInitBACurrFrameGoodLandmarkRatio: "0.60",
    postInitBAMinGoodLandmarks: "10",
    postInitBARansacMatches: "30",
    postInitBARansacIterations: "1", //5
    postInitBABAIterations: "10", //30
    postInitBALookForBest: "t",

    newKeyframeBABaOption: "1",
    newKeyframeBAInlierRange: (10 * ratio).toString(),
    newKeyframeBAGoodFrameRatio: "0.5",//1
    newKeyframeBAGoodLandmarkRatio: "0.5",
    newKeyframeBACurrFrameGoodLandmarkRatio: "0.4",
    newKeyframeBAMinGoodLandmarks: "10",
    newKeyframeBARansacMatches: "30",
    newKeyframeBARansacIterations: "1", //5
    newKeyframeBABAIterations: "2", //30
    newKeyframeBALookForBest: "t",

    focusBaOption: "0",
    focusInlierRange: (15 * ratio).toString(),
    focusGoodFrameRatio: "1.0",
    focusGoodLandmarkRatio: "0.5",
    focusCurrFrameGoodLandmarkRatio: "0.0",
    focusMinGoodLandmarks: "10",
    focusRansacMatches: "20",      //50,
    focusRansacIterations: "10",
    focusBAIterations: "20",
    focusLookForBest: "t",
}


const SlamConfig = {
    cx: (240*ratio).toString(),
    cy: (317*ratio).toString(),
    fx: focus.toString(),
    fy: focus.toString(),
    maxDepth: "75",
    // cout<<"Initializing"<<endl;
    setEstimate: "t",

    matchHierarchy: "t",
    leafSize: "27",
    branchSize: "3",
    treeSize: "3",

    rot1: "2",
    rot2: "0",
    rot3: "1",
    rotSignX: "1",
    rotSignY: "-1",
    rotSignZ: "-1",
    xCorrection: "0",
    yCorrection: "0",
    zCorrection: "90",

    reqdKpsInit: "500",
    binRowsInit: "8",
    binColsInit: "8",
    reqdKpsPerBinInit: "30",
    overlapInit: "0.8",
    optimizeDescInit: "t",

    reqdKps: "300",
    binRows: "8",
    binCols: "8",
    reqdKpsPerBin: "50",
    overlap: "0.8",
    optimizeDesc: "t",

    maxGap: (300 * ratio).toString(), //300
    minGap: "3",
    distanceThreshold: "64",
    distanceThresholdPoseInitialized: "54",
    ratio: "0.7",
    matchOnlyRelevant: "t",
    logRejectReasons: "f",

    ...baRegular,
    validFrameThreshold: "6",
    validLandmarkThreshold: "2",
    highConfidenceLandmarkThreshold: "4",
    highConfidenceFrameThreshold: "3",

    slamStart: "2",
    maxFrames: "20",
    mapInitializationFrames: "6",
    minFrameMatches: "10",
    maxFrameMatches: "30",//30
    numKeyFrameMatches: "2",//3
    validKeyFrameCount: "5",
    maxDistRatio: "0.2",
    maxAngle: "30",
    copyRotation: "t",
    findFocus: "f",
    normalizeKP: "t",
    prevFramesToo: "f",
    unfixKeyframes: "t",
    inverse1: "f",
    inverse2: "f",
    inverse3: "f",
    rotationConjugate: "0",
    debugFrameId: "-1",
    disableRotationInput: "f",
    rotateBeforeMatchValidation: "t",
    newKeyframesBA: "f",
    cholmod: "t", //Set to f for using Eigen. This seems to optimize time without any impact on accuracy.

    //May be need to be deleted

    paths: [
        "0", "-14", "10",
    ],
    rots: ["45", "0", "0"],
    poseTrans: ["0", "-4", "0"],
    fileExtension,
    path: "data/" + dataFolder + "/image",
    orient: "data/" + dataFolder + "/orient",
};
