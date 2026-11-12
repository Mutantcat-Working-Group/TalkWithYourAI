<div align=center>
<img src="src-tauri/icons/128x128@2x.png" style="width:100px;" width="100"/>
<h2>TalkWithYourAI</h2>
</div>

### 一、产品概述

- 轻量级的桌面语音输入工具：按下热键说话，松开就得到整理好的文字，直接落在你正在用的那个应用里。
- 完全本地运行：没有账号、没有后端服务、没有授权校验、没有遥测。语音识别与 AI 润色只走你自己配置的服务商。
- 自带 key 即可用：STT 与 AI 润色都支持自己填 Key，也可以填自己的 Base URL 指向自建服务或本机模型。
- 支持 macOS、Windows、Linux 三平台，macOS 与 Windows 均提供双架构安装包。

核心价值：

- 说人话，出书面语。自动去掉「呃、嗯、就是、然后」这类思考时的口头语，补标点，整理成能直接发出去的句子。
- 认得你在哪说话。识别当前应用是邮件、群聊、文档、代码编辑器还是终端，按场合调整语气和排版。
- 认得你在说什么。内置四百余条开发术语修正，`code x` 自动变 `Codex`，`min io` 变 `MinIO`。
- 一次配置，长期使用。所有数据只存在本机 SQLite，换不换 key 由你决定。

### 二、功能说明

#### 语音输入

- 全局热键录音，按住说话或按一下开始/停止，两种模式可选。
- 悬浮胶囊实时显示录音、转写、润色、输出四个阶段的状态。
- 文字通过键盘模拟逐字输入，或走剪贴板粘贴；两者都可作为回退。
- 录音时长上限按所选服务商自动设置，也可手动指定。

#### AI 润色

- 语音识别结果经过 LLM 整理：补标点、去口头语、合并重复、修正自相矛盾的更正。
- 支持 Minimal / Clean / Structured / Professional 四种内置润色风格，也可写自己的风格提示词。
- 长内容（约 120 汉字或 45 词以上）且包含多个要点时，自动整理成分点列表。
- 按语境修正错别字：编程界面上 `函树` 会改成 `函数`，邮件里按商务词汇判断。
- 润色失败时不会静默降级，而是问你「重新生成」还是「直接插入原文」，可以无限次重试。

#### 应用感知

- 自动识别前台应用，归入邮件、工作群聊、私人聊天、文档、项目管理、开发协作、代码/提示词、客服、社交、终端十类语境。
- 每个应用家族可指定不同的写作风格，具体应用还能单独覆盖。
- 所有识别与映射都在本地完成；发往 LLM 的只有内部类别标签，不包含窗口标题或文档内容。

#### 终端适配

- 识别终端类应用（Terminal、iTerm2、Warp、Ghostty、Alacritty、kitty、WezTerm、AntShell、Windows Terminal、PowerShell 等）。
- 在终端里，换行输出为 `\` 加回车（shell 续行），不会把命令提前提交。
- 非终端应用不受影响，普通文字该换行就换行。

#### Ask Anything

- 单独热键唤起，说一个问题，只显示答案，没有聊天记录、没有输入框、没有发送按钮。
- 选中文本时也可以问「这段话什么意思」「帮我总结一下」。

#### 本地数据

- 历史记录、词典、纠错规则、场景、应用映射全部存在本机 SQLite，支持全文搜索与按日期分组。
- 词典支持 JSON / CSV 导入导出，场景支持 JSON 导入导出。
- API Key 存在操作系统凭据库（macOS 钥匙串、Windows 凭据管理器、Linux Secret Service），不可用时回退到本地加密存储。

#### 服务商支持

语音识别：

```text
服务商                        说明
Deepgram Nova-3              流式识别
AssemblyAI                   流式识别
阿里云 Qwen3 实时语音识别      流式识别，支持指定地域
火山引擎豆包实时语音识别        流式识别
智谱 GLM-ASR                 文件上传
OpenAI Whisper               文件上传
Groq Whisper                 文件上传
硅基流动 SiliconFlow           文件上传
Apple Speech                 本地识别，仅 macOS
本地 / 自定义 Whisper         自填 Base URL 与模型，Key 可留空
```

AI 润色：

```text
服务商                        说明
智谱
DeepSeek
硅基流动 SiliconFlow
OpenAI
Google Gemini
Moonshot (Kimi)
豆包（火山引擎）
通义千问
Groq
Claude                       原生 Messages API
Ollama                       本地，免 Key
OpenRouter
自定义 OpenAI 兼容端点         自填 Base URL 与模型，Key 可留空
```

### 三、下载与安装

从 [Releases](https://github.com/Mutantcat-Working-Group/TalkWithYourAI/releases) 下载对应平台的安装包：

```text
平台      架构            文件
macOS     arm64 + x86_64   TalkWithYourAI_<版本>_universal.dmg
Windows   x64             TalkWithYourAI_<版本>_x64-setup.exe
Windows   arm64           TalkWithYourAI_<版本>_arm64-setup.exe
Linux     amd64           TalkWithYourAI_<版本>_amd64.deb
Linux     arm64           TalkWithYourAI_<版本>_arm64.deb
Linux     amd64           TalkWithYourAI_<版本>_amd64.AppImage
```

每个安装包都配有一份同名校验文件 `<文件名>.checksums.txt`，内含 MD5 与 SHA-1 两种摘要；另有 `MD5SUMS` 与 `SHA1SUMS` 汇总文件，可直接用 `md5sum -c` / `sha1sum -c` 校验。

macOS 安装包为 ad-hoc 签名，未做公证，首次启动会被 Gatekeeper 拦截。右键应用选择「打开」，或执行：

```sh
xattr -dr com.apple.quarantine /Applications/TalkWithYourAI.app
```

Windows 安装包未做代码签名，SmartScreen 可能提示「Windows 已保护你的电脑」，点击「更多信息」后选择「仍要运行」。

### 四、快速上手

#### 默认热键

```text
平台            听写           语音提问        翻译选中文本
macOS          Fn            Fn+Space       Fn+LeftShift
Windows        Right Alt     Right Alt+Space Right Alt+LeftShift
Linux          Ctrl+/        Ctrl+.         可在设置中配置
```

取消当前听写（含等待润色重试时的询问）：macOS 为 `Cmd+Escape`，Windows 与 Linux 为 `Ctrl+Escape`。

#### 首次配置

1. 打开应用，跟随引导页选择语音识别服务商并填入 Key（或用本地 Whisper 填 Base URL）。
2. 选择 AI 润色服务商并填入 Key（Ollama 或自定义端点可留空）。
3. 引导页会要求两个连接测试都通过后才能继续。
4. 授予麦克风权限；macOS 还需要在「隐私与安全性 → 辅助功能」中勾选本应用，否则全局热键与键盘输出无法工作。
5. 完成后按热键即可开始使用。

#### 注意事项

- 首次启动不需要注册、登录或联网校验。
- 若只配置了语音识别而关闭了 AI 润色，输出的是带标点的原始转写。
- Ollama、自定义 OpenAI 兼容端点可以不填 Key，只要 Base URL 与模型填对即可。
- 自建的 OpenAI 兼容服务支持 `http://`，`localhost`、`127.0.0.1` 与内网地址都不受限。

