import * as XLSX from "xlsx";

import { DEFAULT_RESTAURANT_DRAFT } from "@/lib/constants";
import type {
  Restaurant,
  RestaurantDraft,
  RestaurantImportDuplicateStrategy,
  RestaurantImportPreview,
  RestaurantImportPreviewRow,
} from "@/types";

const TEMPLATE_HEADERS = [
  "店名",
  "分类",
  "区域",
  "价格等级",
  "堂食",
  "外卖",
  "备注",
  "是否启用",
] as const;

const HEADER_ALIASES: Record<string, keyof RestaurantDraft> = {
  name: "name",
  店名: "name",
  餐厅: "name",
  饭店: "name",
  category: "category",
  分类: "category",
  类别: "category",
  area: "area",
  区域: "area",
  地点: "area",
  位置: "area",
  pricelevel: "priceLevel",
  price: "priceLevel",
  价格: "priceLevel",
  价格等级: "priceLevel",
  dinein: "dineIn",
  堂食: "dineIn",
  delivery: "delivery",
  外卖: "delivery",
  notes: "notes",
  备注: "notes",
  note: "notes",
  isactive: "isActive",
  active: "isActive",
  启用: "isActive",
  是否启用: "isActive",
};

const TRUE_TOKENS = new Set(["1", "true", "yes", "y", "是", "支持", "可用", "启用"]);
const FALSE_TOKENS = new Set(["0", "false", "no", "n", "否", "不支持", "禁用", "停用"]);

function normalizeHeader(header: string) {
  return header.trim().replace(/\s+/g, "").toLowerCase();
}

function stringifyCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeDuplicateKey(name: string, area: string) {
  return `${name.trim().toLowerCase()}::${area.trim().toLowerCase()}`;
}

function parseBooleanLike(value: string, fieldLabel: string, defaultValue: boolean) {
  if (!value) {
    return { value: defaultValue, error: null };
  }

  const token = value.trim().toLowerCase();
  if (TRUE_TOKENS.has(token)) {
    return { value: true, error: null };
  }

  if (FALSE_TOKENS.has(token)) {
    return { value: false, error: null };
  }

  return {
    value: defaultValue,
    error: `${fieldLabel} 无法识别：${value}`,
  };
}

function parsePriceLevel(value: string) {
  if (!value) {
    return { value: DEFAULT_RESTAURANT_DRAFT.priceLevel, error: null };
  }

  const token = value.trim().toLowerCase();
  if (["low", "低", "低预算", "便宜"].includes(token)) {
    return { value: "low" as const, error: null };
  }

  if (["medium", "中", "中预算", "适中"].includes(token)) {
    return { value: "medium" as const, error: null };
  }

  if (["high", "高", "高预算", "贵"].includes(token)) {
    return { value: "high" as const, error: null };
  }

  return {
    value: DEFAULT_RESTAURANT_DRAFT.priceLevel,
    error: `价格等级无法识别：${value}`,
  };
}

function mapRowByAliases(row: Record<string, unknown>) {
  const mapped: Partial<Record<keyof RestaurantDraft, string>> = {};
  const sourceValues: Record<string, string> = {};

  for (const [header, value] of Object.entries(row)) {
    const normalizedHeader = normalizeHeader(header);
    const mappedKey = HEADER_ALIASES[normalizedHeader];
    const cellValue = stringifyCellValue(value);

    sourceValues[header] = cellValue;
    if (mappedKey) {
      mapped[mappedKey] = cellValue;
    }
  }

  return { mapped, sourceValues };
}

