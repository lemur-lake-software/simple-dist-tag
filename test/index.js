"use strict";

const chai = require("chai");
const { expectRejection, use } = require("expect-rejection");
const mockFs = require("mock-fs");
const nock = require("nock");

const { expect } = chai;

use(chai);

const { computeTag, main } = require("..");

describe("computeTag", () => {
  // eslint-disable-next-line no-shadow
  function test(title, version, distTags, expected) {
    it(`${title} returns ${expected}`, async () => {
      expect(computeTag(version, distTags)).to.deep.equal(expected);
    });
  }

  describe("when latest has never been published", () => {
    test("on new stable", "1.2.3", {}, "latest");
    test("on new dev release", "1.2.3-beta.1", {}, "dev");
    test("on new next release", "1.2.3-rc.1", {}, "next");
  });

  describe("when latest has been published", () => {
    test("on new stable", "1.2.3", { latest: "1.0.0" }, "latest");
    test("on old stable", "1.2.3", { latest: "1.2.4" }, "patch");

    describe("and latest is a dev release", () => {
      const distTags = { latest: "1.2.4-alpha.0" };
      test("on old stable", "1.2.3", distTags, "patch");
      test("on new stable", "1.2.4", distTags, "latest");
    });

    describe("and latest is a next release", () => {
      const distTags = { latest: "1.2.4-rc.0" };
      test("on old stable", "1.2.3", distTags, "patch");
      test("on new stable", "1.2.4", distTags, "latest");
    });

    describe("and the dev dist tag has been used", () => {
      const distTags = { latest: "0.0.0", dev: "1.2.3-alpha.1" };
      test("on new dev release", "1.2.3-alpha.2", distTags, "dev");
      test("on old dev release", "1.2.3-alpha.0", distTags, "patch");
    });

    describe("and the next dist tag has been used", () => {
      const distTags = { latest: "0.0.0", next: "1.2.3-rc.1" };
      test("on new next release", "1.2.3-rc.2", distTags, "next");
      test("on old next release", "1.2.3-rc.0", distTags, "patch");
    });

    describe("and the dev dist tag has not been used", () => {
      test("on new dev release", "1.2.3-alpha.0",
           { latest: "0.0.0", foo: "1.2.3-alpha.1" }, "dev");
    });

    describe("and the dev dist tag has not been used", () => {
      test("on new dev release", "1.2.3-rc.0",
           { latest: "0.0.0", foo: "1.2.3-alpha.1" }, "next");
    });
  });
});

describe("main", () => {
  afterEach(() => {
    mockFs.restore();
  });

  const makeNock = () => nock("https://registry.npmjs.org/")
      .get("/foo");

  it("throws when there is no package", async () => {
    mockFs({});
    await expectRejection(main(), Error);
  });

  it("throws when the package has no package name", async () => {
    mockFs({
      "package.json": JSON.stringify({
      }),
    });
    await expectRejection(main(), Error,
                          "the package.json file must have a name field");
  });

  it("throws when the package has no version", async () => {
    mockFs({
      "package.json": JSON.stringify({
        name: "foo",
      }),
    });
    await expectRejection(main(), Error,
                          "the package.json file must have a version field");
  });

  it("first stable release", async () => {
    mockFs({
      "package.json": JSON.stringify({
        name: "foo",
        version: "1.2.4",
      }),
    });

    const scope = makeNock().reply(404);
    expect(await main()).to.equal("latest");
    scope.done();
  });

  it("first dev release", async () => {
    mockFs({
      "package.json": JSON.stringify({
        name: "foo",
        version: "1.2.4-beta.1",
      }),
    });

    const scope = makeNock().reply(404);
    expect(await main()).to.equal("dev");
    scope.done();
  });

  it("first next release", async () => {
    mockFs({
      "package.json": JSON.stringify({
        name: "foo",
        version: "1.2.4-rc.1",
      }),
    });

    const scope = makeNock().reply(404);
    expect(await main()).to.equal("next");
    scope.done();
  });

  it("later stable release", async () => {
    mockFs({
      "package.json": JSON.stringify({
        name: "foo",
        version: "1.2.4",
      }),
    });

    const scope = makeNock()
          .reply(200, {
            "description": "Foo",
            "name": "foo",
            "dist-tags": {
              latest: "1.2.3",
            },
          });

    expect(await main()).to.equal("latest");
    scope.done();
  });

  it("stable patch release", async () => {
    mockFs({
      "package.json": JSON.stringify({
        name: "foo",
        version: "1.0.5",
      }),
    });
    const scope = makeNock()
          .reply(200, {
            "description": "Foo",
            "name": "foo",
            "dist-tags": {
              latest: "1.2.3",
            },
          });

    expect(await main()).to.equal("patch");
    scope.done();
  });

  it("stable patch release", async () => {
    mockFs({
      "package.json": JSON.stringify({
        name: "foo",
        version: "1.0.5",
      }),
    });
    const scope = makeNock()
          .reply(200, {
            "description": "Foo",
            "name": "foo",
            "dist-tags": {
              latest: "1.2.3",
            },
          });

    expect(await main()).to.equal("patch");
    scope.done();
  });

  it("dev release", async () => {
    mockFs({
      "package.json": JSON.stringify({
        name: "foo",
        version: "1.2.4-beta.1",
      }),
    });

    const scope = makeNock()
          .reply(200, {
            "description": "Foo",
            "name": "foo",
            "dist-tags": {
              latest: "1.2.3",
            },
          });
    expect(await main()).to.equal("dev");
    scope.done();
  });

  it("dev patch release", async () => {
    mockFs({
      "package.json": JSON.stringify({
        name: "foo",
        version: "1.2.4-beta.1",
      }),
    });

    const scope = makeNock()
          .reply(200, {
            "description": "Foo",
            "name": "foo",
            "dist-tags": {
              latest: "0.0.0",
              dev: "1.2.3",
            },
          });

    expect(await main()).to.equal("dev");
    scope.done();
  });

  it("dev patch release", async () => {
    mockFs({
      "package.json": JSON.stringify({
        name: "foo",
        version: "1.2.3-beta.1",
      }),
    });

    const scope = makeNock()
      .reply(200, {
        "description": "Foo",
        "name": "foo",
        "dist-tags": {
          latest: "0.0.0",
          dev: "1.2.3",
        },
      });

    expect(await main()).to.equal("patch");
    scope.done();
  });

  it("next release", async () => {
    mockFs({
      "package.json": JSON.stringify({
        name: "foo",
        version: "1.2.4-rc.1",
      }),
    });
    const scope = makeNock()
      .reply(200, {
        "description": "Foo",
        "name": "foo",
        "dist-tags": {
          latest: "1.2.3",
        },
      });

    expect(await main()).to.equal("next");
    scope.done();
  });

  it("next patch release", async () => {
    mockFs({
      "package.json": JSON.stringify({
        name: "foo",
        version: "1.2.4-rc.1",
      }),
    });
    const scope = makeNock()
      .reply(200, {
        "description": "Foo",
        "name": "foo",
        "dist-tags": {
          latest: "1.2.3",
          next: "1.2.3",
        },
      });

    expect(await main()).to.equal("next");
    scope.done();
  });

  it("next patch release", async () => {
    mockFs({
      "package.json": JSON.stringify({
        name: "foo",
        version: "1.2.4-rc.1",
      }),
    });

    const scope = makeNock()
      .reply(200, {
        "description": "Foo",
        "name": "foo",
        "dist-tags": {
          latest: "1.2.3",
          next: "1.2.4",
        },
      });

    expect(await main()).to.equal("patch");
    scope.done();
  });
});
