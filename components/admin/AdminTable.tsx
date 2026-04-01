"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ColumnDef<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
};

export type FilterDef = {
  key: string;
  label: string;
  type: "search" | "select";
  options?: { value: string; label: string }[];
};

type AdminTableProps<T> = {
  columns: ColumnDef<T>[];
  endpoint: string;
  filters?: FilterDef[];
  renderActions?: (row: T) => React.ReactNode;
  renderExpanded?: (row: T, collapse: () => void) => React.ReactNode;
  expandedKey?: keyof T;
  pageSize?: number;
  headerContent?: React.ReactNode;
  refreshKey?: number;
  emptyMessage?: string;
};

type ApiResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function AdminTable<T extends Record<string, unknown>>({
  columns,
  endpoint,
  filters = [],
  renderActions,
  renderExpanded,
  expandedKey,
  pageSize = 25,
  headerContent,
  refreshKey = 0,
  emptyMessage = "No results.",
}: AdminTableProps<T>) {
  const [page, setPage]               = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [data, setData]               = useState<T[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(total / pageSize);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...Object.fromEntries(Object.entries(filterValues).filter(([, v]) => v !== "")),
      });
      const res = await fetch(`${endpoint}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json: ApiResponse<T> = await res.json();
      setData(json.data);
      setTotal(json.total);
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, pageSize, filterValues, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [filterValues]);

  function toggleExpand(rowKey: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  }

  function setFilter(key: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-4">
      {/* Header: filters + headerContent */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) =>
          f.type === "search" ? (
            <Input
              key={f.key}
              placeholder={f.label}
              value={filterValues[f.key] ?? ""}
              onChange={(e) => setFilter(f.key, e.target.value)}
              className="h-8 w-48 text-sm"
            />
          ) : (
            <select
              key={f.key}
              value={filterValues[f.key] ?? ""}
              onChange={(e) => setFilter(f.key, e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            >
              <option value="">{f.label}</option>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )
        )}
        {headerContent && <div className="ml-auto flex items-center gap-2">{headerContent}</div>}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {expandedKey && <th className="w-8 px-3 py-2" />}
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {col.label}
                </th>
              ))}
              {renderActions && <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 2} className="px-3 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length + 2} className="px-3 py-8 text-center text-muted-foreground text-sm">{emptyMessage}</td></tr>
            ) : (
              data.map((row, i) => {
                const rowKey = expandedKey ? String(row[expandedKey]) : String(i);
                const isExpanded = expandedRows.has(rowKey);
                return (
                  <>
                    <tr
                      key={rowKey}
                      className={cn(
                        "border-t border-border/50 transition-colors",
                        expandedKey && "cursor-pointer hover:bg-muted/30",
                        isExpanded && "bg-muted/20"
                      )}
                      onClick={expandedKey ? () => toggleExpand(rowKey) : undefined}
                    >
                      {expandedKey && (
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">
                          {isExpanded ? "▼" : "▶"}
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key} className="px-3 py-2.5">{col.render(row)}</td>
                      ))}
                      {renderActions && (
                        <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          {renderActions(row)}
                        </td>
                      )}
                    </tr>
                    {isExpanded && renderExpanded && (
                      <tr key={`${rowKey}-expanded`} className="border-t border-border/30 bg-muted/10">
                        <td colSpan={columns.length + 2} className="px-6 py-3">
                          {renderExpanded(row, () => toggleExpand(rowKey))}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="h-7 px-2 text-xs">
              ← Prev
            </Button>
            <span className="px-2">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="h-7 px-2 text-xs">
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
