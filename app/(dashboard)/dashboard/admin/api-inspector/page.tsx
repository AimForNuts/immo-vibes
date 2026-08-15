"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clipboard, Play, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ParamConfig = {
  name: string;
  source: "path" | "query";
  type: "string" | "number" | "boolean";
  required: boolean;
  testValues: Array<string | number | boolean>;
  defaultTestValue?: string | number | boolean;
  notes?: string;
};

type SpecConfig = {
  key: string;
  label: string;
  method: "GET";
  pathTemplate: string;
  params: ParamConfig[];
  notes?: string;
};

type SpecRow = {
  key: string;
  label: string;
  method: string;
  pathTemplate: string;
  config: SpecConfig;
  notes: string | null;
  updatedAt: string;
};

type SchemaRow = {
  endpointKey: string;
  activeSchema: unknown;
  manualSchema: unknown;
  inferredSchema: unknown;
  deprecatedFields: string[];
  version: number;
  lastSeenAt: string | null;
  updatedAt: string;
};

type ObservationRow = {
  id: string;
  endpointKey: string;
  params: Record<string, string | number | boolean>;
  statusCode: number;
  durationMs: number;
  inferredSchema: unknown;
  newFields: string[];
  missingFields: string[];
  typeConflicts: Array<{ path: string; previous: string; next: string }>;
  createdAt: string;
};

type InspectorState = {
  specs: SpecRow[];
  schemas: SchemaRow[];
  observations: ObservationRow[];
};

