# 档案管理系统 (dangan)

一个简洁的档案/文档管理 Web 应用，支持档案的新建、编辑、删除、搜索与分类过滤。

## 功能特性

- 📁 **新建档案** — 填写标题、分类、负责人、日期及描述
- ✏️  **编辑档案** — 修改已有档案的任意字段
- 🗑️  **删除档案** — 带确认对话框的安全删除
- 🔍 **搜索** — 按标题、描述、负责人实时搜索
- 🏷️  **分类过滤** — 按档案分类快速筛选
- 📊 **统计信息** — 实时显示档案总数

## 技术栈

- **后端**：Node.js + Express
- **前端**：原生 HTML / CSS / JavaScript（无额外依赖）
- **存储**：JSON 文件（`data/archives.json`）

## 快速开始

```bash
# 安装依赖
npm install

# 启动服务
npm start
# 服务将运行在 http://localhost:3000
```

## 运行测试

```bash
npm test
```

## API 接口

| 方法   | 路径                    | 说明             |
|--------|-------------------------|------------------|
| GET    | `/api/archives`         | 获取档案列表（支持 `?q=` 搜索、`?category=` 过滤） |
| POST   | `/api/archives`         | 新建档案         |
| GET    | `/api/archives/:id`     | 获取单条档案     |
| PUT    | `/api/archives/:id`     | 更新档案         |
| DELETE | `/api/archives/:id`     | 删除档案         |
| GET    | `/api/categories`       | 获取所有分类列表 |

## 档案字段

| 字段        | 必填 | 说明     |
|-------------|------|----------|
| title       | ✅   | 档案标题 |
| category    | ✅   | 分类     |
| author      | ✅   | 负责人   |
| date        | ✅   | 日期     |
| description | —    | 描述/备注 |
