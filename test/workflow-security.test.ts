// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

const workflows = readdirSync(".github/workflows").filter((file) => file.endsWith(".yml"))
  .map((file) => [file, parse(readFileSync(`.github/workflows/${file}`, "utf8"))] as const);
const ci = workflows.find(([file]) => file === "ci.yml")![1];
const release = workflows.find(([file]) => file === "release.yml")![1];

describe("workflow security boundaries", () => {
  it("pins actions, limits jobs and avoids persisted checkout credentials", () => {
    const refs = new Map<string, string>();
    for (const [, workflow] of workflows) {
      expect(workflow.on).not.toHaveProperty("pull_request_target");
      expect(workflow.permissions.contents).toBe("read");
      for (const job of Object.values<any>(workflow.jobs)) {
        expect(job["timeout-minutes"]).toBeGreaterThan(0);
        expect(job["timeout-minutes"]).toBeLessThanOrEqual(30);
        for (const step of job.steps ?? []) {
          if (!step.uses || step.uses.startsWith("./")) continue;
          const [action, ref] = step.uses.split("@");
          expect(ref, action).toMatch(/^[a-f0-9]{40}$/);
          if (refs.has(action)) expect(ref).toBe(refs.get(action));
          refs.set(action, ref);
          if (action === "actions/checkout") expect(step.with["persist-credentials"]).toBe(false);
        }
      }
    }
  });

  it("keeps the protected test check stable across the Node matrix", () => {
    expect(ci.jobs["node-checks"].strategy.matrix.node).toEqual([22, 24, 26]);
    expect(ci.jobs.test.needs).toEqual(["node-checks", "ha-components"]);
    expect(ci.jobs.test.if).toBe("always()");
    expect(ci.jobs.test.steps[0].env.NODE_RESULT).toBe("${{ needs.node-checks.result }}");
    expect(ci.jobs.test.steps[0].env.HA_RESULT).toBe("${{ needs.ha-components.result }}");
    expect(ci.jobs.test.steps[0].run).toBe('test "$NODE_RESULT" = success && test "$HA_RESULT" = success');
  });

  it("runs publication only after the read-only build succeeds", () => {
    expect(release.jobs.release.permissions?.contents ?? release.permissions.contents).toBe("read");
    const publish = release.jobs.publish;
    expect(publish.needs).toBe("release");
    expect(publish.if).toBe("startsWith(github.ref, 'refs/tags/')");
    expect(publish.permissions.contents).toBe("write");
    expect(publish.steps.every((step: any) => !step.run)).toBe(true);
    expect(publish.steps[0].uses).toMatch(/^actions\/download-artifact@/);
    expect(publish.steps[0].with.name).toBe("ha-unifi-drive-card");
    expect(publish.steps[1].with.body_path).toBe("release/release-notes.md");
    expect(release.concurrency["cancel-in-progress"]).toBe(false);
  });

  it("schedules grouped maintenance without excluding security updates", () => {
    const dependabot = parse(readFileSync(".github/dependabot.yml", "utf8"));
    expect(dependabot.updates.map((update: any) => update["package-ecosystem"]).sort())
      .toEqual(["github-actions", "npm"]);
    for (const update of dependabot.updates) {
      expect(update.schedule.interval).toBe("quarterly");
      expect(update["open-pull-requests-limit"]).toBe(1);
      expect(Object.values<any>(update.groups).some((group) => group["applies-to"] === "security-updates"))
        .toBe(true);
      for (const ignore of update.ignore ?? []) {
        expect(ignore).not.toHaveProperty("versions");
        expect(ignore["update-types"].every((type: string) => type.startsWith("version-update:")))
          .toBe(true);
      }
    }
  });
});