function buildPreviewRow(
  rowNumber: number,
  row: Record<string, unknown>,
  existingKeys: Map<string, string>,
  importedKeys: Map<string, number>,
): RestaurantImportPreviewRow {
  const { mapped, sourceValues } = mapRowByAliases(row);
  const errors: string[] = [];
  const name = (mapped.name ?? "").trim();
  const category = (mapped.category ?? "").trim();
  const area = (mapped.area ?? "").trim();
  const notes = (mapped.notes ?? "").trim();

  if (!name) {
    errors.push("缺少店名");
  }

  const priceLevelResult = parsePriceLevel(mapped.priceLevel ?? "");
  if (priceLevelResult.error) {
    errors.push(priceLevelResult.error);
  }

  const dineInResult = parseBooleanLike(mapped.dineIn ?? "", "堂食", DEFAULT_RESTAURANT_DRAFT.dineIn);
  if (dineInResult.error) {
    errors.push(dineInResult.error);
  }

  const deliveryResult = parseBooleanLike(mapped.delivery ?? "", "外卖", DEFAULT_RESTAURANT_DRAFT.delivery);
  if (deliveryResult.error) {
    errors.push(deliveryResult.error);
  }

  const isActiveResult = parseBooleanLike(
    mapped.isActive ?? "",
    "是否启用",
    DEFAULT_RESTAURANT_DRAFT.isActive,
  );
  if (isActiveResult.error) {
    errors.push(isActiveResult.error);
  }

  const draft: RestaurantDraft | null =
    errors.length === 0
      ? {
          name,
          category,
          area,
          priceLevel: priceLevelResult.value,
          dineIn: dineInResult.value,
          delivery: deliveryResult.value,
          notes,
          isActive: isActiveResult.value,
        }
      : null;

  const normalizedKey = name ? normalizeDuplicateKey(name, area) : "";
  let duplicateReason: string | null = null;
  let duplicateRestaurantId: string | null = null;
  let status: RestaurantImportPreviewRow["status"] = "ready";

  if (errors.length > 0) {
    status = "error";
  } else if (normalizedKey && existingKeys.has(normalizedKey)) {
    status = "duplicate";
    duplicateReason = `与现有饭店重复：${name}${area ? ` / ${area}` : ""}`;
    duplicateRestaurantId = existingKeys.get(normalizedKey) ?? null;
  } else if (normalizedKey && importedKeys.has(normalizedKey)) {
    status = "duplicate";
    duplicateReason = `与导入文件第 ${importedKeys.get(normalizedKey)} 行重复`;
  }

  if (status !== "error" && normalizedKey && !importedKeys.has(normalizedKey)) {
    importedKeys.set(normalizedKey, rowNumber);
  }

  return {
    rowNumber,
    status,
    normalizedKey,
    draft,
    sourceValues,
    errors,
    duplicateReason,
    duplicateRestaurantId,
  };
}

function getFirstWorksheetRows(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [] as Array<Record<string, unknown>>;
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
    defval: "",
  });
}

export function buildRestaurantImportPreview(params: {
  fileName: string;
  rows: Array<Record<string, unknown>>;
  existingRestaurants: Restaurant[];
}): RestaurantImportPreview {
  const existingKeys = new Map<string, string>();
  for (const restaurant of params.existingRestaurants) {
    existingKeys.set(normalizeDuplicateKey(restaurant.name, restaurant.area), restaurant.id);
  }

  const importedKeys = new Map<string, number>();
  const previewRows = params.rows.map((row, index) =>
    buildPreviewRow(index + 2, row, existingKeys, importedKeys),
  );

  const importableRecords = previewRows.filter((row) => row.status !== "error").length;
  const errorRecords = previewRows.filter((row) => row.status === "error").length;
  const duplicateRecords = previewRows.filter((row) => row.status === "duplicate").length;

  return {
    fileName: params.fileName,
    totalRecords: previewRows.length,
    importableRecords,
    errorRecords,
    duplicateRecords,
    rows: previewRows,
  };
}

export async function parseRestaurantImportFile(file: File, existingRestaurants: Restaurant[]) {
  const buffer = await file.arrayBuffer();
  const rows = getFirstWorksheetRows(buffer);

  return buildRestaurantImportPreview({
    fileName: file.name,
    rows,
    existingRestaurants,
  });
}

