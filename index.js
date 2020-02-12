#!/usr/bin/env node

"use strict";

const fs = require("fs");
const semver = require("semver");
const superagent = require("superagent");

const loadPkg = () => JSON.parse(fs.readFileSync("./package.json").toString());

async function fetchDistTags(name) {
  const packageUrl = `https://registry.npmjs.org/${name}`;

  let res;
  try {
    res = await superagent.get(packageUrl);
  }
  catch (ex) {
    if (ex.status !== 404) {
      throw ex;
    }

    // The package has never been published. So there are no old dist tags to
    // get.
    return {};
  }

  return res.body["dist-tags"];
}

exports.fetchDistTags = fetchDistTags;

function computeTag(newVersion, distTags) {
  let tag = "latest";

  const pre = semver.prerelease(newVersion);
  if (pre !== null) {
    tag = {
      alpha: "dev",
      beta: "dev",
      rc: "next",
    }[pre[0]];

    if (tag === undefined) {
      throw new Error("cannot parse prerelease");
    }
  }

  const oldDistVersion = distTags[tag];
  return oldDistVersion !== undefined && semver.gt(oldDistVersion, newVersion) ?
    "patch" :
    tag;
}

exports.computeTag = computeTag;

async function main() {
  const pkg = loadPkg();

  const { version, name } = pkg;

  if (name === undefined) {
    throw new Error("the package.json file must have a name field");
  }

  if (version === undefined) {
    throw new Error("the package.json file must have a version field");
  }

  return computeTag(version, await fetchDistTags(name));
}

exports.main = main;

async function cli() {
  // eslint-disable-next-line no-console
  console.log(await main());
}

cli();
