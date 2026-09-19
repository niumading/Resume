---
# 不写 title：缺省回退到 works.ts 里 item 的 name，中英切换各自正确
bannerFit: natural
role: 独立开发
tags: [XLSX, 批量导出, 单据打印]
link: https://github.com/niumading/Warehouse-automation-tools/blob/main/app/api/returns.py
---

## 表格进来的时候没有统一格式

退货环节的表来自十几家供应商，列名不一样、顺序不一样，有的还带合并单元格。
要求是：拖进来就能认，认错了能改，确认之后按供应商分开导出。

`_read_table` 把 CSV 和 XLSX 收敛到同一个入口，表头识别后由 `_suggest_mapping`
给出列映射建议 —— 列名可以不同、顺序可以不同，但语义是固定的。
映射结果允许人工调整，调整完可以存成该供应商的模板，下次直接套用。

## 为什么自己解析 XLSX

`_xlsx_rows` 用 `xml.etree` 直接解表，`_xlsx_text_cell` / `_xlsx_number_cell`
负责写出，没有引入 openpyxl：

- 只用到「读单元格、写单元格、设样式」三个能力，为此背一个依赖不划算
- 供应商的表经常不规范，表格库的严格校验会直接抛错中断整次导入；
  自己解 XML 可以降级处理（`_safe_xml_text`），坏一格不毁整张表

## 批量与导出

- **运单号去重**：同一张表里运单号会重复出现，`_clean_tracking_nos` 先去重再批量生成
  退货凭证，避免同一票货被重复制单
- **分 Sheet 导出**：按供应商拆成多个 Sheet，也支持合并成一张
- **打印**：已审核单支持 A4 横向打印，按单据的实际版式输出，而不是把网页截个图