export function resolveRestaurantImportDrafts(
  preview: RestaurantImportPreview,
  strategy: RestaurantImportDuplicateStrategy,
) {
  const resolvedDrafts: RestaurantDraft[] = [];
  const keyToIndex = new Map<string, number>();
  const idToIndex = new Map<string, number>();

  for (const row of preview.rows) {
    if (!row.draft || row.status === "error") {
      continue;
    }

    if (row.status === "ready") {
      resolvedDrafts.push({ ...row.draft });
      if (row.normalizedKey) {
        keyToIndex.set(row.normalizedKey, resolvedDrafts.length - 1);
      }
      continue;
    }

    if (strategy === "skip") {
      continue;
    }

    if (strategy === "keep-both") {
      resolvedDrafts.push({ ...row.draft });
      continue;
    }

    if (row.duplicateRestaurantId) {
      const overwriteDraft: RestaurantDraft = {
        ...row.draft,
        id: row.duplicateRestaurantId,
      };
      const existingIndex = idToIndex.get(row.duplicateRestaurantId);
      if (existingIndex !== undefined) {
        resolvedDrafts[existingIndex] = overwriteDraft;
        if (row.normalizedKey) {
          keyToIndex.set(row.normalizedKey, existingIndex);
        }
      } else {
        resolvedDrafts.push(overwriteDraft);
        const insertedIndex = resolvedDrafts.length - 1;
        idToIndex.set(row.duplicateRestaurantId, insertedIndex);
        if (row.normalizedKey) {
          keyToIndex.set(row.normalizedKey, insertedIndex);
        }
      }
      continue;
    }

    const previousIndex = row.normalizedKey ? keyToIndex.get(row.normalizedKey) : undefined;
    if (previousIndex !== undefined) {
      resolvedDrafts[previousIndex] = {
        ...resolvedDrafts[previousIndex],
        ...row.draft,
      };
      continue;
    }

    resolvedDrafts.push({ ...row.draft });
    if (row.normalizedKey) {
      keyToIndex.set(row.normalizedKey, resolvedDrafts.length - 1);
    }
  }

  return resolvedDrafts;
}

function buildWorksheetRows(restaurants: Restaurant[]) {
  return restaurants.map((restaurant) => ({
    店名: restaurant.name,
    分类: restaurant.category,
    区域: restaurant.area,
    价格等级: restaurant.priceLevel,
    堂食: restaurant.dineIn ? "是" : "否",
    外卖: restaurant.delivery ? "是" : "否",
    备注: restaurant.notes,
    是否启用: restaurant.isActive ? "是" : "否",
  }));
}

function createRestaurantWorkbookFromRows(rows: Array<Record<string, string>>) {
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [...TEMPLATE_HEADERS],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "饭店数据");
  return workbook;
}

export function downloadRestaurantTemplate() {
  const workbook = createRestaurantWorkbookFromRows([
    {
      店名: "示例餐厅",
      分类: "米饭",
      区域: "公司附近",
      价格等级: "medium",
      堂食: "是",
      外卖: "是",
      备注: "这是一条示例数据，可直接删除",
      是否启用: "是",
    },
  ]);

  XLSX.writeFileXLSX(workbook, "meal-decider-template.xlsx");
}

export function exportRestaurantsToXlsx(restaurants: Restaurant[]) {
  const workbook = createRestaurantWorkbookFromRows(buildWorksheetRows(restaurants));
  XLSX.writeFileXLSX(workbook, "meal-restaurants-export.xlsx");
}

export function createRestaurantTemplateWorkbookBuffer() {
  const workbook = createRestaurantWorkbookFromRows([
    {
      店名: "示例餐厅",
      分类: "米饭",
      区域: "公司附近",
      价格等级: "medium",
      堂食: "是",
      外卖: "是",
      备注: "这是一条示例数据，可直接删除",
      是否启用: "是",
    },
  ]);

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export function readRestaurantWorkbookRows(buffer: ArrayBuffer) {
  return getFirstWorksheetRows(buffer);
}
