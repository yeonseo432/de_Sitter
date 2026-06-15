(() => {
  "use strict";

  const COLORS = {
    A: "#5aa9ff",
    B: "#ffb15c",
    text: "#e7edf7",
    muted: "#9ba8bb",
    centerStar: "#d7dee9"
  };

  const SPECTRUM_LINE_WIDTH = 2;
  const SPECTRUM_HISTORY_SPAN = 1.4;
  const SPECTRUM_MAX_HISTORY = 420;
  const SPECTRUM_BASE_HALF_RANGE = 0.01;
  const SPECTRUM_MAX_RANGE_POWER = 3;
  const SPECTRUM_GRADIENT_COLORS = [
    "#4059ff",
    "#3cc4ff",
    "#56e06b",
    "#f3e35b",
    "#ff963b",
    "#e54242"
  ];

  const PHYS = {
    c: 1,
    period: 1,
    omega: 2 * Math.PI,
    beta: 0.001,
    visualWaveInterval: 0.045,
    launchWindow: 0.22,
    approachWindow: 0.30,
    spectralWaveInterval: 1 / 760,
    spectralCycles: 5,
    exposureWindow: 0.012
  };

  const VISUAL = {
    emissionInterval: 0.08,
    replayCycles: 2,
    maxLightsPerPanel: 45,
    dedupeTolerance: 0.004
  };

  const DEFAULTS = {
    A: { distLog: 2, k: 0 },
    B: { distLog: 2, k: 1 }
  };

  const state = {
    time: 0,
    speed: 0.5,
    spectrumRangePower: { A: 0, B: 0 },
    lastFrame: null,
    tutorialStep: 0,
    sims: {
      A: { ...DEFAULTS.A },
      B: { ...DEFAULTS.B }
    },
    spectrumData: { A: null, B: null },
    spectrumHistory: { A: [], B: [] }
  };

  const els = {
    simCanvasA: document.getElementById("simCanvasA"),
    simCanvasB: document.getElementById("simCanvasB"),
    spectrumCanvasA: document.getElementById("spectrumCanvasA"),
    spectrumCanvasB: document.getElementById("spectrumCanvasB"),
    distA: document.getElementById("distA"),
    distB: document.getElementById("distB"),
    kA: document.getElementById("kA"),
    kB: document.getElementById("kB"),
    distAOut: document.getElementById("distAOut"),
    distBOut: document.getElementById("distBOut"),
    kAOut: document.getElementById("kAOut"),
    kBOut: document.getElementById("kBOut"),
    summaryA: document.getElementById("summaryA"),
    summaryB: document.getElementById("summaryB"),
    spectrumSummaryA: document.getElementById("spectrumSummaryA"),
    spectrumSummaryB: document.getElementById("spectrumSummaryB"),
    speedDown: document.getElementById("speedDown"),
    speedUp: document.getElementById("speedUp"),
    speedOut: document.getElementById("speedOut"),
    rangeDownA: document.getElementById("rangeDownA"),
    rangeUpA: document.getElementById("rangeUpA"),
    rangeOutA: document.getElementById("rangeOutA"),
    rangeDownB: document.getElementById("rangeDownB"),
    rangeUpB: document.getElementById("rangeUpB"),
    rangeOutB: document.getElementById("rangeOutB"),
    tutorialOpen: document.getElementById("tutorialOpen"),
    analysisOpen: document.getElementById("analysisOpen"),
    analysisOverlay: document.getElementById("analysisOverlay"),
    analysisClose: document.getElementById("analysisClose"),
    tutorialOverlay: document.getElementById("tutorialOverlay"),
    tutorialClose: document.getElementById("tutorialClose"),
    tutorialKicker: document.getElementById("tutorialKicker"),
    tutorialTitle: document.getElementById("tutorialTitle"),
    tutorialBody: document.getElementById("tutorialBody"),
    tutorialPrev: document.getElementById("tutorialPrev"),
    tutorialNext: document.getElementById("tutorialNext"),
    stepDots: document.getElementById("stepDots")
  };

  const ctx = {
    simA: els.simCanvasA.getContext("2d"),
    simB: els.simCanvasB.getContext("2d"),
    spectrumA: els.spectrumCanvasA.getContext("2d"),
    spectrumB: els.spectrumCanvasB.getContext("2d")
  };

  const tutorialSteps = [
    {
        "title": "무엇을 비교하는가?",
        "visual": "observationSetup",
        "body": [
            "이 시뮬레이션은 쌍성계에서 오는 별빛의 대표 흡수선이 관측자에게 어떻게 보이는지 비교합니다.",
            "비교하는 것은 빛의 전파속도가 광원의 운동과 무관한 광속불변 모형과, 광원의 시선방향 속도에 영향을 받는 방출설 모형입니다.",
            "두 경우 모두 도플러 이동은 나타납니다. 차이는 먼 거리를 오는 동안 빛의 도착 순서와 도착 간격이 얼마나 흐트러지는가입니다."
        ]
    },
    {
        "title": "쌍성계 궤도를 단순화한다",
        "visual": "orbitSetup",
        "body": [
            "실제 쌍성계에서는 두 별이 공통 질량중심 주위를 돕니다. 두 별의 궤도반지름과 위상은 질량에 따라 다르고, 실제 궤도는 원이 아니라 타원일 수 있습니다.",
            "이 시뮬레이션에서는 더시터르 논증의 핵심만 보이기 위해 무거운 별은 거의 중심에 정지해 있고, 가벼운 별 하나가 그 주위를 원운동한다고 둡니다.",
            "따라서 분석하는 속도는 공전하는 별의 속도 중 관측자 방향 성분입니다. 별이 관측자 쪽으로 움직일 때와 멀어질 때 대표 흡수선의 위치가 달라집니다."
        ]
    },
    {
        "title": "여러 흡수선 중 하나만 본다",
        "visual": "spectrumSetup",
        "body": [
            "실제 별빛에는 연속 스펙트럼 위에 여러 흡수선이 나타납니다. 실제 쌍성계에서는 두 별 모두 각자의 스펙트럼선을 만들 수도 있습니다.",
            "이 시뮬레이션에서는 여러 흡수선 중 하나의 대표 흡수선만 추적합니다. 또한 두 별의 선을 모두 그리지 않고, 공전하는 별 하나에서 나온 선만 관측한다고 둡니다.",
            "화면의 검은 세로선은 특정 원소가 만드는 하나의 대표 흡수선입니다. 별이 정지해 있으면 이 선은 기준 위치 λ₀에 나타납니다."
        ]
    },
    {
        "title": "다가오는 별빛은 짧은 파장으로 보인다",
        "visual": "blue",
        "body": [
            "별이 관측자 쪽으로 다가오면, 나중에 나온 파면이 앞서 나온 파면을 더 좁은 간격으로 따라옵니다.",
            "관측자에게 도착하는 파면 사이의 시간 간격이 짧아지고, 관측되는 파장도 짧아집니다.",
            "스펙트럼에서는 대표 흡수선이 기준 위치 λ₀보다 짧은 파장 쪽으로 이동합니다. 이것을 청색편이라고 부릅니다."
        ]
    },
    {
        "title": "멀어지는 별빛은 긴 파장으로 보인다",
        "visual": "red",
        "body": [
            "별이 관측자에게서 멀어지면, 다음 파면이 관측자에게 더 늦게 도착합니다.",
            "관측자에게 도착하는 파면 사이의 시간 간격이 길어지고, 관측되는 파장도 길어집니다.",
            "스펙트럼에서는 대표 흡수선이 기준 위치 λ₀보다 긴 파장 쪽으로 이동합니다. 이것을 적색편이라고 부릅니다."
        ]
    },
    {
        "title": "광속불변 모형에서는 선 하나가 부드럽게 왕복한다",
        "visual": "center",
        "body": [
            "광속불변 모형에서는 별이 다가오든 멀어지든 빛의 전파속도는 c입니다.",
            "별의 운동은 도플러 이동을 만들지만, 이미 방출된 빛의 전파속도 자체를 바꾸지는 않습니다.",
            "그래서 먼 관측자에게 도착하는 빛은 방출 순서를 유지합니다. 한 관측 시각에는 보통 하나의 대표 흡수선이 보이고, 이 선은 공전 주기에 따라 짧은 파장 쪽과 긴 파장 쪽을 부드럽게 왕복합니다. 시뮬레이션에서 k=0이 이 경우입니다."
        ]
    },
    {
        "title": "광속이 광원 속도에 의존하면 도착 순서가 흐트러질 수 있다",
        "visual": "two",
        "body": [
            "방출설 모형에서는 빛의 전파속도가 방출 순간 별의 시선방향 속도 u에 영향을 받는다고 가정합니다. 이 시뮬레이션에서는 c_light = c + k u 로 계산합니다.",
            "별이 관측자 쪽으로 움직일 때 나온 빛은 더 빠르게 가고, 멀어질 때 나온 빛은 더 느리게 갑니다.",
            "거리가 충분히 멀면 나중에 출발한 빠른 빛이 먼저 출발한 느린 빛을 따라잡을 수 있습니다. 그 결과 한 관측 시각에 서로 다른 방출 시점의 빛이 함께 도착할 수 있습니다."
        ]
    },
    {
        "title": "여러 파장이 동시에 구별되어 보일 수 있다",
        "visual": "two",
        "body": [
            "여러 파장의 빛이 동시에 관측자에게 도착한다고 해서 하나의 평균 파장으로만 보이는 것은 아닙니다.",
            "분광기는 파장에 따라 빛을 분리하므로, 서로 다른 파장 성분이 동시에 들어오면 서로 다른 위치에 흡수선이 나타날 수 있습니다.",
            "실제 관측에서는 장비 해상도, 노이즈, 노출 시간 때문에 여러 선이 완전히 깨끗하게 분리되지 않고 넓어진 선이나 겹친 선처럼 보일 수도 있습니다. 이 시뮬레이션은 그 효과를 이해하기 쉽게 여러 성분을 선명한 흡수선으로 표시합니다."
        ]
    },
    {
        "title": "실제 관측과 비교하기",
        "visual": "observationSetup",
        "body": [
            "실제 분광쌍성 관측에서는 여러 시점의 스펙트럼을 궤도 위상에 따라 쌓아 trailed spectra를 만듭니다.",
            "이때 가로축은 파장 이동을 속도로 환산한 값이고, 세로축은 공전 주기를 0에서 1로 접은 궤도 위상입니다.",
            "실제 관측 자료에서는 스펙트럼선이 대체로 질서 있는 궤적을 보입니다. 결과분석 페이지에서 실제 WASP 0131+28 관측 그림과 비교할 수 있습니다."
        ]
    }
];

  function positiveMod(x, m) {
    return ((x % m) + m) % m;
  }

  function circularDistance(a, b, period = 1) {
    const d = Math.abs(positiveMod(a - b + period / 2, period) - period / 2);
    return d;
  }

  function distancePeriods(sim) {
    return Math.pow(10, sim.distLog);
  }

  function spectrumRange(key) {
    const multiplier = Math.pow(10, state.spectrumRangePower[key]);
    const halfRange = SPECTRUM_BASE_HALF_RANGE * multiplier;
    return {
      multiplier,
      halfRange,
      minLambda: Math.max(0, 1 - halfRange),
      maxLambda: 1 + halfRange
    };
  }

  function getParams(key) {
    const sim = state.sims[key];
    return {
      key,
      color: COLORS[key],
      distLog: sim.distLog,
      distance: distancePeriods(sim),
      k: sim.k
    };
  }

  function sourcePhysical(t) {
    const phase = PHYS.omega * t;
    const radius = PHYS.beta / PHYS.omega;
    const x = radius * Math.sin(phase);
    const u = PHYS.beta * Math.cos(phase);
    return { x, u, phase };
  }

  function lightSpeed(tEmit, params) {
    const source = sourcePhysical(tEmit);
    return PHYS.c + params.k * source.u;
  }

  function arrivalTime(tEmit, params) {
    const source = sourcePhysical(tEmit);
    const pathLength = params.distance - source.x;
    return tEmit + pathLength / lightSpeed(tEmit, params);
  }

  function reducedArrivalTime(tEmit, params) {
    return arrivalTime(tEmit, params) - params.distance;
  }

  function makeSpectrumPairs(params) {
    const dt = PHYS.spectralWaveInterval;
    const start = 0;
    const end = PHYS.spectralCycles * PHYS.period;
    const count = Math.floor((end - start) / dt);
    const samples = [];
    const pairs = [];

    for (let i = 0; i <= count; i++) {
      const tEmit = start + i * dt;
      samples.push({ tEmit, tArrReduced: reducedArrivalTime(tEmit, params) });
    }

    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i];
      const b = samples[i + 1];
      const ratio = (b.tArrReduced - a.tArrReduced) / dt;
      const lambdaRatio = Math.abs(ratio);
      const obsMid = 0.5 * (a.tArrReduced + b.tArrReduced);
      const emitMid = 0.5 * (a.tEmit + b.tEmit);
      if (!Number.isFinite(ratio) || !Number.isFinite(lambdaRatio)) continue;
      pairs.push({
        index: i,
        tEmitMid: emitMid,
        tObsMid: obsMid,
        obsPhase: positiveMod(obsMid, PHYS.period) / PHYS.period,
        emitPhase: positiveMod(emitMid, PHYS.period) / PHYS.period,
        ratio,
        lambdaRatio
      });
    }

    const range = spectrumRange(params.key);
    return {
      params,
      pairs,
      dt,
      minLambda: range.minLambda,
      maxLambda: range.maxLambda,
      halfRange: range.halfRange
    };
  }

  function recomputeSpectra() {
    recomputeSpectrum("A");
    recomputeSpectrum("B");
  }

  function recomputeSpectrum(key) {
    state.spectrumData[key] = makeSpectrumPairs(getParams(key));
    state.spectrumHistory[key] = [];
  }

  function setDistance(key, value) {
    const clamped = Math.max(0, Math.min(3, Number(value)));
    state.sims[key].distLog = clamped;
    const other = key === "A" ? "B" : "A";
    state.sims[other].distLog = clamped;
    syncInputsFromState();
    recomputeSpectra();
  }

  function setK(key, value) {
    state.sims[key].k = Math.max(0, Math.min(1, Number(value)));
    syncInputsFromState();
    recomputeSpectra();
  }

  function adjustSpeed(delta) {
    const next = state.speed + delta;
    state.speed = Math.max(0, Math.min(4, Math.round(next * 100) / 100));
    updateOutputLabels();
  }

  function adjustSpectrumRange(key, delta) {
    const next = state.spectrumRangePower[key] + delta;
    const clamped = Math.max(0, Math.min(SPECTRUM_MAX_RANGE_POWER, next));
    if (clamped === state.spectrumRangePower[key]) return;
    state.spectrumRangePower[key] = clamped;
    updateOutputLabels();
    recomputeSpectrum(key);
  }

  function syncInputsFromState() {
    els.distA.value = String(state.sims.A.distLog);
    els.distB.value = String(state.sims.B.distLog);
    els.kA.value = String(state.sims.A.k);
    els.kB.value = String(state.sims.B.k);
    updateOutputLabels();
  }

  function distanceLabel(sim) {
    const d = distancePeriods(sim);
    if (d < 10) return `${d.toFixed(1)}P`;
    if (d < 100) return `${d.toFixed(0)}P`;
    return `${Math.round(d)}P`;
  }

  function updateOutputLabels() {
    els.distAOut.textContent = `D = c × ${distanceLabel(state.sims.A)}`;
    els.distBOut.textContent = `D = c × ${distanceLabel(state.sims.B)}`;
    els.kAOut.textContent = Number(state.sims.A.k).toFixed(2);
    els.kBOut.textContent = Number(state.sims.B.k).toFixed(2);
    els.summaryA.textContent = `D = c×${distanceLabel(state.sims.A)} · k ${Number(state.sims.A.k).toFixed(2)}`;
    els.summaryB.textContent = `D = c×${distanceLabel(state.sims.B)} · k ${Number(state.sims.B.k).toFixed(2)}`;
    els.speedOut.textContent = `속도 ${state.speed.toFixed(2)}×`;
    els.rangeOutA.textContent = `×${spectrumRange("A").multiplier.toLocaleString("ko-KR")}`;
    els.rangeOutB.textContent = `×${spectrumRange("B").multiplier.toLocaleString("ko-KR")}`;
    els.rangeDownA.disabled = state.spectrumRangePower.A === 0;
    els.rangeUpA.disabled = state.spectrumRangePower.A === SPECTRUM_MAX_RANGE_POWER;
    els.rangeDownB.disabled = state.spectrumRangePower.B === 0;
    els.rangeUpB.disabled = state.spectrumRangePower.B === SPECTRUM_MAX_RANGE_POWER;
  }

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext("2d");
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: rect.width, height: rect.height };
  }

  function sourceScreenPosition(t, layout) {
    const phase = PHYS.omega * t;
    return {
      x: layout.orbitCx + layout.orbitR * Math.sin(phase),
      y: layout.orbitCy - layout.orbitR * Math.cos(phase)
    };
  }

  function linePoint(a, b, f) {
    return {
      x: a.x + (b.x - a.x) * f,
      y: a.y + (b.y - a.y) * f
    };
  }

  function drawFlatCircle(context, x, y, r, fill, stroke = null, lineWidth = 1.5) {
    context.save();
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = lineWidth;
      context.stroke();
    }
    context.restore();
  }

  function drawSimulationPanel(canvas, context, key) {
    const dims = resizeCanvas(canvas);
    const width = dims.width;
    const height = dims.height;
    const params = getParams(key);
    const color = COLORS[key];

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#050914";
    context.fillRect(0, 0, width, height);

    const layout = {
      orbitCx: Math.max(58, width * 0.12),
      orbitCy: height * 0.43,
      orbitR: Math.min(34, Math.max(24, height * 0.13)),
      observerX: width - Math.max(48, width * 0.075),
      axisY: height * 0.50
    };
    layout.pathStartX = layout.orbitCx + layout.orbitR + 14;

    context.save();
    context.strokeStyle = "rgba(226, 232, 240, 0.22)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(layout.pathStartX, layout.axisY);
    context.lineTo(layout.observerX - 24, layout.axisY);
    context.stroke();
    context.restore();

    drawVisualPropagation(context, params, layout, color);

    context.save();
    context.strokeStyle = "rgba(148, 163, 184, 0.26)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(layout.orbitCx, layout.orbitCy, layout.orbitR, 0, Math.PI * 2);
    context.stroke();
    drawFlatCircle(context, layout.orbitCx, layout.orbitCy, 8, COLORS.centerStar, "rgba(255,255,255,0.35)");
    const star = sourceScreenPosition(state.time, layout);
    drawFlatCircle(context, star.x, star.y, 7.5, color, "rgba(255,255,255,0.55)", 1.2);
    context.restore();

    context.save();
    context.fillStyle = COLORS.text;
    context.strokeStyle = COLORS.text;
    drawFlatCircle(context, layout.observerX, layout.axisY - 24, 8, "#e7edf7");
    context.fillRect(layout.observerX - 4, layout.axisY - 16, 8, 28);
    context.strokeStyle = "rgba(226,232,240,0.7)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(layout.observerX - 10, layout.axisY + 20);
    context.lineTo(layout.observerX, layout.axisY + 11);
    context.lineTo(layout.observerX + 10, layout.axisY + 20);
    context.stroke();
    context.restore();

  }

  function drawVisualPropagation(context, params, layout, color) {
    const wavefronts = collectVisibleWavefronts(params);
    const end = { x: layout.observerX - 18, y: layout.axisY };

    context.save();
    wavefronts.sort((a, b) => a.f - b.f);
    for (const wave of wavefronts) {
      const start = sourceScreenPosition(wave.tEmit, layout);
      const p = linePoint(start, end, wave.f);
      const alpha = 0.32 + 0.40 * wave.f;
      drawWavefrontArc(context, p.x, p.y, 8.4, color, alpha);
    }
    context.restore();
  }

  function collectVisibleWavefronts(params) {
    const obsNow = state.time;
    const interval = VISUAL.emissionInterval;
    const delaySpan = 0.45 + params.k * params.distance * PHYS.beta * 1.35;
    const scanStart = obsNow - delaySpan - 0.5;
    const scanEnd = obsNow + VISUAL.replayCycles + delaySpan * 0.55 + 0.25;
    const firstIndex = Math.floor(scanStart / interval) - 1;
    const lastIndex = Math.ceil(scanEnd / interval) + 1;
    const candidates = [];

    for (let n = firstIndex; n <= lastIndex; n++) {
      addVisibleWavefront(candidates, n * interval, params);
    }

    candidates.sort((a, b) => b.priority - a.priority || Math.abs(a.arrivalDelta) - Math.abs(b.arrivalDelta));
    return candidates.slice(0, VISUAL.maxLightsPerPanel);
  }

  function addVisibleWavefront(list, tEmit, params) {
    const wave = makeVisibleWavefront(tEmit, params);
    if (!wave) return;

    for (let i = 0; i < list.length; i++) {
      if (Math.abs(list[i].tEmit - wave.tEmit) <= VISUAL.dedupeTolerance) {
        if (wave.priority > list[i].priority) list[i] = wave;
        return;
      }
    }
    list.push(wave);
  }

  function makeVisibleWavefront(tEmit, params) {
    const tauArr = reducedArrivalTime(tEmit, params);
    if (!Number.isFinite(tauArr)) return null;

    const obsNow = state.time;
    const tauStart = tEmit - VISUAL.replayCycles;
    const duration = tauArr - tauStart;
    if (!Number.isFinite(duration) || duration <= 0.05) return null;
    if (obsNow < tauStart || obsNow > tauArr) return null;

    let f = (obsNow - tauStart) / duration;
    if (f < -0.001 || f > 1.001) return null;
    f = Math.max(0, Math.min(1, f));

    const arrivalDelta = tauArr - obsNow;
    const priority = Math.max(0, 1 - Math.abs(arrivalDelta) / 0.12) * 30 + f;

    return { tEmit, tauArr, tauStart, arrivalDelta, f, priority };
  }

  function drawWavefrontArc(context, x, y, radius, color, alpha = 1) {
    context.save();
    context.globalAlpha = alpha;
    context.strokeStyle = color;
    context.lineWidth = 2.15;
    context.lineCap = "round";
    context.beginPath();
    const h = radius * 1.62;
    const bow = radius * 0.42;
    context.moveTo(x - bow * 0.28, y - h / 2);
    context.bezierCurveTo(
      x + bow, y - h * 0.32,
      x + bow, y + h * 0.32,
      x - bow * 0.28, y + h / 2
    );
    context.stroke();
    context.restore();
  }

  function drawSpectrumPanel(canvas, context, key) {
    const dims = resizeCanvas(canvas);
    const width = dims.width;
    const height = dims.height;
    const data = state.spectrumData[key];
    if (!data) return;

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#050914";
    context.fillRect(0, 0, width, height);

    const components = getCurrentSpectrumComponents(data, state.time);
    const visibleComponents = components.filter((c) => c.inRange);
    recordSpectrumHistory(key, visibleComponents);

    if (key === "A") {
      els.spectrumSummaryA.textContent = makeSpectrumSummary(data);
    } else {
      els.spectrumSummaryB.textContent = makeSpectrumSummary(data);
    }

    const pad = { left: 50, right: 22, top: 22, bottom: 16 };
    const band = {
      x: pad.left,
      y: pad.top + 24,
      w: width - pad.left - pad.right,
      h: Math.max(18, Math.min(24, height * 0.09))
    };
    const recordY = band.y + band.h + 58;
    const recordAxisLabelHeight = 18;
    const recordMaxHeight = Math.max(52, height - recordY - pad.bottom - recordAxisLabelHeight);
    const record = {
      x: pad.left,
      y: recordY,
      w: width - pad.left - pad.right,
      h: Math.min(100, recordMaxHeight)
    };

    drawCurrentSpectrum(context, data, band, visibleComponents, key);
    drawSpectrumRecord(context, data, record, key);
  }

  function makeSpectrumSummary(data) {
    return `λ/λ₀ ${percentRangeText(data.halfRange)}`;
  }

  function percentRangeText(halfRange) {
    const percent = halfRange * 100;
    const maximumFractionDigits = percent < 10 ? 2 : 0;
    return `±${percent.toLocaleString("ko-KR", { maximumFractionDigits })}%`;
  }

  function getCurrentSpectrumComponents(data, obsTime) {
    const phase = positiveMod(obsTime, PHYS.period) / PHYS.period;
    const halfWindow = PHYS.exposureWindow / 2;
    const candidates = [];

    for (const p of data.pairs) {
      const d = circularDistance(p.obsPhase, phase, 1);
      if (d <= halfWindow) {
        const weight = Math.max(0.08, 1 - d / halfWindow);
        candidates.push({
          lambdaRatio: p.lambdaRatio,
          weight,
          inRange: p.lambdaRatio >= data.minLambda && p.lambdaRatio <= data.maxLambda
        });
      }
    }

    if (!candidates.length) return [];
    candidates.sort((a, b) => a.lambdaRatio - b.lambdaRatio);
    const tol = Math.max((data.maxLambda - data.minLambda) / 110, 0.00004);
    const clusters = [];

    for (const item of candidates) {
      const last = clusters[clusters.length - 1];
      if (last && Math.abs(last.lambdaRatio - item.lambdaRatio) <= tol) {
        const totalWeight = last.weight + item.weight;
        last.lambdaRatio = (last.lambdaRatio * last.weight + item.lambdaRatio * item.weight) / totalWeight;
        last.weight = totalWeight;
        last.count += 1;
        last.inRange = last.inRange || item.inRange;
      } else {
        clusters.push({ ...item, count: 1 });
      }
    }

    return clusters.map((c) => ({
      ...c,
      inRange: c.lambdaRatio >= data.minLambda && c.lambdaRatio <= data.maxLambda
    }));
  }

  function recordSpectrumHistory(key, components) {
    const history = state.spectrumHistory[key];
    const cutoff = state.time - SPECTRUM_HISTORY_SPAN;
    while (history.length && history[0].t < cutoff) history.shift();
    if (!components.length) return;

    const last = history[history.length - 1];
    if (last && Math.abs(last.t - state.time) < 0.0005) return;

    history.push({
      t: state.time,
      values: components.map((c) => c.lambdaRatio)
    });

    while (history.length > SPECTRUM_MAX_HISTORY) history.shift();
  }

  function drawSpectrumGradient(context, x, y, w, h, key) {
    const colors = SPECTRUM_GRADIENT_COLORS.slice(0, 3 + state.spectrumRangePower[key]);
    const gradient = context.createLinearGradient(x, y, x + w, y);
    colors.forEach((color, i) => {
      gradient.addColorStop(i / (colors.length - 1), color);
    });
    context.fillStyle = gradient;
    context.fillRect(x, y, w, h);
  }

  function drawCurrentSpectrum(context, data, band, components, key) {
    context.save();
    context.fillStyle = COLORS.text;
    context.font = "700 14px system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "bottom";
    context.fillText("현재 관측 스펙트럼", band.x, band.y - 8);

    drawSpectrumGradient(context, band.x, band.y, band.w, band.h, key);
    context.strokeStyle = "rgba(255,255,255,0.30)";
    context.lineWidth = 1;
    context.strokeRect(band.x, band.y, band.w, band.h);

    const centerX = xFromLambda(data, band, 1);
    context.strokeStyle = "rgba(5, 9, 20, 0.35)";
    context.lineWidth = 1.5;
    context.setLineDash([3, 3]);
    context.beginPath();
    context.moveTo(centerX, band.y);
    context.lineTo(centerX, band.y + band.h);
    context.stroke();
    context.setLineDash([]);

    for (const c of components) {
      const x = xFromLambda(data, band, c.lambdaRatio);
      if (!Number.isFinite(x)) continue;
      context.save();
      context.fillStyle = "rgba(2, 6, 15, 0.86)";
      context.fillRect(x - SPECTRUM_LINE_WIDTH / 2, band.y, SPECTRUM_LINE_WIDTH, band.h);
      context.strokeStyle = "rgba(255,255,255,0.24)";
      context.lineWidth = 1;
      context.strokeRect(x - SPECTRUM_LINE_WIDTH / 2, band.y, SPECTRUM_LINE_WIDTH, band.h);
      context.restore();
    }

    context.fillStyle = COLORS.muted;
    context.font = "11px system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText("짧은 파장", band.x, band.y + band.h + 8);
    context.textAlign = "center";
    context.fillText("λ₀", centerX, band.y + band.h + 8);
    context.textAlign = "right";
    context.fillText("긴 파장", band.x + band.w, band.y + band.h + 8);

    context.restore();
  }

  function drawSpectrumRecord(context, data, record, key) {
    context.save();
    context.fillStyle = COLORS.text;
    context.font = "700 14px system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "bottom";
    context.fillText("스펙트럼선 시간 기록", record.x, record.y - 10);

    drawSpectrumGradient(context, record.x, record.y, record.w, record.h, key);
    context.strokeStyle = "rgba(226,232,240,0.30)";
    context.lineWidth = 1.2;
    context.strokeRect(record.x, record.y, record.w, record.h);

    context.save();
    context.beginPath();
    context.rect(record.x, record.y, record.w, record.h);
    context.clip();

    const centerX = xFromLambda(data, record, 1);
    context.strokeStyle = "rgba(255,255,255,0.42)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(centerX, record.y);
    context.lineTo(centerX, record.y + record.h);
    context.stroke();

    const history = state.spectrumHistory[key];
    const newest = state.time;
    for (const row of history) {
      const age = newest - row.t;
      if (age < 0 || age > SPECTRUM_HISTORY_SPAN) continue;
      const y = record.y + (age / SPECTRUM_HISTORY_SPAN) * record.h;
      const alpha = Math.max(0.12, 1 - age / SPECTRUM_HISTORY_SPAN);
      for (const lambdaRatio of row.values) {
        const x = xFromLambda(data, record, lambdaRatio);
        if (x < record.x || x > record.x + record.w) continue;
        context.fillStyle = `rgba(8, 10, 9, ${alpha})`;
        context.fillRect(x - 1, y - 1, 3, 3);
      }
    }
    context.restore();

    context.fillStyle = COLORS.muted;
    context.font = "11px system-ui, sans-serif";
    context.textBaseline = "top";
    context.textAlign = "left";
    context.fillText("짧은 파장", record.x, record.y + record.h + 8);
    context.textAlign = "center";
    context.fillText("λ₀", xFromLambda(data, record, 1), record.y + record.h + 8);
    context.textAlign = "right";
    context.fillText("긴 파장", record.x + record.w, record.y + record.h + 8);

    context.restore();
  }

  function xFromLambda(data, box, lambdaRatio) {
    const denom = data.maxLambda - data.minLambda || 1;
    return box.x + (lambdaRatio - data.minLambda) / denom * box.w;
  }

  const TIP_GROUPS = {
    distance: [
      {
        key: "D",
        title: "D: 관측자와 쌍성계 사이 거리",
        body: "D는 관측자와 쌍성계 사이의 거리입니다. 화면에서는 거리를 c × P 단위로 나타냅니다. 예를 들어 D = c × 100P는 빛의 이동 시간이 공전 주기의 100배라는 뜻입니다."
      },
      {
        key: "c",
        title: "c: 기준 광속",
        body: "c는 기준 광속입니다. 광속불변 모형에서는 별이 다가오거나 멀어져도 빛은 항상 c로 전파됩니다. 방출설 모형에서는 방출 순간 별의 시선방향 속도 u가 빛의 전파속도 c + k u에 반영됩니다."
      },
      {
        key: "P",
        title: "P: 공전 주기",
        body: "P는 별이 원궤도를 한 바퀴 도는 데 걸리는 시간입니다. 이 시뮬레이션은 P=1을 시간 단위로 쓰므로, D = c × 100P는 D/c = 100P, 즉 빛의 이동 시간이 공전 주기의 100배라는 뜻입니다."
      }
    ],
    k: [
      {
        key: "k",
        title: "k: 광원 속도 영향 정도",
        body: "k는 광원 속도가 빛의 전파속도에 얼마나 영향을 주는지 나타내는 값입니다. k=0은 광속불변 모형, k=1은 리츠식 방출설에 가까운 모형입니다. 값이 클수록 빠르게 출발한 빛과 느리게 출발한 빛의 도착 차이가 커집니다."
      }
    ]
  };

  let activeInfoButton = null;
  let activeInfoGroupKey = null;
  let activeInfoIndex = 0;
  let previewInfoButton = null;
  let infoTooltip = null;

  function setupInfoDots() {
    infoTooltip = document.createElement("div");
    infoTooltip.className = "info-tooltip";
    infoTooltip.setAttribute("role", "tooltip");
    infoTooltip.addEventListener("click", (event) => event.stopPropagation());
    document.body.appendChild(infoTooltip);

    document.querySelectorAll(".info-dot").forEach((button) => {
      const groupKey = getInfoGroupKey(button);
      const group = TIP_GROUPS[groupKey];
      if (!group) return;

      if (!button.dataset.tipIndex) button.dataset.tipIndex = "0";
      button.setAttribute("aria-label", group.length > 1 ? `${group.map((item) => item.key).join("/")} 설명` : `${group[0].key} 설명`);
      button.setAttribute("aria-expanded", "false");

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (activeInfoButton === button && infoTooltip.classList.contains("open")) {
          hideInfoTooltip();
        } else {
          showInfoTooltip(button, true);
        }
      });
      button.addEventListener("mouseenter", () => {
        if (!activeInfoButton) showInfoTooltip(button, false);
      });
      button.addEventListener("focus", () => {
        if (!activeInfoButton) showInfoTooltip(button, false);
      });
      button.addEventListener("mouseleave", () => {
        if (previewInfoButton === button && activeInfoButton !== button) hideInfoTooltip();
      });
      button.addEventListener("blur", () => {
        if (previewInfoButton === button && activeInfoButton !== button) hideInfoTooltip();
      });
    });

    window.addEventListener("click", hideInfoTooltip);
    window.addEventListener("keydown", (event) => {
      if (!infoTooltip.classList.contains("open")) return;
      if (event.key === "Escape") hideInfoTooltip();
      if (event.key === "ArrowRight") changeInfoPage(1);
      if (event.key === "ArrowLeft") changeInfoPage(-1);
    });
    window.addEventListener("resize", () => {
      const button = activeInfoButton || previewInfoButton;
      if (button) positionInfoTooltip(button);
    });
  }

  function getInfoGroupKey(button) {
    return button.dataset.tipGroup || button.dataset.tipKey;
  }

  function showInfoTooltip(button, pin = true) {
    if (!infoTooltip) return;
    const groupKey = getInfoGroupKey(button);
    const group = TIP_GROUPS[groupKey];
    if (!group) return;

    const storedIndex = Number(button.dataset.tipIndex || 0);
    const index = Number.isFinite(storedIndex)
      ? Math.max(0, Math.min(group.length - 1, storedIndex))
      : 0;

    document.querySelectorAll(".info-dot.open").forEach((other) => {
      other.classList.remove("open");
      other.setAttribute("aria-expanded", "false");
    });
    button.classList.add("open");
    button.setAttribute("aria-expanded", "true");

    activeInfoGroupKey = groupKey;
    activeInfoIndex = index;
    if (pin) {
      activeInfoButton = button;
      previewInfoButton = null;
    } else {
      previewInfoButton = button;
    }

    renderInfoTooltip(button);
  }

  function renderInfoTooltip(button) {
    if (!infoTooltip || !activeInfoGroupKey) return;
    const group = TIP_GROUPS[activeInfoGroupKey];
    if (!group) return;
    const safeIndex = Math.max(0, Math.min(group.length - 1, activeInfoIndex));
    const item = group[safeIndex];
    const count = group.length;
    const navHtml = count > 1
      ? `
        <div class="info-tooltip-nav" aria-label="기호 설명 이동">
          <button class="info-nav-button" type="button" data-info-nav="-1" aria-label="이전 설명">‹</button>
          <span class="info-page-count">${safeIndex + 1} / ${count}</span>
          <button class="info-nav-button" type="button" data-info-nav="1" aria-label="다음 설명">›</button>
        </div>
      `
      : "";

    infoTooltip.innerHTML = `${navHtml}<strong>${item.title}</strong><p>${item.body}</p>`;
    infoTooltip.classList.add("open");
    positionInfoTooltip(button);

    infoTooltip.querySelectorAll("[data-info-nav]").forEach((navButton) => {
      navButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!activeInfoButton) {
          activeInfoButton = button;
          previewInfoButton = null;
        }
        changeInfoPage(Number(navButton.dataset.infoNav));
      });
    });
  }

  function changeInfoPage(delta) {
    if (!activeInfoButton || !activeInfoGroupKey) return;
    const group = TIP_GROUPS[activeInfoGroupKey];
    if (!group || group.length <= 1) return;
    activeInfoIndex = (activeInfoIndex + delta + group.length) % group.length;
    activeInfoButton.dataset.tipIndex = String(activeInfoIndex);
    renderInfoTooltip(activeInfoButton);
  }

  function hideInfoTooltip() {
    if (!infoTooltip) return;
    infoTooltip.classList.remove("open");
    document.querySelectorAll(".info-dot.open").forEach((button) => {
      button.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
    });
    activeInfoButton = null;
    activeInfoGroupKey = null;
    activeInfoIndex = 0;
    previewInfoButton = null;
  }

  function positionInfoTooltip(button) {
    if (!infoTooltip) return;
    const rect = button.getBoundingClientRect();
    const tipRect = infoTooltip.getBoundingClientRect();
    const margin = 10;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(14, Math.min(window.innerWidth - tipRect.width - 14, left));
    let top = rect.top - tipRect.height - margin;
    if (top < 10) top = rect.bottom + margin;
    infoTooltip.style.left = `${left}px`;
    infoTooltip.style.top = `${top}px`;
  }

  function handleInput(event) {
    const id = event.target.id;
    if (id === "distA") setDistance("A", event.target.value);
    if (id === "distB") setDistance("B", event.target.value);
    if (id === "kA") setK("A", event.target.value);
    if (id === "kB") setK("B", event.target.value);
  }

  function drawAll(timestamp) {
    if (state.lastFrame === null) state.lastFrame = timestamp;
    const dt = Math.min(0.05, (timestamp - state.lastFrame) / 1000);
    state.lastFrame = timestamp;

    state.time += dt * 0.23 * state.speed;

    drawSimulationPanel(els.simCanvasA, ctx.simA, "A");
    drawSimulationPanel(els.simCanvasB, ctx.simB, "B");
    drawSpectrumPanel(els.spectrumCanvasA, ctx.spectrumA, "A");
    drawSpectrumPanel(els.spectrumCanvasB, ctx.spectrumB, "B");
    drawTutorialVisual();
    requestAnimationFrame(drawAll);
  }

  function setupEvents() {
    [els.distA, els.distB, els.kA, els.kB].forEach((input) => {
      input.addEventListener("input", handleInput);
    });


    els.speedDown.addEventListener("click", () => adjustSpeed(-0.25));
    els.speedUp.addEventListener("click", () => adjustSpeed(0.25));
    els.rangeDownA.addEventListener("click", () => adjustSpectrumRange("A", -1));
    els.rangeUpA.addEventListener("click", () => adjustSpectrumRange("A", 1));
    els.rangeDownB.addEventListener("click", () => adjustSpectrumRange("B", -1));
    els.rangeUpB.addEventListener("click", () => adjustSpectrumRange("B", 1));

    els.tutorialOpen.addEventListener("click", () => openTutorial(0));
    els.analysisOpen.addEventListener("click", openAnalysis);
    els.analysisClose.addEventListener("click", closeAnalysis);
    els.tutorialClose.addEventListener("click", closeTutorial);
    els.tutorialPrev.addEventListener("click", () => changeTutorialStep(-1));
    els.tutorialNext.addEventListener("click", () => changeTutorialStep(1));
    els.tutorialOverlay.addEventListener("click", (event) => {
      if (event.target === els.tutorialOverlay) closeTutorial();
    });
    els.analysisOverlay.addEventListener("click", (event) => {
      if (event.target === els.analysisOverlay) closeAnalysis();
    });
    window.addEventListener("keydown", (event) => {
      if (els.analysisOverlay.classList.contains("open") && event.key === "Escape") {
        closeAnalysis();
        return;
      }
      if (!els.tutorialOverlay.classList.contains("open")) return;
      if (event.key === "Escape") closeTutorial();
      if (event.key === "ArrowRight") changeTutorialStep(1);
      if (event.key === "ArrowLeft") changeTutorialStep(-1);
    });

    window.addEventListener("resize", () => {
      drawSimulationPanel(els.simCanvasA, ctx.simA, "A");
      drawSimulationPanel(els.simCanvasB, ctx.simB, "B");
      drawSpectrumPanel(els.spectrumCanvasA, ctx.spectrumA, "A");
      drawSpectrumPanel(els.spectrumCanvasB, ctx.spectrumB, "B");
    });
  }

  function openAnalysis() {
    hideInfoTooltip();
    els.analysisOverlay.classList.add("open");
  }

  function closeAnalysis() {
    els.analysisOverlay.classList.remove("open");
  }

  function openTutorial(step = state.tutorialStep) {
    state.tutorialStep = Math.max(0, Math.min(tutorialSteps.length - 1, step));
    renderTutorial();
    els.tutorialOverlay.classList.add("open");
  }

  function closeTutorial() {
    els.tutorialOverlay.classList.remove("open");
    try {
      localStorage.setItem("deSitterSpectrumTutorialSeen", "1");
    } catch (err) {
      // localStorage may be unavailable in some embedded browsers.
    }
  }

  function changeTutorialStep(delta) {
    const next = state.tutorialStep + delta;
    if (next < 0) return;
    if (next >= tutorialSteps.length) {
      closeTutorial();
      return;
    }
    state.tutorialStep = next;
    renderTutorial();
  }

  function renderTutorial() {
    const step = tutorialSteps[state.tutorialStep];
    els.tutorialKicker.textContent = `${state.tutorialStep + 1} / ${tutorialSteps.length}`;
    els.tutorialTitle.textContent = step.title;
    els.tutorialBody.innerHTML = makeTutorialBody(step);
    els.tutorialPrev.disabled = state.tutorialStep === 0;
    els.tutorialNext.textContent = state.tutorialStep === tutorialSteps.length - 1 ? "시작하기" : "다음";
    els.stepDots.innerHTML = tutorialSteps.map((_, i) => `<span class="step-dot${i === state.tutorialStep ? " active" : ""}"></span>`).join("");
    drawTutorialVisual();
  }

  function makeTutorialBody(step) {
    const visualClass = step.visual;
    const paragraphs = step.body.map((text) => `<p>${text}</p>`).join("");
    if (visualClass.endsWith("Setup")) {
      return `
        ${paragraphs}
        <div class="tutorial-visual setup">
          <div class="tutorial-canvas-wrap setup"><canvas id="tutorialVisualCanvas" class="tutorial-canvas"></canvas></div>
        </div>
      `;
    }
    let lineHtml = '<span class="mini-line center"></span>';
    if (visualClass === "blue") lineHtml = '<span class="mini-line blue"></span>';
    if (visualClass === "red") lineHtml = '<span class="mini-line red"></span>';
    if (visualClass === "two") lineHtml = '<span class="mini-line two-a"></span><span class="mini-line two-b"></span>';
    return `
      ${paragraphs}
      <div class="tutorial-visual">
        <div class="tutorial-canvas-wrap"><canvas id="tutorialVisualCanvas" class="tutorial-canvas"></canvas></div>
        <div class="mini-spectrum">${lineHtml}</div>
        <div class="mini-labels"><span>짧은 파장</span><span>기준 λ₀</span><span>긴 파장</span></div>
      </div>
    `;
  }

  function drawTutorialVisual() {
    if (!els.tutorialOverlay.classList.contains("open")) return;
    const canvas = document.getElementById("tutorialVisualCanvas");
    if (!canvas) return;
    const dims = resizeCanvas(canvas);
    const context = canvas.getContext("2d");
    const width = dims.width;
    const height = dims.height;
    const step = tutorialSteps[state.tutorialStep];
    const mode = step ? step.visual : "center";

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#050914";
    context.fillRect(0, 0, width, height);

    if (mode.endsWith("Setup")) {
      drawTutorialSetupPage(context, width, height, mode);
      return;
    }

    const splitY = height * 0.56;
    drawTutorialWavefrontScene(context, width, splitY, mode);
    drawTutorialEMWave(context, width, height, splitY, mode);
  }

  function drawTutorialSetupPage(context, width, height, mode) {
    context.save();
    const pad = 18;
    const top = 14;
    const titleH = 36;
    const cardGap = 12;
    const contentW = width - pad * 2;
    const contentH = height - top * 2;
    const t = state.time;

    context.fillStyle = "#050914";
    context.fillRect(0, 0, width, height);

    if (mode === "orbitSetup") {
      drawSetupColumnOrbit(context, pad, top, contentW, contentH, titleH, cardGap, t);
    } else if (mode === "spectrumSetup") {
      drawSetupColumnSpectrum(context, pad, top, contentW, contentH, titleH, cardGap);
    } else if (mode === "observationSetup") {
      drawSetupColumnObservation(context, pad, top, contentW, contentH, titleH, cardGap, t);
    }
    context.restore();
  }

  function drawSetupColumnTitle(context, x, y, w, text) {
    context.save();
    context.fillStyle = COLORS.text;
    context.font = "800 15px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, x + w / 2, y + 15);
    context.restore();
  }

  function drawSetupCard(context, x, y, w, h, title, selected, drawFn, caption) {
    context.save();
    context.fillStyle = selected ? "rgba(255,77,61,0.08)" : "rgba(7,16,29,0.95)";
    context.strokeStyle = selected ? "#ff4d3d" : "rgba(148,163,184,0.22)";
    context.lineWidth = selected ? 2.6 : 1.1;
    context.fillRect(x, y, w, h);
    context.strokeRect(x, y, w, h);

    context.fillStyle = selected ? "#ffd1cb" : COLORS.text;
    context.font = "700 12px system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(title, x + 10, y + 8);
    if (selected) {
      context.fillStyle = "rgba(255,77,61,0.18)";
      context.fillRect(x + w - 54, y + 6, 44, 20);
      context.fillStyle = "#ffd1cb";
      context.font = "800 11px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText("선택", x + w - 32, y + 10);
    }
    drawFn(context, x + 10, y + 30, w - 20, h - 54);
    if (caption) {
      context.fillStyle = COLORS.muted;
      context.font = "11px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "bottom";
      drawCenteredText(context, caption, x + w / 2, y + h - 8, w - 18, 12);
    }
    context.restore();
  }

  function drawCenteredText(context, text, cx, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (context.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const startY = y - (lines.length - 1) * lineHeight;
    for (let i = 0; i < lines.length; i++) {
      context.fillText(lines[i], cx, startY + i * lineHeight);
    }
  }

  function drawSetupColumnOrbit(context, x, y, w, h, titleH, gap, t) {
    drawSetupColumnTitle(context, x, y, w, "궤도 단순화");
    const cardH = (h - titleH - gap * 2) / 3;
    drawSetupCard(context, x, y + titleH, w, cardH, "일반 쌍성계", false, (ctx2, bx, by, bw, bh) => {
      drawGeneralBinary(ctx2, bx, by, bw, bh, t);
    }, "두 별이 공통 질량중심 주위를 운동");
    drawSetupCard(context, x, y + titleH + cardH + gap, w, cardH, "중심별 + 타원 궤도", false, (ctx2, bx, by, bw, bh) => {
      drawSingleOrbitModel(ctx2, bx, by, bw, bh, t, true);
    }, "무거운 별은 거의 정지한다고 단순화");
    drawSetupCard(context, x, y + titleH + (cardH + gap) * 2, w, cardH, "중심별 + 원 궤도", true, (ctx2, bx, by, bw, bh) => {
      drawSingleOrbitModel(ctx2, bx, by, bw, bh, t, false);
    }, "이 시뮬레이션의 궤도 모델");
  }

  function drawSetupColumnSpectrum(context, x, y, w, h, titleH, gap) {
    drawSetupColumnTitle(context, x, y, w, "스펙트럼 단순화");
    const cardH = (h - titleH - gap) / 2;
    drawSetupCard(context, x, y + titleH, w, cardH, "실제 별빛", false, (ctx2, bx, by, bw, bh) => {
      drawMiniSpectrumBlock(ctx2, bx, by + bh * 0.30, bw, bh * 0.34, [0.18, 0.34, 0.47, 0.66, 0.82]);
    }, "연속 스펙트럼 위에 여러 흡수선");
    drawSetupCard(context, x, y + titleH + cardH + gap, w, cardH, "대표 흡수선 하나", true, (ctx2, bx, by, bw, bh) => {
      drawMiniSpectrumBlock(ctx2, bx, by + bh * 0.30, bw, bh * 0.34, [0.50]);
    }, "여러 선 중 하나의 위치만 추적");
  }

  function drawSetupColumnObservation(context, x, y, w, h, titleH, gap, t) {
    drawSetupColumnTitle(context, x, y, w, "관측 방식 선택");
    const noteH = 46;
    const cardH = (h - titleH - noteH - gap) / 2;
    drawSetupCard(context, x, y + titleH, w, cardH, "밝기 변화 관측", false, (ctx2, bx, by, bw, bh) => {
      drawEclipsingObservation(ctx2, bx, by, bw, bh, t);
    }, "식이 생기면 밝기가 주기적으로 변함");
    drawSetupCard(context, x, y + titleH + cardH + gap, w, cardH, "스펙트럼선 이동 관측", true, (ctx2, bx, by, bw, bh) => {
      drawSpectroscopicObservation(ctx2, bx, by, bw, bh, t);
    }, "본 시뮬레이션은 이 관측 신호를 사용");

    context.save();
    context.fillStyle = COLORS.muted;
    context.font = "11px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    drawCenteredText(context, "식쌍성도 스펙트럼선이 움직일 수 있습니다. 여기서는 밝기 변화가 아니라 스펙트럼선 이동을 선택합니다.", x + w / 2, y + h - 22, w - 18, 13);
    context.restore();
  }

  function drawGeneralBinary(context, x, y, w, h, t) {
    const cx = x + w * 0.5;
    const cy = y + h * 0.5;
    const rx1 = w * 0.36;
    const ry1 = h * 0.23;
    const rx2 = w * 0.30;
    const ry2 = h * 0.20;
    const angle = t * Math.PI * 2 * 0.25;
    context.save();
    context.strokeStyle = "rgba(226,232,240,0.46)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.ellipse(cx, cy, rx1, ry1, 0.12, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.ellipse(cx, cy, rx2, ry2, Math.PI + 0.12, 0, Math.PI * 2);
    context.stroke();
    drawFlatCircle(context, cx, cy, 3.5, "rgba(231,237,247,0.75)");
    context.fillStyle = COLORS.muted;
    context.font = "10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("질량중심", cx, cy + 15);
    const p1 = rotatedEllipsePoint(cx, cy, rx1, ry1, 0.12, angle);
    const p2 = rotatedEllipsePoint(cx, cy, rx2, ry2, Math.PI + 0.12, angle + Math.PI);
    drawFlatCircle(context, p1.x, p1.y, 7, COLORS.A, "rgba(255,255,255,0.35)");
    drawFlatCircle(context, p2.x, p2.y, 9, COLORS.B, "rgba(255,255,255,0.35)");
    context.restore();
  }

  function rotatedEllipsePoint(cx, cy, rx, ry, rot, theta) {
    const x0 = rx * Math.cos(theta);
    const y0 = ry * Math.sin(theta);
    return {
      x: cx + x0 * Math.cos(rot) - y0 * Math.sin(rot),
      y: cy + x0 * Math.sin(rot) + y0 * Math.cos(rot)
    };
  }

  function drawSingleOrbitModel(context, x, y, w, h, t, elliptical) {
    const cx = x + w * 0.47;
    const cy = y + h * 0.52;
    const rx = elliptical ? w * 0.34 : Math.min(w, h) * 0.28;
    const ry = elliptical ? h * 0.22 : rx;
    const theta = t * Math.PI * 2 * 0.25 - Math.PI / 5;
    context.save();
    context.strokeStyle = "rgba(226,232,240,0.48)";
    context.lineWidth = 1.6;
    context.beginPath();
    context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    context.stroke();
    drawFlatCircle(context, cx, cy, 10, COLORS.centerStar, "rgba(255,255,255,0.35)");
    const p = { x: cx + rx * Math.cos(theta), y: cy + ry * Math.sin(theta) };
    drawFlatCircle(context, p.x, p.y, 6.5, COLORS.A, "rgba(255,255,255,0.55)");
    context.restore();
  }

  function drawMiniSpectrumBlock(context, x, y, w, h, positions) {
    const gradient = context.createLinearGradient(x, y, x + w, y);
    gradient.addColorStop(0.00, "#456dff");
    gradient.addColorStop(0.25, "#5f72d9");
    gradient.addColorStop(0.50, "#d9e2ef");
    gradient.addColorStop(0.68, "#f0b16b");
    gradient.addColorStop(1.00, "#d74a43");
    context.save();
    context.fillStyle = gradient;
    context.fillRect(x, y, w, h);
    context.strokeStyle = "rgba(255,255,255,0.32)";
    context.lineWidth = 1;
    context.strokeRect(x, y, w, h);
    context.fillStyle = "rgba(2,6,15,0.78)";
    for (const p of positions) {
      const lineW = Math.max(3, w * 0.018);
      context.fillRect(x + w * p - lineW / 2, y, lineW, h);
    }
    context.restore();
  }

  function drawEclipsingObservation(context, x, y, w, h, t) {
    const cx = x + w * 0.25;
    const cy = y + h * 0.48;
    const theta = t * Math.PI * 2 * 0.28;
    const sep = 25 * Math.cos(theta);
    context.save();
    drawFlatCircle(context, cx - sep * 0.45, cy, 14, COLORS.B, "rgba(255,255,255,0.35)");
    drawFlatCircle(context, cx + sep * 0.45, cy, 9, COLORS.A, "rgba(255,255,255,0.35)");
    const eclipse = Math.max(0, 1 - Math.abs(sep) / 25);
    const bx = x + w * 0.60;
    const by = y + h * 0.35;
    const bw = w * 0.30;
    const bh = h * 0.28;
    context.strokeStyle = "rgba(226,232,240,0.35)";
    context.strokeRect(bx, by, bw, bh);
    context.fillStyle = `rgba(231,237,247,${0.90 - eclipse * 0.45})`;
    context.fillRect(bx, by, bw, bh);
    context.fillStyle = COLORS.muted;
    context.font = "10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("밝기", bx + bw / 2, by + bh + 14);
    context.restore();
  }

  function drawSpectroscopicObservation(context, x, y, w, h, t) {
    const cx = x + w * 0.22;
    const cy = y + h * 0.48;
    const orbitR = Math.min(w, h) * 0.17;
    const theta = t * Math.PI * 2 * 0.28;
    context.save();
    context.strokeStyle = "rgba(226,232,240,0.32)";
    context.beginPath();
    context.arc(cx, cy, orbitR, 0, Math.PI * 2);
    context.stroke();
    drawFlatCircle(context, cx, cy, 10, COLORS.centerStar, "rgba(255,255,255,0.28)");
    drawFlatCircle(context, cx + orbitR * Math.cos(theta), cy + orbitR * Math.sin(theta), 7, COLORS.A, "rgba(255,255,255,0.40)");

    const rightX = x + w * 0.52;
    const brightY = y + h * 0.18;
    const brightW = w * 0.40;
    const brightH = h * 0.20;
    context.strokeStyle = "rgba(226,232,240,0.35)";
    context.strokeRect(rightX, brightY, brightW, brightH);
    context.fillStyle = "rgba(231,237,247,0.88)";
    context.fillRect(rightX, brightY, brightW, brightH);
    context.fillStyle = COLORS.muted;
    context.font = "10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("밝기 일정", rightX + brightW / 2, brightY + brightH + 12);

    const sx = rightX;
    const sy = y + h * 0.58;
    const sw = brightW;
    const sh = h * 0.22;
    const shift = 0.5 + 0.25 * Math.cos(theta);
    drawMiniSpectrumBlock(context, sx, sy, sw, sh, [shift]);
    context.fillStyle = COLORS.muted;
    context.font = "10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("스펙트럼선 이동", sx + sw / 2, sy + sh + 12);
    context.restore();
  }


  function drawTutorialWavefrontScene(context, width, sceneH, mode) {
    const y = sceneH * 0.52;
    const starBaseX = width * 0.18;
    const observerX = width * 0.84;
    const t = state.time * 1.8;
    let starX = starBaseX;
    let arrow = 0;
    let spacing = 42;
    let label = "같은 간격의 파면";
    let lineColor = "rgba(226,232,240,0.85)";

    if (mode === "blue") {
      starX = starBaseX + Math.sin(t) * 8 + 18;
      arrow = 1;
      spacing = 30;
      label = "도착 간격이 짧아짐";
      lineColor = "#8fb2ff";
    } else if (mode === "red") {
      starX = starBaseX + Math.sin(t) * 8 - 8;
      arrow = -1;
      spacing = 55;
      label = "도착 간격이 길어짐";
      lineColor = "#ffba82";
    } else if (mode === "two") {
      spacing = 34;
      label = "서로 다른 파면열이 함께 도착";
      lineColor = "rgba(226,232,240,0.88)";
    }

    context.save();
    context.strokeStyle = "rgba(226,232,240,0.18)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(width * 0.08, y);
    context.lineTo(observerX - 20, y);
    context.stroke();

    drawFlatCircle(context, starX, y, 9, mode === "red" ? "#ffb15c" : "#5aa9ff", "rgba(255,255,255,0.45)", 1.2);
    context.fillStyle = COLORS.muted;
    context.font = "11px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("공전하는 별", starX, y + 25);

    drawFlatCircle(context, observerX, y - 18, 7, "#e7edf7");
    context.fillStyle = "#e7edf7";
    context.fillRect(observerX - 3.5, y - 11, 7, 23);
    context.fillStyle = COLORS.muted;
    context.fillText("관측자", observerX, y + 25);

    if (arrow !== 0) {
      context.strokeStyle = lineColor;
      context.fillStyle = lineColor;
      context.lineWidth = 2;
      const ax0 = starX + (arrow > 0 ? 16 : -16);
      const ax1 = starX + (arrow > 0 ? 46 : -46);
      context.beginPath();
      context.moveTo(ax0, y - 28);
      context.lineTo(ax1, y - 28);
      context.stroke();
      context.beginPath();
      context.moveTo(ax1, y - 28);
      context.lineTo(ax1 - arrow * 8, y - 33);
      context.lineTo(ax1 - arrow * 8, y - 23);
      context.closePath();
      context.fill();
    }

    const offset = positiveMod(t * 20, spacing);
    for (let x = observerX - 42 - offset; x > starX + 34; x -= spacing) {
      drawWavefrontArc(context, x, y, 12, lineColor, 0.88);
    }
    if (mode === "two") {
      for (let x = observerX - 62 - positiveMod(t * 28, spacing + 17); x > starX + 34; x -= spacing + 17) {
        drawWavefrontArc(context, x, y - 12, 11, "#ffb15c", 0.78);
      }
    }

    context.fillStyle = COLORS.text;
    context.font = "700 13px system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(label, width * 0.08, 12);
    context.restore();
  }

  function drawTutorialEMWave(context, width, height, splitY, mode) {
    const waveY = splitY + (height - splitY) * 0.45;
    const x0 = width * 0.09;
    const x1 = width * 0.91;
    let wavelength = 48;
    let label = "기준 파장 λ₀";
    let stroke = "rgba(226,232,240,0.88)";
    if (mode === "blue") {
      wavelength = 34;
      label = "짧아진 파장";
      stroke = "#8fb2ff";
    } else if (mode === "red") {
      wavelength = 70;
      label = "길어진 파장";
      stroke = "#ffba82";
    } else if (mode === "two") {
      wavelength = 36;
      label = "두 파장 성분이 동시에 보일 수 있음";
      stroke = "#8fb2ff";
    }

    context.save();
    context.strokeStyle = "rgba(148,163,184,0.24)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x0, waveY);
    context.lineTo(x1, waveY);
    context.stroke();

    drawSineWave(context, x0, x1, waveY, wavelength, 15, stroke, 2.2, 0);
    if (mode === "two") {
      drawSineWave(context, x0, x1, waveY, 64, 11, "#ffb15c", 2, Math.PI / 3);
    }

    context.fillStyle = COLORS.muted;
    context.font = "11px system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText("전자기파 모식도", x0, splitY + 8);
    context.textAlign = "right";
    context.fillText(label, x1, splitY + 8);
    context.restore();
  }

  function drawSineWave(context, x0, x1, y, wavelength, amp, stroke, lineWidth, phase = 0) {
    context.save();
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.lineCap = "round";
    context.beginPath();
    const t = state.time * 5;
    for (let i = 0; i <= 220; i++) {
      const x = x0 + (x1 - x0) * i / 220;
      const yy = y + Math.sin((x - x0) / wavelength * Math.PI * 2 - t + phase) * amp;
      if (i === 0) context.moveTo(x, yy);
      else context.lineTo(x, yy);
    }
    context.stroke();
    context.restore();
  }

  state.sims.B.distLog = state.sims.A.distLog;
  setupEvents();
  setupInfoDots();
  syncInputsFromState();
  recomputeSpectra();
  requestAnimationFrame(drawAll);

  try {
    if (localStorage.getItem("deSitterSpectrumTutorialSeen") !== "1") {
      setTimeout(() => openTutorial(0), 350);
    }
  } catch (err) {
    setTimeout(() => openTutorial(0), 350);
  }
})();
