# 部署教程 ①：发布到 GitHub Pages（免费）

> 目标：把这个 3D 简历，变成一个人人可访问的网址，比如
> `https://你的用户名.github.io/Resume/`。
>
> 你只需要一个 GitHub 账号，**全程点鼠标，不用敲命令**。
> 想用自己的域名？看另一篇 [《② 部署到 Cloudflare Pages》](2-部署到-Cloudflare-Pages.md)。

---

## 一分钟看懂原理（可跳过）

- 这个仓库里已经放好了一个「自动部署脚本」：[`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)。
- 它的作用是：**每次你把代码推送到 GitHub，GitHub 就自动帮你打包并发布网站**，你什么都不用装。
- 所以你要做的只有两件事：① 把代码放到自己的 GitHub 仓库；② 在仓库设置里把「Pages」开关打开。

---

## 准备工作

1. 有一个 [GitHub](https://github.com) 账号。
2. 这个项目已经在**你自己的账号名下**（不是原作者的仓库）。两种常见情况：
   - **Fork**：在原仓库右上角点 `Fork`，就会在你账号下复制一份。
   - **自己上传**：新建一个仓库，把代码传上去。
3. 确认你仓库的**默认分支叫 `main`**（大多数新仓库都是）。自动部署脚本监听的就是 `main` 分支。

> 💡 只要代码在你账号下、默认分支是 `main`，就可以继续下一步了。

---

## 步骤一：打开 GitHub Pages 开关

1. 进入你的仓库主页，点顶部的 **Settings（设置）**。
2. 左侧菜单往下找到 **Pages**，点进去。
3. 在 **Build and deployment → Source（来源）** 下拉框里，选择 **GitHub Actions**。

   > ⚠️ 一定要选 **GitHub Actions**，不要选 “Deploy from a branch”。
   > 本项目是用 Actions 自动构建的，选错了会发布不出来。

选好之后不用点保存，它会自动记住。

---

## 步骤二：触发一次部署

自动脚本只在「代码有推送」或「手动点一下」时运行。第一次可以手动触发：

1. 回到仓库主页，点顶部的 **Actions（操作）** 标签。
2. 左侧点 **Deploy to GitHub Pages** 这个工作流。
3. 右侧点 **Run workflow ▸**，分支选 `main`，再点绿色的 **Run workflow** 按钮。

> 以后你**每次改代码并推送到 `main`，都会自动重新部署**，不用再手动点。

---

## 步骤三：等它跑完，拿到网址

1. 还是在 **Actions** 页，你会看到一条正在运行的记录（黄色圆点转圈，约 1–3 分钟）。
2. 变成**绿色的 ✓** 就代表成功了。
3. 回到 **Settings → Pages**，页面顶部会显示你的网址：

   ```
   https://你的GitHub用户名.github.io/仓库名/
   ```

   例如本项目的就是 <https://niumading.github.io/Resume/>。

点开这个网址，你的 3D 简历就上线了 🎉

---

## 常见问题（遇到再看）

**Q：Actions 里那条记录变成红色 ✗ 了怎么办？**
点进那条失败记录，展开红色的步骤看报错。最常见的是代码本身有语法错误——先在本地 `cd web && npm run build` 跑通，再推送。

**Q：网址打开是 404 / 一片空白？**
- 确认 **Source 选的是 GitHub Actions**（步骤一），不是分支模式。
- 确认 Actions 那条记录是**绿色成功**的。
- 刚部署完有时要等 1–2 分钟、或强制刷新（`Ctrl/Cmd + Shift + R`）。

**Q：页面能打开，但 3D 模型、图片加载不出来？**
本项目的打包已经用了**相对路径**（`web/vite.config.ts` 里的 `base: './'`），放在子目录也能正常加载，一般不用改。如果你换了自己的模型/图片，检查文件是不是真的放进了 `web/public/` 目录。

**Q：仓库是私有（Private）的，能用 Pages 吗？**
免费账号的 GitHub Pages 需要仓库是**公开（Public）**的。私有仓库要用 Pages 得升级到 GitHub Pro，或者改用 [Cloudflare Pages](2-部署到-Cloudflare-Pages.md)（私有仓库也免费）。

**Q：我想绑定自己的域名（比如 `me.example.com`）？**
GitHub Pages 也支持自定义域名（Settings → Pages → Custom domain）。不过如果你在意国内访问速度、想要更灵活的域名/缓存控制，更推荐用 [Cloudflare Pages](2-部署到-Cloudflare-Pages.md)。

---

## 下一步

- 想换成自己的内容（姓名 / 模型 / 简历 / 作品）？看仓库根目录的 [`README.md`](../../README.md) 里「改造」相关章节，以及 [`NOTICE`](../../NOTICE)（原作者的个人素材不在开源范围内，记得替换）。
- 想用 Cloudflare 部署 / 绑定自定义域名？→ [《② 部署到 Cloudflare Pages》](2-部署到-Cloudflare-Pages.md)