#### 演示

```sh
# 从源码运行（开发模式）
npm install
npm run tauri dev

# 构建本机安装包
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`。

### 五、配置与数据

#### 数据位置

```text
内容                     位置
历史 / 词典 / 纠错 / 场景   应用数据目录下的 talkwithyourai.db
窗口位置等偏好设置         应用数据目录下的 settings.json
API Key                  操作系统凭据库，服务名为 TalkWithYourAI
```

#### 从旧版本迁移

本应用的标识符、凭据库服务名与数据库文件名与上游 OpenTypeless 均不相同，两者是互相独立的两个应用，可以同时安装、互不干扰。因此旧数据不会自动继承：

- 历史 / 词典 / 场景：可把旧应用数据目录下的 `opentypeless.db` 复制并改名为 `talkwithyourai.db`；词典也可以用 JSON / CSV 导出后重新导入。
- 窗口偏好：`settings.json` 里的 `onboarding_completed` 决定是否重新走引导页，只复制数据库的话会重新引导。
- API Key：需要在新应用设置页重新填写。

### 六、开发进度

- [X] 全局热键录音与胶囊状态显示
- [X] 逐字键盘输出与剪贴板回退
- [X] 十类应用语境识别与按应用调整风格
- [X] 内置润色风格与自定义风格提示词
- [X] 本地词典、纠错规则、场景与应用映射
- [X] 词典 JSON / CSV 导入导出，场景 JSON 导入导出
- [X] 历史记录与保留策略
- [X] Ask Anything 语音问答
- [X] 翻译模式与选中文本处理
- [X] 终端应用换行续行适配
- [X] 长内容自动分点
- [X] 按语境修正同音字与形近字
- [X] 润色失败询问重试或直接插入
- [X] 取消听写快捷键
- [X] 开发术语修正（四百余条）
- [X] 三平台双架构安装包与双摘要校验
- [X] 完全本地运行，无账号无后端无遥测
- [X] 检查 GitHub Releases 并提示新版本
- [ ] 签名自动更新（需 Developer ID 证书与公证，见下）

### 七、说明

#### 关于自动更新

本应用**不提供签名自动更新**。

原因有二：macOS 构建为 ad-hoc 签名且未公证，没有稳定的代码身份可用于绑定更新；本项目也没有维护者签名密钥，无法验证更新包的真伪。

替代方案是：应用启动时查询公开的 GitHub Releases 接口，发现新版本后给出提示并链接到发布页，由你自己下载安装。应用不会自动下载或执行任何东西。

若将来要做签名自动更新，前置条件是先拿到真正的 Developer ID 证书并完成公证，之后 minisign 密钥对才有意义。

#### 关于许可

本项目基于 [tover0314-w/opentypeless](https://github.com/tover0314-w/opentypeless)（MIT 许可）修改而来，原版权声明保留在 `LICENSE` 与 `THIRD_PARTY_NOTICES.md` 中。

### 八、历史版本

- https://github.com/tover0314-w/opentypeless
