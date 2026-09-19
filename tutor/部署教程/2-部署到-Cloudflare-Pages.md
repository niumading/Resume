# 部署教程 ②：部署到 Cloudflare Pages（免费 + 自定义域名友好）

> 目标：把你 fork 的这个 3D 简历部署到 Cloudflare，得到一个
> `https://你的项目名.pages.dev` 网址，还能很方便地绑定自己的域名。
>
> 相比 [GitHub Pages](1-部署到-GitHub-Pages.md)，Cloudflare Pages 的优点：**私有仓库也免费**、
> 全球 CDN、绑定自定义域名更省心。全程也是**点鼠标为主**。

---

## 一分钟看懂原理（可跳过）

- Cloudflare Pages 会**连接你的 GitHub 仓库**，每次你推送代码，它就自动拉取、打包、发布。
- 我们要告诉它三件事：**代码在 `web/` 子目录里**、**用什么命令打包**、**打包结果在哪个文件夹**。
- 本项目打包用相对路径（`web/vite.config.ts` 的 `base: './'`），所以放在 `*.pages.dev` 根目录也能正常加载，不用改代码。

---

## 准备工作

1. 一个 [Cloudflare](https://dash.cloudflare.com/sign-up) 账号（免费注册）。
2. 项目代码已经在**你自己的 GitHub 账号**下（fork 或自己上传都行）。
3. 记住本项目的关键结构：**前端应用在 `web/` 目录里，不是仓库根目录**——这点等下填构建配置时很重要。

---

## 步骤一：新建一个 Pages 项目并连接 GitHub

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com)。
2. 左侧菜单选 **Workers & Pages**，点 **Create（创建）**。
3. 选 **Pages** 这个标签页，点 **Connect to Git（连接 Git）**。
4. 授权 Cloudflare 访问你的 GitHub（第一次会跳转 GitHub 授权，按提示同意即可，可只授权这一个仓库）。
5. 在列表里选中你的 `Resume` 仓库，点 **Begin setup（开始配置）**。

---

## 步骤二：填写构建配置（**最关键的一步**）

在 “Set up builds and deployments” 页面，按下面填：

| 配置项 | 填什么 | 说明 |
| --- | --- | --- |
| **Production branch（生产分支）** | `main` | 就是你平时推送的主分支 |
| **Framework preset（框架预设）** | `Vite`（找不到就选 `None`） | 影响不大，主要看下面三项 |
| **Build command（构建命令）** | `npm run build` | 打包命令 |
| **Build output directory（输出目录）** | `dist` | 打包结果所在文件夹 |
| **Root directory（根目录，在 Advanced 里）** | `web` | ⚠️ **必须填 `web`**，因为应用在 `web/` 子目录里 |

> ⚠️ **最容易出错的地方**：因为代码在 `web/` 子目录，一定要展开
> **Root directory (advanced)** 并填 `web`。填了之后，构建命令写 `npm run build`、
> 输出目录写 `dist` 就对了（都相对于 `web/`）。
>
> 如果你的界面找不到 “Root directory”，也可以改成这样：
> 构建命令填 `cd web && npm install && npm run build`，输出目录填 `web/dist`。

**再加一个环境变量（很重要，否则可能构建失败）：**

在同一页的 **Environment variables（环境变量）** 里，添加一条：

```
变量名：NODE_VERSION
值：    20
```

> 本项目需要 Node 20（和仓库自带的 GitHub 部署脚本一致）。不指定的话
> Cloudflare 可能用较老的 Node 导致打包报错。

填完点 **Save and Deploy（保存并部署）**。

---

## 步骤三：等它跑完，拿到网址

1. Cloudflare 会开始构建（能看到实时日志，约 1–3 分钟）。
2. 看到 **Success / 部署成功** 后，页面会给你一个网址：

   ```
   https://你的项目名.pages.dev
   ```

3. 点开它，3D 简历就上线了 🎉

以后你**每次推送代码到 `main`，Cloudflare 都会自动重新部署**。

---

## 步骤四（可选）：绑定自己的域名

如果你有自己的域名（比如 `me.example.com`）：

1. 在这个 Pages 项目里，进 **Custom domains（自定义域名）** 标签，点 **Set up a custom domain**。
2. 输入你想用的域名，按提示操作：
   - 域名本来就在 Cloudflare 托管 → 一键自动配置。
   - 域名在别处 → 它会给你一条 **CNAME 记录**，去你的域名服务商那里添加即可。
3. 等 DNS 生效（通常几分钟到几十分钟），就能用自己的域名访问了，HTTPS 证书 Cloudflare 自动签发。

---

## 常见问题（遇到再看）

**Q：构建失败，日志里报错？**
- 先看是不是没设 `NODE_VERSION=20`（步骤二）。
- 确认 **Root directory 填了 `web`**（或构建命令用了 `cd web && ...`）。
- 在本地 `cd web && npm run build` 跑一遍，确认代码本身能打包成功，再推送。

**Q：网址能开，但页面空白 / 资源加载不出来？**
- 确认 **输出目录**填对了（`dist`，或 `web/dist`）。
- 强制刷新试试（`Ctrl/Cmd + Shift + R`）。
- 换了自己的模型/图片的话，确认文件确实放进了 `web/public/`。

**Q：GitHub Pages 和 Cloudflare Pages 能同时用吗？**
可以，两者互不影响，你会有两个网址。想主推哪个就把哪个网址写进简历/README 即可。

**Q：不想连 GitHub，直接上传打包好的文件行不行？**
可以。本地 `cd web && npm run build` 后，把生成的 `web/dist` 文件夹，用 Pages 的
**Upload assets（直接上传）** 方式拖上去也能部署，只是每次更新都要手动上传，不如连 Git 自动。

---

## 下一步

- 想换成自己的内容（姓名 / 模型 / 简历 / 作品）？看仓库根目录的 [`README.md`](../../README.md) 与 [`NOTICE`](../../NOTICE)（原作者个人素材不在开源范围内，记得替换）。
- 想了解另一种免费方案？→ [《① 发布到 GitHub Pages》](1-部署到-GitHub-Pages.md)
