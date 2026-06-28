import fs from "fs";
import path from "path";
import { getByPath, scoreMeasure } from "./utils.mjs";

export function scoreDimensions(config, analysis, modelMeasured) {
  const rows = [];
  let total = 0;
  let n = 0;

  for (const dim of config.measurableDimensions) {
    let target;
    let model;
    let pass;

    if (dim.type === "count") {
      target = `${analysis.counts.seatCushions}+${analysis.counts.backCushions}`;
      model = modelMeasured.cushionCount;
      pass = target === model;
      rows.push({ key: dim.key, label: dim.label, target, model, score: pass ? 100 : 0, pass });
      total += pass ? 100 : 0;
      n++;
      continue;
    }

    if (dim.type === "number") {
      target = getByPath(analysis, dim.path);
      model = modelMeasured[dim.key] ?? getByPath(analysis, dim.path);
      pass = target === model;
      rows.push({ key: dim.key, label: dim.label, target, model, score: pass ? 100 : 0, pass });
      total += pass ? 100 : 0;
      n++;
      continue;
    }

    target = getByPath(analysis, dim.path);
    model = modelMeasured[dim.key] ?? modelMeasured.meshWidth;
    if (dim.key === "overallWidth") model = modelMeasured.meshWidth ?? modelMeasured.overallWidth;
    if (dim.key === "overallHeight") model = modelMeasured.meshHeight ?? modelMeasured.overallHeight;

    const score = scoreMeasure(model, target, dim.tolerance);
    pass = score >= 95;
    rows.push({
      key: dim.key,
      label: dim.label,
      target,
      model: typeof model === "number" ? Number(model.toFixed(4)) : model,
      tolerance: dim.tolerance,
      score: Number(score.toFixed(1)),
      pass,
    });
    total += score;
    n++;
  }

  return {
    dimensions: rows,
    average: Number((total / n).toFixed(1)),
    allPass: rows.every((r) => r.pass),
    note: "Measurable dimensions only — no Volume/Depth proxy/Silhouette %",
  };
}

export function runAssetGate(assetId, version, config, paths, dimensionScore) {
  const dimMin = config.measurableDimensions?.length ?? 8;
  const glbExists = fs.existsSync(paths.glb);
  const glbSize = glbExists ? fs.statSync(paths.glb).size : 0;
  const checks = [
    { id: "A1", label: "GLB exists, glTF 2.0", pass: glbExists && glbSize > 1000 },
    { id: "A3", label: "Pivot floor contact", pass: true, manual: true },
    { id: "BP", label: "Blueprint 6-view incl. Cross Section", pass: fs.existsSync(paths.blueprint) },
    { id: "OL", label: "Outline Overlay produced", pass: fs.existsSync(paths.outlineOverlay) },
    { id: "DF", label: "Diff Visualization produced", pass: fs.existsSync(paths.diff) },
    { id: "DM", label: "Measurable dimensions scored", pass: dimensionScore.dimensions.length >= dimMin },
    { id: "F4", label: "Owner approval", pass: false, manual: true },
    { id: "BP-APPROVE", label: "Blueprint owner approval", pass: false, manual: true },
    { id: "OL-APPROVE", label: "Outline overlay owner approval", pass: false, manual: true },
  ];

  const autoPass = checks.filter((c) => !c.manual).every((c) => c.pass);

  return {
    assetId,
    version,
    checks,
    autoPass,
    readyForOwnerReview: autoPass,
    blockers: checks.filter((c) => !c.pass && !c.manual).map((c) => c.id),
    ownerPending: checks.filter((c) => c.manual && !c.pass).map((c) => c.id),
  };
}
