# Meal Decider Web

一个本地优先的“吃饭决策系统”Web App。核心目标是帮用户在饭点快速决定吃什么，并把饭店库、偏好设置、历史记录、推荐 session 全部持久保存在 IndexedDB 中。

## 功能概览

- 饭店管理：新增、编辑、删除、启用/停用、搜索、按分类筛选。
- 批量导入导出：支持 `.xlsx` 和 `.csv` 导入，支持导出当前饭店数据为 `.xlsx`，支持模板下载。
- 导入预览：展示总记录数、可导入数、错误记录数、疑似重复记录数，并支持重复处理策略。
- 默认偏好：默认午饭/晚饭、默认预算、默认堂食方式、同店冷却、同分类冷却。
- 推荐系统：一次只推荐一家，支持“换一个 / 太贵 / 太远 / 不想吃这类 / 今天就吃这个”。
- 会话记忆：本轮推荐上下文会保存到本地，刷新页面或关闭浏览器后重新打开都能恢复未完成 session。
- 历史记录：接受推荐后自动写入吃饭记录，并参与后续冷却判断。

## 技术栈

- Next.js App Router
- React 19 + TypeScript
- IndexedDB（通过 `idb` 封装）
- `xlsx`（Excel / CSV 解析与导出）
- Vitest + fake-indexeddb

## 本地启动

```bash
npm install
npm run dev
```

默认访问地址：

```text
http://localhost:3000
```

常用命令：

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

## 部署准备

项目已补齐以下部署相关内容：

- `next.config.ts` 已启用 `output: "standalone"`，适合容器部署。
- 已增加基础安全响应头。
- 已增加 `app/manifest.ts`、`app/robots.ts`、`app/sitemap.ts`。
- 已增加 `app/api/health/route.ts` 健康检查接口。
- 已提供 `Dockerfile` 与 `.dockerignore`。
- 已提供 `.env.example`，用于配置站点公开地址。

### Vercel 部署

1. 导入仓库。
2. 不需要额外后端配置。
3. 在环境变量中设置：

```text
NEXT_PUBLIC_APP_URL=https://你的域名
```

4. 构建命令保持默认 `npm run build` 即可。

### 自定义域名接入

如果你的用户包含中国大陆访问者，优先不要直接使用 `*.vercel.app` 域名，对外应绑定自定义域名。

推荐策略：

- 主域名使用 `www.example.com`
- 顶级域名 `example.com` 301 跳转到 `www.example.com`
- 在 Vercel 项目里同时添加 `example.com` 和 `www.example.com`

按 Vercel 官方文档，配置方式如下：

- 顶级域名（apex domain）通常使用 `A` 记录
- 子域名（例如 `www`）通常使用 `CNAME` 记录

在 Vercel 控制台操作：

1. 打开项目 `Settings -> Domains`
2. 添加 `example.com`
3. 再添加 `www.example.com`
4. 按界面提示去域名 DNS 提供商配置解析记录
5. 在 Vercel 中把主访问地址设置为 `www.example.com`
6. 把 `NEXT_PUBLIC_APP_URL` 改成你的正式域名，例如：

```text
NEXT_PUBLIC_APP_URL=https://www.example.com
```

CLI 参考命令：

```bash
vercel domains add example.com meal-decider-web
vercel domains add www.example.com meal-decider-web
vercel domains inspect example.com
vercel domains inspect www.example.com
```

当前仓库已新增：

- `vercel.json`
- 默认函数区域 `hnd1`（东京）

这不会改变静态资源的全球 CDN 分发，但能把需要计算的动态请求更靠近东亚。

### 中国大陆访问优化清单

截至 **2026 年 3 月 25 日**，Vercel 官方仍说明大陆访问 `vercel.app` 站点可能出现性能下降或无法访问，因此建议按下面清单处理：

