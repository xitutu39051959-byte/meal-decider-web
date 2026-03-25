"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";

import { useAppData } from "@/components/providers/app-data-provider";
import {
  downloadRestaurantTemplate,
  exportRestaurantsToXlsx,
  parseRestaurantImportFile,
  resolveRestaurantImportDrafts,
} from "@/lib/restaurants/import-export";
import type { RestaurantImportDuplicateStrategy, RestaurantImportPreview } from "@/types";

const DUPLICATE_STRATEGY_LABELS: Record<RestaurantImportDuplicateStrategy, string> = {
  skip: "跳过重复",
  overwrite: "覆盖重复",
  "keep-both": "保留两条",
};

const ACCEPTED_FILE_TYPES = [".xlsx", ".csv"];

export function RestaurantImportPanel() {
  const { restaurants, upsertRestaurants } = useAppData();
  const [preview, setPreview] = useState<RestaurantImportPreview | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] =
    useState<RestaurantImportDuplicateStrategy>("skip");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const previewRows = useMemo(() => preview?.rows.slice(0, 8) ?? [], [preview]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const lowerCaseName = file.name.toLowerCase();
    if (!ACCEPTED_FILE_TYPES.some((suffix) => lowerCaseName.endsWith(suffix))) {
      setPreview(null);
      setErrorMessage("仅支持导入 .xlsx 或 .csv 文件。");
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nextPreview = await parseRestaurantImportFile(file, restaurants);
      setPreview(nextPreview);
      if (nextPreview.totalRecords === 0) {
        setErrorMessage("文件中没有读到有效数据行，请检查首个工作表或 CSV 内容。");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "解析导入文件失败。";
      setPreview(null);
      setErrorMessage(message);
    } finally {
      setIsParsing(false);
    }
  }

  async function handleImport() {
    if (!preview) {
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const drafts = resolveRestaurantImportDrafts(preview, duplicateStrategy);
      await upsertRestaurants(drafts);

      const skippedErrors = preview.errorRecords;
      const skippedDuplicates = duplicateStrategy === "skip" ? preview.duplicateRecords : 0;

      setSuccessMessage(
        `已导入 ${drafts.length} 条记录，跳过错误 ${skippedErrors} 条${
          skippedDuplicates > 0 ? `，跳过重复 ${skippedDuplicates} 条` : ""
        }。`,
      );
      setPreview(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "写入饭店数据失败。";
      setErrorMessage(message);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="card">
      <div className="section-heading">
        <h2>批量导入导出</h2>
        <p>支持 Excel 和 CSV，先预览再落库，避免一把导错。</p>
      </div>

      <div className="button-row">
        <button type="button" className="button button-secondary" onClick={downloadRestaurantTemplate}>
          下载 Excel 模板
        </button>
        <button
          type="button"
          className="button button-ghost"
          onClick={() => exportRestaurantsToXlsx(restaurants)}
          disabled={restaurants.length === 0}
        >
          导出当前饭店为 Excel
        </button>
      </div>

      <label className="field">
        <span>选择导入文件（.xlsx / .csv）</span>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={(event) => void handleFileChange(event)}
        />
      </label>

      {isParsing ? <p className="muted-copy">正在解析文件并生成导入预览...</p> : null}
      {errorMessage ? <p className="inline-error">{errorMessage}</p> : null}
      {successMessage ? <p className="inline-success">{successMessage}</p> : null}

      {preview ? (
        <div className="import-preview">
          <div className="stats-grid">
            <div className="stat-card">
              <strong>{preview.totalRecords}</strong>
              <span>总记录数</span>
            </div>
            <div className="stat-card">
              <strong>{preview.importableRecords}</strong>
              <span>可导入数</span>
            </div>
            <div className="stat-card">
              <strong>{preview.errorRecords}</strong>
              <span>错误记录数</span>
            </div>
            <div className="stat-card">
              <strong>{preview.duplicateRecords}</strong>
              <span>疑似重复记录数</span>
            </div>
          </div>

          <div className="preview-summary-row">
            <div className="chip-row wrap-row">
              <span className="chip">文件：{preview.fileName}</span>
            </div>

            <label className="field inline-field">
              <span>重复处理策略</span>
              <select
                value={duplicateStrategy}
                onChange={(event) =>
                  setDuplicateStrategy(event.target.value as RestaurantImportDuplicateStrategy)
                }
              >
                {Object.entries(DUPLICATE_STRATEGY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="preview-table">
            <div className="preview-table-head">
              <span>行号</span>
              <span>店名 / 区域</span>
              <span>状态</span>
              <span>说明</span>
            </div>

            {previewRows.map((row) => (
              <div key={`${row.rowNumber}-${row.normalizedKey}`} className="preview-table-row">
                <span>#{row.rowNumber}</span>
                <span>
                  {row.draft?.name || "未识别"} / {row.draft?.area || "未填写"}
                </span>
                <span>
                  {row.status === "ready"
                    ? "可导入"
                    : row.status === "duplicate"
                      ? "疑似重复"
                      : "错误"}
                </span>
                <span>{row.errors.join("；") || row.duplicateReason || "无"}</span>
              </div>
            ))}
          </div>

          {preview.rows.length > previewRows.length ? (
            <p className="meta-copy">仅展示前 {previewRows.length} 行，实际会按完整预览执行导入。</p>
          ) : null}

          <div className="button-row">
            <button
              type="button"
              className="button button-primary"
              onClick={() => void handleImport()}
              disabled={isImporting || preview.importableRecords === 0}
            >
              {isImporting ? "导入中..." : "确认导入"}
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => {
                setPreview(null);
                setErrorMessage(null);
                setSuccessMessage(null);
                if (inputRef.current) {
                  inputRef.current.value = "";
                }
              }}
              disabled={isImporting}
            >
              清空预览
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
