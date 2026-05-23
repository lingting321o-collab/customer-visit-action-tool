# 客户拜访纪要行动项整理工具

纯静态前端版本，可直接部署到 Vercel。当前默认使用本地规则抽取行动项，后续可将 `app.js` 中的 `extractActionItems` 替换为后端 API 调用。

## 文件

- `index.html`：页面结构
- `styles.css`：界面样式
- `app.js`：本地行动项抽取、复制、CSV 导出

## Vercel 部署

将本目录作为静态站点部署即可，无需构建命令。

## 后续 OpenAI API 接口建议

前端请求：

```json
{
  "customer": "客户名称",
  "visitDate": "2026-05-23",
  "defaultOwner": "项目经理",
  "notes": "拜访纪要全文"
}
```

后端返回：

```json
{
  "items": [
    {
      "task": "整理高可用落地方案并发客户确认",
      "owner": "项目经理",
      "due": "下周三前",
      "priority": "高",
      "status": "未开始"
    }
  ]
}
```