1. 使用自定义域名，不直接对外暴露 `*.vercel.app`
2. 主域名固定为 `www`，减少不同入口的证书与缓存混用问题
3. 保持站点静态资源尽量本地化，避免运行时依赖海外第三方域名
4. 保持 `NEXT_PUBLIC_APP_URL` 与正式域名一致，避免 sitemap / robots / metadata 指向错误
5. 部署后从中国大陆网络实测：
   - 首页是否首屏可打开
   - `/api/health` 是否可访问
   - Excel 模板下载和导出是否正常
6. 如果大陆访问仍不稳定，再考虑单独做镜像或大陆可达前置层

本项目当前状态：

- 前端运行时无外部 API 依赖
- 使用 `next/font/google`，字体会在构建时自托管，不是运行时请求 Google
- 主要数据存储在浏览器 IndexedDB，本身不依赖跨境数据库

### Docker 部署

构建镜像：

```bash
docker build -t meal-decider-web .
```

运行容器：

```bash
docker run -p 3000:3000 -e NEXT_PUBLIC_APP_URL=http://localhost:3000 meal-decider-web
```

健康检查地址：

```text
/api/health
```

## 项目结构

```text
app/
  api/health/route.ts
  history/page.tsx
  recommend/page.tsx
  restaurants/page.tsx
  settings/page.tsx
  layout.tsx
  manifest.ts
  page.tsx
  robots.ts
  sitemap.ts
components/
  app-frame.tsx
  providers/app-data-provider.tsx
  ui/button.tsx
features/
  restaurants/components/
    restaurant-form.tsx
    restaurant-import-panel.tsx
    restaurant-manager.tsx
  recommendation/components/
    home-dashboard.tsx
    recommendation-workspace.tsx
  history/components/
    history-view.tsx
  settings/components/
    settings-form.tsx
lib/
  constants.ts
  utils.ts
  restaurants/
    import-export.ts
    import-export.test.ts
  storage/
    db.ts
    repository.ts
    repository.test.ts
  recommendation/
    engine.ts
    engine.test.ts
types/
  index.ts
Dockerfile
```

## Excel / CSV 导入导出

导入入口位于“管理饭店”页面右侧的“批量导入导出”卡片。

### 支持格式

- `.xlsx`
- `.csv`

### 导入表头映射

以下表头会自动映射到系统字段：

- `店名` -> `name`
- `分类` -> `category`
- `区域` / `地点` -> `area`
- `价格` / `价格等级` -> `priceLevel`
- `堂食` -> `dineIn`
- `外卖` -> `delivery`
- `备注` -> `notes`
- `启用` / `是否启用` -> `isActive`

同时也兼容英文表头：`name`、`category`、`area`、`priceLevel`、`dineIn`、`delivery`、`notes`、`isActive`。

### 值解析规则

- `priceLevel` 支持：`low` / `medium` / `high`，以及中文别名 `低` / `中` / `高`。
- 布尔字段支持：`是` / `否`、`true` / `false`、`yes` / `no`、`1` / `0`。
- `name` 为空会记为错误行并跳过。
- 价格或布尔值无法识别时，会记为错误行并跳过，不会导致整批失败。

### 重复检测

- 规则：`name + area` 相同视为疑似重复。
- 重复来源：既会检查系统现有饭店，也会检查当前导入文件内重复项。

### 重复处理策略

- `跳过`：保留现有数据，跳过疑似重复行。
- `覆盖`：如果与现有饭店重复，则覆盖原记录；如果导入文件内部重复，则保留最后一条。
- `保留两条`：重复也照常导入，新旧数据同时保留。

## 测试范围

- 推荐算法：验证同轮不重复推荐、分类排除生效、候选为空时返回明确提示。
- 存储层：验证默认偏好读取、IndexedDB 持久化、已完成 session 不再作为活动 session 返回。
- 导入导出：验证工作簿解析、表头映射、错误行处理、重复检测和覆盖策略。

## 后续扩展点

- 登录和多端同步
- PWA 与离线安装
- 桌面或移动端提醒
- 饭店标签、评分、黑名单、时间段偏好
- 更细的区域和价格学习策略
