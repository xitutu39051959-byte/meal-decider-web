import { describe, expect, it } from "vitest";

import {
  buildRestaurantImportPreview,
  createRestaurantTemplateWorkbookBuffer,
  readRestaurantWorkbookRows,
  resolveRestaurantImportDrafts,
} from "@/lib/restaurants/import-export";
import type { Restaurant } from "@/types";

const existingRestaurants: Restaurant[] = [
  {
    id: "rest-1",
    name: "老王盖饭",
    category: "米饭",
    area: "A区",
    priceLevel: "medium",
    dineIn: true,
    delivery: true,
    notes: "",
    isActive: true,
    createdAt: "2026-03-20T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z",
  },
];

describe("restaurant import/export", () => {
  it("maps header aliases and creates import preview rows", () => {
    const preview = buildRestaurantImportPreview({
      fileName: "restaurants.xlsx",
      existingRestaurants: [],
      rows: [
        {
          店名: "小面馆",
          分类: "面",
          地点: "B区",
          价格: "低",
          堂食: "是",
          外卖: "否",
          备注: "中午快",
          是否启用: "是",
        },
      ],
    });

    expect(preview.totalRecords).toBe(1);
    expect(preview.rows[0].status).toBe("ready");
    expect(preview.rows[0].draft).toMatchObject({
      name: "小面馆",
      category: "面",
      area: "B区",
      priceLevel: "low",
      dineIn: true,
      delivery: false,
      isActive: true,
    });
  });

  it("marks duplicate rows by name and area and supports overwrite resolution", () => {
    const preview = buildRestaurantImportPreview({
      fileName: "restaurants.csv",
      existingRestaurants,
      rows: [
        {
          店名: "老王盖饭",
          区域: "A区",
          分类: "米饭",
          价格等级: "high",
        },
        {
          店名: "新轻食",
          区域: "C区",
          分类: "轻食",
          价格等级: "medium",
        },
        {
          店名: "新轻食",
          区域: "C区",
          分类: "轻食",
          价格等级: "low",
        },
      ],
    });

    expect(preview.duplicateRecords).toBe(2);
    expect(preview.rows[0].status).toBe("duplicate");
    expect(preview.rows[2].status).toBe("duplicate");

    const resolved = resolveRestaurantImportDrafts(preview, "overwrite");
    expect(resolved).toHaveLength(2);
    expect(resolved[0].id).toBe("rest-1");
    expect(resolved[1]).toMatchObject({
      name: "新轻食",
      area: "C区",
      priceLevel: "low",
    });
  });

  it("keeps invalid rows out of importable records and reports reasons", () => {
    const preview = buildRestaurantImportPreview({
      fileName: "restaurants.xlsx",
      existingRestaurants: [],
      rows: [
        {
          店名: "",
          区域: "A区",
          价格等级: "奇怪价格",
          堂食: "可能",
        },
      ],
    });

    expect(preview.errorRecords).toBe(1);
    expect(preview.importableRecords).toBe(0);
    expect(preview.rows[0].errors).toEqual(
      expect.arrayContaining(["缺少店名", "价格等级无法识别：奇怪价格", "堂食 无法识别：可能"]),
    );
  });

  it("creates a readable workbook template", () => {
    const buffer = createRestaurantTemplateWorkbookBuffer();
    const rows = readRestaurantWorkbookRows(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      店名: "示例餐厅",
      分类: "米饭",
    });
  });
});
