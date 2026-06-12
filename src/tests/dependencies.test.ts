import type { Labrinth } from "@modrinth/api-client";
import {
  beforeEach,
  describe,
  expect,
  type MockedFunction,
  test,
  vi,
} from "vitest";

import { resolveDependencies } from "@/modrinth/versions";

function makeFile(filename: string): Labrinth.Versions.v2.VersionFile {
  return {
    hashes: { sha512: "abc", sha1: "def" },
    url: `https://cdn.modrinth.com/data/${filename}`,
    filename,
    primary: true,
    size: 1024,
  };
}

function makeVersion(
  id: string,
  projectId: string,
  versionNumber: string,
  deps: Labrinth.Versions.v2.Dependency[] = []
): Labrinth.Versions.v2.Version {
  return {
    id,
    project_id: projectId,
    author_id: "author",
    featured: false,
    name: versionNumber,
    version_number: versionNumber,
    changelog: "",
    date_published: "2024-01-01T00:00:00Z",
    downloads: 0,
    version_type: "release",
    status: "listed",
    files: [makeFile(`${id}.jar`)],
    dependencies: deps,
    game_versions: ["1.20.1"],
    loaders: ["fabric"],
  };
}

function makeProject(id: string, slug: string): Labrinth.Projects.v2.Project {
  return {
    id,
    slug,
    title: slug,
    description: "",
    body: "",
    categories: [],
    additional_categories: [],
    client_side: "required",
    server_side: "optional",
    status: "approved",
    license: { id: "MIT", name: "MIT" },
    project_type: "mod",
    downloads: 0,
    followers: 0,
    game_versions: ["1.20.1"],
    loaders: ["fabric"],
    versions: [],
    published: "2024-01-01T00:00:00Z",
    updated: "2024-01-01T00:00:00Z",
    actualProjectType: "mod",
    team: "",
    organization: null,
    thread_id: "",
    monetization_status: "monetized",
  } as Labrinth.Projects.v2.Project;
}

// mock modrinthClient and resolve
vi.mock("@/modrinth/client", () => ({
  modrinthClient: {
    labrinth: {
      versions_v2: {
        getVersion: vi.fn(),
        getProjectVersions: vi.fn(),
      },
    },
  },
  USER_AGENT: "test",
}));

vi.mock("@/modrinth/projects", () => ({
  resolve: vi.fn(),
}));

async function getVersionsMock() {
  const { modrinthClient } = await import("@/modrinth/client");
  return {
    getVersion: modrinthClient.labrinth.versions_v2
      .getVersion as MockedFunction<
      typeof modrinthClient.labrinth.versions_v2.getVersion
    >,
    getProjectVersions: modrinthClient.labrinth.versions_v2
      .getProjectVersions as MockedFunction<
      typeof modrinthClient.labrinth.versions_v2.getProjectVersions
    >,
  };
}

async function getResolveMock() {
  const { resolve } = await import("@/modrinth/projects");
  return resolve as MockedFunction<typeof resolve>;
}