type RunResult = {
  response: unknown;
  inferredSchema: unknown;
  path: string;
  diff: {
    newFields: string[];
    missingFields: string[];
    typeConflicts: Array<{ path: string; previous: string; next: string }>;
  };
  observation: ObservationRow;
  spec: SpecRow;
  currentSchema: SchemaRow | null;
};

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function formatTime(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ApiInspectorPage() {
  const [state, setState] = useState<InspectorState>({ specs: [], schemas: [], observations: [] });
  const [selectedKey, setSelectedKey] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [schemaDraft, setSchemaDraft] = useState("");
  const [configDraft, setConfigDraft] = useState("");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSpec = useMemo(
    () => state.specs.find((spec) => spec.key === selectedKey) ?? state.specs[0],
    [selectedKey, state.specs]
  );
  const selectedSchema = useMemo(
    () => state.schemas.find((schema) => schema.endpointKey === selectedSpec?.key) ?? null,
    [selectedSpec?.key, state.schemas]
  );
  const selectedObservations = useMemo(
    () => state.observations.filter((observation) => observation.endpointKey === selectedSpec?.key),
    [selectedSpec?.key, state.observations]
  );

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/api-inspector", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load API inspector");
      const data = await res.json() as InspectorState;
      setState(data);
      setSelectedKey((current) => current || data.specs[0]?.key || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API inspector");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    if (!selectedSpec) return;
    const defaults: Record<string, string> = {};
    for (const param of selectedSpec.config.params) {
      const value = param.defaultTestValue ?? param.testValues[0] ?? "";
      defaults[param.name] = String(value);
    }
    setParams(defaults);
    setConfigDraft(pretty(selectedSpec.config));
    setSchemaDraft(pretty(selectedSchema?.activeSchema ?? runResult?.inferredSchema ?? {}));
  }, [selectedSpec, selectedSchema?.activeSchema]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runEndpoint() {
    if (!selectedSpec) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/api-inspector/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointKey: selectedSpec.key, params }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to run endpoint");
      setRunResult(data as RunResult);
      setSchemaDraft(pretty((data as RunResult).inferredSchema));
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run endpoint");
    } finally {
      setRunning(false);
    }
  }

  async function saveSchema(action: "save" | "merge" | "override" | "deprecate") {
    if (!selectedSpec) return;
    setSaving(true);
    setError(null);
    try {
      const schema = JSON.parse(schemaDraft) as unknown;
      const body = action === "deprecate"
        ? { endpointKey: selectedSpec.key, action, fields: runResult?.diff.missingFields ?? [] }
        : { endpointKey: selectedSpec.key, action, schema };
      const res = await fetch("/api/admin/api-inspector/schema", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save schema");
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schema");
    } finally {
      setSaving(false);
    }
  }

  async function saveConfig() {
    if (!selectedSpec) return;
    setSaving(true);
    setError(null);
    try {
      const config = JSON.parse(configDraft) as SpecConfig;
      const res = await fetch("/api/admin/api-inspector/schema", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointKey: selectedSpec.key, action: "save-spec", config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save endpoint config");
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save endpoint config");
    } finally {
      setSaving(false);
    }
  }

  async function copyText(value: unknown) {
    await navigator.clipboard.writeText(typeof value === "string" ? value : pretty(value));
  }

  if (loading && state.specs.length === 0) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">API Inspector</h1>
          <p className="text-sm text-muted-foreground">Run curated IdleMMO endpoints and maintain editable typed response schemas.</p>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={loadState} disabled={loading}>
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <section className="space-y-4">
          <div className="rounded-lg border border-border p-3">
            <label className="text-xs font-medium uppercase text-muted-foreground">Endpoint</label>
            <select
              className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={selectedSpec?.key ?? ""}
              onChange={(event) => {
                setSelectedKey(event.target.value);
                setRunResult(null);
              }}
            >
              {state.specs.map((spec) => (
                <option key={spec.key} value={spec.key}>{spec.label}</option>
              ))}
            </select>
            {selectedSpec && (
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p className="font-mono">{selectedSpec.config.method} {selectedSpec.config.pathTemplate}</p>
                <p>Schema v{selectedSchema?.version ?? 0} - Last seen {formatTime(selectedSchema?.lastSeenAt ?? null)}</p>
              </div>
            )}
          </div>

          {selectedSpec && (
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Test Values</h2>
                <Button size="sm" className="h-8 gap-1.5" onClick={runEndpoint} disabled={running}>
                  <Play className="size-3.5" />
                  Run
                </Button>
              </div>
              <div className="mt-3 space-y-3">
                {selectedSpec.config.params.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No parameters required.</p>
                ) : (
                  selectedSpec.config.params.map((param) => (
                    <div key={param.name} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-medium">{param.name}</label>
                        <span className="text-[11px] uppercase text-muted-foreground">{param.source} / {param.type}</span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          className="h-8 text-sm"
                          value={params[param.name] ?? ""}
                          onChange={(event) => setParams((current) => ({ ...current, [param.name]: event.target.value }))}
                        />
                        {param.testValues.length > 0 && (
                          <select
                            className="h-8 w-28 rounded-md border border-input bg-background px-2 text-xs"
                            value={params[param.name] ?? ""}
                            onChange={(event) => setParams((current) => ({ ...current, [param.name]: event.target.value }))}
                          >
                            {param.testValues.map((value) => (
                              <option key={String(value)} value={String(value)}>{String(value)}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      {param.notes && <p className="text-xs text-muted-foreground">{param.notes}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Endpoint Config</h2>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={saveConfig} disabled={saving || !selectedSpec}>
                <Save className="size-3.5" />
                Save
              </Button>
            </div>
            <textarea
              className="mt-3 min-h-72 w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-xs"
              value={configDraft}
              onChange={(event) => setConfigDraft(event.target.value)}
              spellCheck={false}
            />
          </div>
        </section>

        <section className="space-y-4">
          {runResult && (
            <div className="grid gap-3 lg:grid-cols-3">
              <SummaryBox label="Status" value={`${runResult.observation.statusCode}`} />
              <SummaryBox label="Duration" value={`${runResult.observation.durationMs}ms`} />
              <SummaryBox label="Path" value={runResult.path} mono />
            </div>
          )}

          {runResult && (
            <div className="grid gap-4 lg:grid-cols-2">
              <JsonPanel title="Typed Schema From Latest Run" value={runResult.inferredSchema} onCopy={() => copyText(runResult.inferredSchema)} />
              <JsonPanel title="Raw Response From Latest Run" value={runResult.response} onCopy={() => copyText(runResult.response)} />
            </div>
          )}

          <div className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Active Typed Schema</h2>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-8" onClick={() => copyText(schemaDraft)}>Copy</Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => saveSchema("merge")} disabled={saving || !runResult}>Merge New Fields</Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => saveSchema("deprecate")} disabled={saving || !runResult || runResult.diff.missingFields.length === 0}>Mark Missing Deprecated</Button>
                <Button size="sm" className="h-8" onClick={() => saveSchema("override")} disabled={saving}>Override</Button>
              </div>
            </div>
            <textarea
              className="mt-3 min-h-96 w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-xs"
              value={schemaDraft}
              onChange={(event) => setSchemaDraft(event.target.value)}
              spellCheck={false}
            />
          </div>

          {runResult && (
            <div className="grid gap-4 lg:grid-cols-3">
              <DiffList title="New Fields" items={runResult.diff.newFields} tone="success" />
              <DiffList title="Missing Fields" items={runResult.diff.missingFields} tone="warning" />
              <DiffList
                title="Type Conflicts"
                items={runResult.diff.typeConflicts.map((item) => `${item.path}: ${item.previous} -> ${item.next}`)}
                tone="danger"
              />
            </div>
          )}

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Time</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Diff</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Params</th>
                </tr>
              </thead>
              <tbody>
                {selectedObservations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">No observations for this endpoint.</td>
                  </tr>
                ) : (
                  selectedObservations.map((observation) => (
                    <tr key={observation.id} className="border-t border-border/50">
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{formatTime(observation.createdAt)}</td>
                      <td className="px-3 py-2.5 text-xs font-medium">{observation.statusCode} / {observation.durationMs}ms</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        +{observation.newFields.length} -{observation.missingFields.length} !{observation.typeConflicts.length}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{pretty(observation.params)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryBox({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={cn("mt-1 truncate text-sm font-semibold", mono && "font-mono")}>{value}</div>
    </div>
  );
}

function JsonPanel({ title, value, onCopy }: { title: string; value: unknown; onCopy: () => void }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onCopy}>
          <Clipboard className="size-3.5" />
          Copy
        </Button>
      </div>
      <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-muted/40 p-3 text-xs">{pretty(value)}</pre>
    </div>
  );
}

function DiffList({ title, items, tone }: { title: string; items: string[]; tone: "success" | "warning" | "danger" }) {
  const toneClass = {
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-destructive",
  }[tone];

  return (
    <div className="rounded-lg border border-border p-3">
      <h2 className={cn("text-sm font-semibold", toneClass)}>{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">None</p>
      ) : (
        <ul className="mt-2 max-h-40 space-y-1 overflow-auto font-mono text-xs text-muted-foreground">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}
