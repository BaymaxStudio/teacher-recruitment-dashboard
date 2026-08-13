# 广东民办中学 2027 秋招决策台

单页私有网站，用于筛选广州、顺德、深圳及广东湾区民办中学的政治、经济、商科、全球视野和人文岗位。

## 本地运行

```bash
npm ci
npm run dev
```

## 检查与导出

```bash
npm run lint
npm test
npm run export:data
```

- 网站数据：`app/recruitment-data.ts`
- Markdown 清单：`outputs/广东民办中学教师_2027秋招追踪.md`
- JSON 数据：`outputs/广东民办中学教师_2027秋招数据.json`

网站不登录招聘账号、不代投、不联系学校。收藏和个人备注仅写入当前浏览器的 `localStorage`。