describe("resolveDependencies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns empty array when version has no dependencies", async () => {
    const root = makeVersion("root-v1", "root-proj", "1.0.0");
    const warnings: string[] = [];

    const result = await resolveDependencies(root, {}, (m) => warnings.push(m));

    expect(result).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  test("skips optional, incompatible, and embedded dependencies", async () => {
    const root = makeVersion("root-v1", "root-proj", "1.0.0", [
      { dependency_type: "optional", project_id: "opt-proj" },
      { dependency_type: "incompatible", project_id: "incompat-proj" },
      { dependency_type: "embedded", project_id: "embed-proj" },
    ]);
    const warnings: string[] = [];

    const result = await resolveDependencies(root, {}, (m) => warnings.push(m));

    expect(result).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  test("resolves a required dependency by version_id", async () => {
    const depVersion = makeVersion("dep-v1", "dep-proj", "2.0.0");
    const depProject = makeProject("dep-proj", "dep-slug");
    const root = makeVersion("root-v1", "root-proj", "1.0.0", [
      {
        dependency_type: "required",
        version_id: "dep-v1",
        project_id: "dep-proj",
      },
    ]);

    const { getVersion } = await getVersionsMock();
    const resolveMock = await getResolveMock();

    getVersion.mockResolvedValueOnce(depVersion);
    resolveMock.mockResolvedValueOnce({
      resolution: "direct",
      project: depProject,
      candidates: [],
    });

    const warnings: string[] = [];
    const result = await resolveDependencies(root, {}, (m) => warnings.push(m));

    expect(result).toHaveLength(1);
    expect(result[0]?.project.slug).toBe("dep-slug");
    expect(result[0]?.version.version_number).toBe("2.0.0");
    expect(warnings).toHaveLength(0);
  });

  test("resolves a required dependency by project_id using constraints", async () => {
    const depVersion = makeVersion("dep-v1", "dep-proj", "2.0.0");
    const depProject = makeProject("dep-proj", "dep-slug");
    const root = makeVersion("root-v1", "root-proj", "1.0.0", [
      { dependency_type: "required", project_id: "dep-proj" },
    ]);

    const { getProjectVersions } = await getVersionsMock();
    const resolveMock = await getResolveMock();

    getProjectVersions.mockResolvedValueOnce([depVersion]);
    resolveMock.mockResolvedValueOnce({
      resolution: "direct",
      project: depProject,
      candidates: [],
    });

    const warnings: string[] = [];
    const result = await resolveDependencies(
      root,
      { gameVersion: "1.20.1", loader: "fabric" },
      (m) => warnings.push(m)
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.project.slug).toBe("dep-slug");
    expect(getProjectVersions).toHaveBeenCalledWith("dep-proj", {
      game_versions: ["1.20.1"],
      loaders: ["fabric"],
      include_changelog: false,
      limit: 100,
      offset: 0,
    });
    expect(warnings).toHaveLength(0);
  });

  test("deduplicates: does not download the same project twice", async () => {
    const depVersion = makeVersion("dep-v1", "dep-proj", "2.0.0");
    const depProject = makeProject("dep-proj", "dep-slug");
    // two dependencies pointing at the same project
    const root = makeVersion("root-v1", "root-proj", "1.0.0", [
      {
        dependency_type: "required",
        version_id: "dep-v1",
        project_id: "dep-proj",
      },
      { dependency_type: "required", project_id: "dep-proj" },
    ]);

    const { getVersion } = await getVersionsMock();
    const resolveMock = await getResolveMock();

    getVersion.mockResolvedValueOnce(depVersion);
    resolveMock.mockResolvedValueOnce({
      resolution: "direct",
      project: depProject,
      candidates: [],
    });

    const warnings: string[] = [];
    const result = await resolveDependencies(root, {}, (m) => warnings.push(m));

    // should only appear once despite two entries pointing to the same project
    expect(result).toHaveLength(1);
    expect(getVersion).toHaveBeenCalledTimes(1);
  });

  test("dedupes by resolved project id when a dependency is declared only by version_id", async () => {
    const depVersion = makeVersion("dep-v1", "dep-proj", "2.0.0");
    const depProject = makeProject("dep-proj", "dep-slug");
    const root = makeVersion("root-v1", "root-proj", "1.0.0", [
      { dependency_type: "required", project_id: "dep-proj" },
      { dependency_type: "required", version_id: "dep-v1" },
    ]);

    const { getVersion, getProjectVersions } = await getVersionsMock();
    const resolveMock = await getResolveMock();

    getProjectVersions.mockResolvedValueOnce([depVersion]);
    getVersion.mockResolvedValueOnce(depVersion);
    resolveMock.mockResolvedValue({
      resolution: "direct",
      project: depProject,
      candidates: [],
    });

    const warnings: string[] = [];
    const result = await resolveDependencies(root, {}, (m) => warnings.push(m));

    expect(result).toHaveLength(1);
    expect(result[0]?.project.slug).toBe("dep-slug");
    expect(warnings).toHaveLength(0);
  });

  test("guards against cycles: root project is never re-downloaded as its own dependency", async () => {
    const root = makeVersion("root-v1", "root-proj", "1.0.0", [
      { dependency_type: "required", project_id: "root-proj" },
    ]);
    const warnings: string[] = [];

    const result = await resolveDependencies(root, {}, (m) => warnings.push(m));

    expect(result).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  test("emits warning and continues when a dependency cannot be resolved", async () => {
    const goodDepVersion = makeVersion("good-v1", "good-proj", "3.0.0");
    const goodProject = makeProject("good-proj", "good-slug");
    const root = makeVersion("root-v1", "root-proj", "1.0.0", [
      {
        dependency_type: "required",
        version_id: "bad-v1",
        project_id: "bad-proj",
      },
      {
        dependency_type: "required",
        version_id: "good-v1",
        project_id: "good-proj",
      },
    ]);

    const { getVersion } = await getVersionsMock();
    const resolveMock = await getResolveMock();

    getVersion
      .mockRejectedValueOnce(new Error("Not Found"))
      .mockResolvedValueOnce(goodDepVersion);
    resolveMock.mockResolvedValueOnce({
      resolution: "direct",
      project: goodProject,
      candidates: [],
    });

    const warnings: string[] = [];
    const result = await resolveDependencies(root, {}, (m) => warnings.push(m));

    // good dependency still downloaded
    expect(result).toHaveLength(1);
    expect(result[0]?.project.slug).toBe("good-slug");

    // warning emitted for bad dependency
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("bad-v1");
    expect(warnings[0]).toContain("Not Found");
  });

  test("resolves transitive dependencies", async () => {
    const transDepVersion = makeVersion("trans-v1", "trans-proj", "4.0.0");
    const transProject = makeProject("trans-proj", "trans-slug");
    // dep-v1 itself has a required dep on trans-proj
    const depVersion = makeVersion("dep-v1", "dep-proj", "2.0.0", [
      {
        dependency_type: "required",
        version_id: "trans-v1",
        project_id: "trans-proj",
      },
    ]);
    const depProject = makeProject("dep-proj", "dep-slug");
    const root = makeVersion("root-v1", "root-proj", "1.0.0", [
      {
        dependency_type: "required",
        version_id: "dep-v1",
        project_id: "dep-proj",
      },
    ]);

    const { getVersion } = await getVersionsMock();
    const resolveMock = await getResolveMock();

    getVersion
      .mockResolvedValueOnce(depVersion)
      .mockResolvedValueOnce(transDepVersion);
    resolveMock
      .mockResolvedValueOnce({
        resolution: "direct",
        project: depProject,
        candidates: [],
      })
      .mockResolvedValueOnce({
        resolution: "direct",
        project: transProject,
        candidates: [],
      });

    const warnings: string[] = [];
    const result = await resolveDependencies(root, {}, (m) => warnings.push(m));

    expect(result).toHaveLength(2);
    const slugs = result.map((r) => r.project.slug);
    expect(slugs).toContain("dep-slug");
    expect(slugs).toContain("trans-slug");
    expect(warnings).toHaveLength(0);
  });
});
