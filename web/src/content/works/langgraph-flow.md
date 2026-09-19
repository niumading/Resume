---
# 不写 title：缺省回退到 works.ts 里 item 的 name，中英切换各自正确
bannerFit: natural
role: 独立开发
tags: [LangGraph, StateGraph, 结构化输出]
link: https://github.com/niumading/Warehouse-automation-tools
---

## 为什么拆成两个节点

一张拍歪的入库单进来，要同时解决两件事：看清上面写了什么，以及把它对上库里的商品。
这是两种不同的失败模式 —— 前者错在模型看错，后者错在库里没有。
混在一次调用里，出错时无法判断该重试还是该转人工。

```python
builder = StateGraph(OcrState)
builder.add_node("vision", _build_vision_node())
builder.add_node("match", _build_match_node(db))
builder.add_edge(START, "vision")
builder.add_edge("vision", "match")
builder.add_edge("match", END)
```

## vision：把图变成结构

图片 base64 后随提示词一起交给多模态模型，返回经 Pydantic 校验的结构化对象。
提示词里这几条是踩坑换来的：

- **先判方向**：图片可能横置或倒置，要求分别检查 0° / 90° / 180° / 270° 再读
- **只认主单据**：单据常常叠着拍，背景纸张的字段不能混进来
- **数量和金额分列**：手写单上这两列挨着，把金额读成数量是最常见的错
- **看不清就留空**：明令禁止猜测和补造 —— 错一个数量比留空严重得多

## match：把名字对上主数据

模型读出的「解方惠虾仁」和库里的商品名不一定字字相同，
用 `SequenceMatcher` 算相似度，阈值 0.56 / 0.58。两处细节：

- **已关联商品加权**：如果这个商品本来就是这个供应商供的，相似度 +0.05 ——
  同一供应商的供货范围是有效先验
- **置信度取两者的小值**：`min(模型置信度, 匹配分)`。名字读得再准，
  库里找不到对应商品，照样得让人看一眼

## 输出

图跑完返回 `ready_for_auto_audit` 标志：全字段高置信才允许自动审核，
否则把低置信行连同原图文字一起交给人工对照。
