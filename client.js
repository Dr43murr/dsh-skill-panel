window.__ModuleLoader__.load({
  id: "dsh-skill-panel",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    "use strict";

    const React = require("react");
    const h = React.createElement;
    const API = "/api/skill-panel";
    const SOURCE = "skill";
    const TRIGGER = "@";
    const POLL_MS = 3000;

    const V = {
      bg: "var(--dsw-alias-bg-layer-2, #2c2c2e)",
      bgSoft: "var(--dsw-alias-bg-layer-1, #232324)",
      border: "var(--dsw-alias-border-l2, rgba(255,255,255,.12))",
      borderSoft: "var(--dsw-alias-border-l1, rgba(255,255,255,.06))",
      text: "var(--dsw-alias-label-primary, inherit)",
      text2: "var(--dsw-alias-label-secondary, inherit)",
      text3: "var(--dsw-alias-label-tertiary, inherit)",
      accent: "var(--dsw-alias-button-info-fill, #679efe)",
      accentSoft: "rgba(103,158,254,.16)",
      hover: "var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.08))",
      err: "var(--dsw-alias-state-error-primary, #f25a5a)",
      ok: "var(--dsw-alias-state-success-primary, #22c55e)",
      warn: "var(--dsw-alias-state-warn-primary, #d29922)"
    };

    const mono = "var(--ds-font-family-code, ui-monospace, Consolas, monospace)";
    const cut = (s, n) => (s && s.length > n ? s.slice(0, n) + "…" : (s || ""));
    const fmtTok = (n) => (n >= 10000 ? (n / 10000).toFixed(1) + " 万" : String(Math.round(n)));
    const phraseOf = (sk) => {
      const p = sk.prompt && sk.prompt.trim().length > 0 ? sk.prompt.trim() : "";
      return p.length > 0 ? p : "请使用「" + sk.name + "」技能：";
    };
    const briefOf = (sk) => (sk.brief && sk.brief.length > 0 ? sk.brief : (sk.description || "(无简介)"));
const markOf = (sk) => "【" + briefOf(sk) + "】";
    const usedOf = (sk) => ((sk.stats ? sk.stats.invoked + sk.stats.autoLoaded : 0));

    const S = {
      trigger: { display: "inline-flex", alignItems: "center", gap: "5px",
        alignSelf: "flex-start", width: "fit-content", maxWidth: "fit-content",
        height: "auto", minHeight: "26px", boxSizing: "border-box",
        margin: "0", padding: "3px 10px", borderRadius: "8px",
        border: "1px solid " + V.borderSoft, background: "transparent",
        color: V.text2, cursor: "pointer", fontSize: "12.5px", lineHeight: 1.2,
        font: "inherit", whiteSpace: "nowrap", flex: "0 0 auto" },
      triggerOn: { background: V.hover, color: V.text, borderColor: V.border },
      panel: { position: "fixed", right: "18px", bottom: "104px", width: "404px", maxHeight: "66vh",
        display: "flex", flexDirection: "column", borderRadius: "14px", border: "1px solid " + V.border,
        background: V.bg, color: V.text, zIndex: 2147483000, boxShadow: "0 14px 44px rgba(0,0,0,.4)",
        overflow: "hidden", font: "inherit", fontSize: "13px" },
      head: { display: "flex", alignItems: "center", gap: "5px", padding: "9px 11px",
        borderBottom: "1px solid " + V.borderSoft, flex: "none" },
      headTitle: { fontWeight: 600, fontSize: "13px", flex: 1 },
      pill: { fontSize: "11px", padding: "2px 8px", borderRadius: "99px", border: "1px solid " + V.borderSoft,
        background: "transparent", color: V.text3, cursor: "pointer", lineHeight: 1.7, font: "inherit" },
      pillOn: { borderColor: V.ok, color: V.ok },
      pillAccent: { borderColor: V.accent, color: V.accent },
      iconBtn: { border: "none", background: "transparent", color: V.text3, cursor: "pointer",
        fontSize: "14px", lineHeight: 1, padding: "2px 4px", borderRadius: "6px" },
      body: { overflowY: "auto", padding: "8px", flex: 1 },
      card: { border: "1px solid " + V.borderSoft, borderRadius: "10px", padding: "9px 11px",
        marginBottom: "7px", cursor: "pointer", background: V.bgSoft, transition: "border-color .12s, background .12s" },
      cardPicked: { borderColor: V.accent, background: V.accentSoft },
      row: { display: "flex", alignItems: "center", gap: "6px" },
      name: { fontWeight: 600, fontSize: "12.5px", color: V.text },
      badge: { fontSize: "10px", padding: "0 6px", borderRadius: "99px",
        border: "1px solid " + V.borderSoft, color: V.text3, lineHeight: 1.7 },
      useBadge: { fontSize: "10px", color: V.text3 },
      brief: { fontSize: "12px", color: V.text2, marginTop: "3px", lineHeight: 1.5 },
      detail: { marginTop: "7px", fontSize: "11.5px", color: V.text3, lineHeight: 1.6 },
      secTitle: { color: V.text2, fontWeight: 600, marginTop: "6px" },
      secText: { whiteSpace: "pre-wrap", marginTop: "1px" },
      phrase: { marginTop: "6px", fontSize: "11px", color: V.text3, fontFamily: mono,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      foot: { display: "flex", alignItems: "center", gap: "6px", padding: "7px 11px",
        borderTop: "1px solid " + V.borderSoft, flex: "none", fontSize: "11px", color: V.text3 },
      pane: { marginTop: "9px", paddingTop: "9px", borderTop: "1px dashed " + V.borderSoft },
      ta: { width: "100%", minHeight: "130px", boxSizing: "border-box", marginTop: "8px", padding: "8px 9px",
        borderRadius: "8px", border: "1px solid " + V.border, background: V.bgSoft, color: V.text,
        fontSize: "12px", fontFamily: mono, lineHeight: 1.55, resize: "vertical" },
      inp: { width: "100%", boxSizing: "border-box", padding: "6px 9px", borderRadius: "8px",
        border: "1px solid " + V.border, background: V.bgSoft, color: V.text, fontSize: "12px", font: "inherit" },
      mini: { fontSize: "11px", padding: "3px 9px", borderRadius: "7px", border: "1px solid " + V.border,
        background: "transparent", color: V.text2, cursor: "pointer", marginRight: "5px" },
      miniAccent: { fontSize: "11px", padding: "3px 9px", borderRadius: "7px", border: "1px solid " + V.accent,
        background: "transparent", color: V.accent, cursor: "pointer", marginRight: "5px" },
      miniPrimary: { fontSize: "11px", padding: "3px 11px", borderRadius: "7px", border: "none",
        background: V.accent, color: "#ffffff", cursor: "pointer", marginRight: "5px", fontWeight: 500 },
      miniDanger: { fontSize: "11px", padding: "3px 11px", borderRadius: "7px", border: "1px solid " + V.err,
        background: "transparent", color: V.err, cursor: "pointer", marginRight: "5px" },
      msg: { fontSize: "11px", marginTop: "6px" },
      diffBox: { marginTop: "8px", padding: "8px 9px", borderRadius: "8px", background: V.bgSoft,
        fontSize: "11.5px", fontFamily: mono, lineHeight: 1.6, maxHeight: "180px", overflow: "auto" },
      diffDel: { color: V.err, whiteSpace: "pre-wrap" },
      diffAdd: { color: V.ok, whiteSpace: "pre-wrap" },
      auditRow: { display: "flex", alignItems: "center", gap: "7px", padding: "6px 8px",
        borderRadius: "8px", background: V.bgSoft, marginBottom: "5px", fontSize: "11.5px" },
      secHead: { fontSize: "11.5px", fontWeight: 600, color: V.warn, margin: "10px 2px 5px" },
      ledger: { fontSize: "10.5px", color: V.text3, lineHeight: 1.6 }
    };

    function Card(props) {
      const sk = props.skill;
      const [mode, setMode] = React.useState(null);
      const [draft, setDraft] = React.useState(sk.content);
      const [ask, setAsk] = React.useState("");
      const [busy, setBusy] = React.useState(false);
      const [msg, setMsg] = React.useState("");
      const [hover, setHover] = React.useState(false);
      const [proposal, setProposal] = React.useState(null);   // {diff, unknownKeys, isNew}
      const dirty = draft !== sk.content;
      const expanded = mode === "open";
      const phrase = phraseOf(sk);
      const used = usedOf(sk);

      const post = (route, body) => fetch(API + route, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
      }).then((r) => r.json());

      const preview = (ev) => {
        if (ev) ev.stopPropagation();
        setBusy(true); setMsg("");
        post("/propose", { id: sk.id, content: draft })
          .then((j) => {
            if (j && j.ok) setProposal(j);
            else setMsg("预览失败：" + ((j && j.error) || "?"));
          })
          .catch((e) => setMsg("预览失败：" + e.message))
          .finally(() => setBusy(false));
      };

      const apply = (ev) => {
        if (ev) ev.stopPropagation();
        setBusy(true); setMsg("");
        post("/apply", { id: sk.id, content: draft })
          .then((j) => {
            if (j && j.ok) { setMsg("已保存（版本 v" + j.version + "，旧版可回滚）"); setProposal(null); props.onSaved(); }
            else setMsg("保存失败：" + ((j && j.error) || "?"));
          })
          .catch((e) => setMsg("保存失败：" + e.message))
          .finally(() => setBusy(false));
      };

      const sendAsk = (ev) => {
        if (ev) ev.stopPropagation();
        const want = ask.trim();
        if (want.length === 0) return;
        props.ask(sk, want); setAsk(""); setMode(null);
      };
      const doDelete = (ev) => {
        if (ev) ev.stopPropagation();
        setBusy(true); setMsg("");
        post("/delete", { id: sk.id })
          .then((j) => { if (j && j.ok) props.onDeleted(sk.name);
                         else { setMsg("删除失败：" + ((j && j.error) || "未知错误")); setBusy(false); } })
          .catch((e) => { setMsg("删除失败：" + e.message); setBusy(false); });
      };

      const style = Object.assign({}, S.card,
        props.picked ? S.cardPicked : null,
        (hover && !mode && !props.picked) ? { background: V.hover } : null);

      const saved = (sk.savesTokens || 0) * used;
      const d = proposal && proposal.diff;

      return h("div", {
          style: style,
          onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
          onClick: () => { if (!mode) props.onPick(sk); },
          title: mode ? "" : "点击插入：" + phrase
        },
        h("div", { style: S.row },
          props.picked ? h("span", { style: Object.assign({}, S.badge, { borderColor: V.accent, color: V.accent }) }, "✓") : null,
          h("span", { style: S.name }, sk.name),
          props.staged ? h("span", { style: Object.assign({}, S.badge, { borderColor: V.ok, color: V.ok }) }, "✓ 已加入") : null,
          h("span", { style: S.badge }, sk.kind === "bundle" ? "目录" : "单文件"),
          used > 0 ? h("span", { style: S.useBadge, title: "实际调用次数（点击不计）" }, "×" + used) : null,
          h("span", { style: { flex: 1 } }),
          h("button", { style: S.iconBtn, title: expanded ? "收起" : "展开功能说明",
            onClick: (ev) => { ev.stopPropagation(); setMode(expanded ? null : "open"); } }, expanded ? "▾" : "▸"),
          h("button", { style: S.iconBtn, title: "提出修改要求",
            onClick: (ev) => { ev.stopPropagation(); setMode(mode === "ask" ? null : "ask"); setMsg(""); } }, "💬"),
          h("button", { style: S.iconBtn, title: "编辑原文",
            onClick: (ev) => { ev.stopPropagation(); setMode(mode === "edit" ? null : "edit"); setMsg(""); setProposal(null); } },
            mode === "edit" ? "×" : "✎"),
          h("button", { style: S.iconBtn, title: "删除（移入回收站）",
            onClick: (ev) => { ev.stopPropagation(); setMode(mode === "del" ? null : "del"); setMsg(""); } }, "🗑")
        ),

        h("div", { style: S.brief }, cut(briefOf(sk), 26)),
        expanded && sk.description && sk.description !== sk.brief
          ? h("div", { style: { fontSize: "11px", color: V.text3, marginTop: "2px", lineHeight: 1.5 } }, sk.description)
          : null,

        expanded ? h("div", { style: S.detail },
            h("div", { style: S.ledger },
              "实际调用 " + used + " 次"
              + (sk.savesTokens ? " · 估算省 ≈ " + fmtTok(sk.savesTokens) + "/次" : "")
              + (saved > 0 ? " · 累计已省 ≈ " + fmtTok(saved) : "")),
            sk.whenToUse ? h("div", null, h("span", { style: S.secTitle }, "何时用"), h("div", { style: S.secText }, sk.whenToUse)) : null,
            sk.intro ? h("div", { style: S.secText }, sk.intro) : null,
            sk.sections && sk.sections.length
              ? sk.sections.map((s, i) => h("div", { key: i },
                  h("span", { style: S.secTitle }, s.title), h("div", { style: S.secText }, cut(s.text, 240))))
              : (sk.steps && sk.steps.length
                  ? h("div", null, h("span", { style: S.secTitle }, "流程"),
                      h("div", { style: S.secText }, sk.steps.map((s, i) => (i + 1) + ". " + s).join("\n")))
                  : h("div", { style: S.secText }, "（无分段，点 ✎ 看原文）"))
          ) : null,

        h("div", { style: S.phrase }, "💬 " + phrase),

        mode === "ask" ? h("div", { style: S.pane, onClick: (ev) => ev.stopPropagation() },
            h("div", { style: { fontSize: "11.5px", color: V.text3, lineHeight: 1.55 } },
              "提修改要求 →「交给助手」写进输入框，由 agent 生成提案（diff），你确认后才落盘"),
            h("input", { style: S.inp, value: ask, placeholder: "例：简介压到 8 字以内，第二步改成加法",
              onChange: (e) => setAsk(e.target.value), onKeyDown: (e) => { if (e.key === "Enter") sendAsk(); } }),
            h("div", { style: { marginTop: "7px" } },
              h("button", { style: S.miniPrimary, onClick: sendAsk }, "交给助手"),
              h("button", { style: S.mini, onClick: (ev) => { ev.stopPropagation(); setMode(null); } }, "取消"))) : null,

        mode === "edit" ? h("div", { style: S.pane, onClick: (ev) => ev.stopPropagation() },
            h("textarea", { style: S.ta, value: draft, spellCheck: false, onChange: (e) => setDraft(e.target.value) }),
            proposal === null
              ? h("div", { style: { marginTop: "7px" } },
                  h("button", { style: Object.assign({}, S.miniPrimary, (!dirty || busy) ? { opacity: .45 } : null),
                    disabled: !dirty || busy, onClick: preview }, busy ? "预览中…" : "预览改动"),
                  h("button", { style: S.mini, onClick: (ev) => { ev.stopPropagation(); setDraft(sk.content); } }, "放弃"),
                  h("span", { style: S.msg }, dirty ? "有未保存改动" : ""))
              : h("div", null,
                  proposal.unknownKeys && proposal.unknownKeys.length > 0
                    ? h("div", { style: { color: V.err, fontSize: "11.5px", marginBottom: "6px" } },
                        "⚠ frontmatter 含白名单外字段（保存会被拒）：" + proposal.unknownKeys.join(", "))
                    : null,
                  d ? h("div", { style: S.diffBox },
                        d.removed.map((l, i) => h("div", { key: 'd' + i, style: S.diffDel }, "- " + l)),
                        d.added.map((l, i) => h("div", { key: 'a' + i, style: S.diffAdd }, "+ " + l))) : null,
                  h("div", { style: { marginTop: "7px" } },
                    h("button", { style: S.miniPrimary, disabled: busy || (proposal.unknownKeys && proposal.unknownKeys.length > 0), onClick: apply },
                      busy ? "保存中…" : "应用修改"),
                    h("button", { style: S.mini, onClick: (ev) => { ev.stopPropagation(); setProposal(null); } }, "返回")),
                  msg ? h("div", { style: Object.assign({}, S.msg, { color: msg.indexOf("已保存") === 0 ? V.ok : V.err }) }, msg) : null)) : null,

        mode === "del" ? h("div", { style: S.pane, onClick: (ev) => ev.stopPropagation() },
            h("div", { style: { fontSize: "11.5px", color: V.err, lineHeight: 1.55 } },
              "删除「" + sk.name + "」？移到 .trash/，可从回收站还原"),
            h("div", { style: { marginTop: "7px" } },
              h("button", { style: S.miniDanger, disabled: busy, onClick: doDelete }, busy ? "删除中…" : "确认删除"),
              h("button", { style: S.mini, onClick: (ev) => { ev.stopPropagation(); setMode(null); } }, "取消")),
            msg ? h("div", { style: Object.assign({}, S.msg, { color: V.err }) }, msg) : null) : null
      );
    }

    function AuditView(props) {
      const [report, setReport] = React.useState(null);
      const [picked, setPicked] = React.useState([]);
      const [busy, setBusy] = React.useState(false);

      const load = React.useCallback(() => {
        fetch(API + "/audit", { headers: { "cache-control": "no-store" } })
          .then((r) => r.json()).then((j) => { if (j && j.ok) setReport(j.report); }).catch(() => {});
      }, []);
      React.useEffect(() => { load(); }, [load]);
      if (report === null) return h("div", { style: { color: V.text3, fontSize: "12px" } }, "体检中…");

      const toggle = (id) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : p.concat([id]));
      const clean = () => {
        setBusy(true);
        Promise.all(picked.map((id) => fetch(API + "/delete", {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id })
        }))).then(() => { setPicked([]); setBusy(false); load(); props.onChanged(); });
      };
      const row = (id, text, why) => h("div", { key: id + text, style: S.auditRow },
        h("input", { type: "checkbox", checked: picked.includes(id), onChange: () => toggle(id) }),
        h("span", { style: { flex: 1 } }, text),
        h("span", { style: { color: V.text3 } }, why));

      const groups = [
        ["从未使用", report.unused.map((x) => row(x.id, x.name, x.ageDays + " 天"))],
        ["长期未用", report.stale.map((x) => row(x.id, x.name, "调用过 " + x.invoked + " 次 · " + x.idleDays + " 天未用"))],
        ["空壳内容", report.stub.map((x) => row(x.id, x.name, x.chars + " 字"))]
      ];
      const anyFindings = report.unused.length + report.stale.length + report.stub.length;

      return h("div", null,
        h("div", { style: { fontSize: "11.5px", color: V.text3, marginBottom: "6px" } },
          "共 " + report.total + " 个技能 · 只看实际调用，点击不计 · 全本地判定"),
        groups.map(([title, rows]) => rows.length > 0
          ? h("div", { key: title }, h("div", { style: S.secHead }, title + " (" + rows.length + ")"), rows) : null),
        anyFindings === 0 ? h("div", { style: { color: V.ok, fontSize: "12px", padding: "6px 2px" } }, "✓ 没有需要清理的技能") : null,
        report.dup.length > 0 ? h("div", null,
            h("div", { style: S.secHead }, "疑似重复 (" + report.dup.length + ")"),
            report.dup.map((d, i) => h("div", { key: i, style: Object.assign({}, S.auditRow, { color: V.text3 }) },
              h("span", { style: { flex: 1 } }, d.aName + "  ↔  " + d.bName),
              h("span", null, (d.score * 100).toFixed(0) + "%")))) : null,
        h("div", { style: { marginTop: "10px" } },
          picked.length > 0 ? h("button", { style: S.miniDanger, disabled: busy, onClick: clean },
            busy ? "清理中…" : "移入回收站 (" + picked.length + ")") : null,
          h("button", { style: S.mini, onClick: load }, "重新体检")),
        h("div", { style: Object.assign({}, S.secHead, { color: V.text2, marginTop: "14px" }) }, "从对话提炼"),
        h("div", { style: { fontSize: "11.5px", color: V.text3, lineHeight: 1.6, marginBottom: "6px" } },
          "提炼需要判断力，交给 agent 做；面板只负责发起。"),
        h("button", { style: S.miniPrimary, onClick: () => props.onDistill() }, "提炼出可重复使用的技能")
      );
    }

    function TrashView(props) {
      const [entries, setEntries] = React.useState(null);
      const load = React.useCallback(() => {
        fetch(API + "/trash", { headers: { "cache-control": "no-store" } })
          .then((r) => r.json()).then((j) => { if (j && j.ok) setEntries(j.entries); }).catch(() => {});
      }, []);
      React.useEffect(() => { load(); }, [load]);
      const act = (route, entry) => fetch(API + route, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entry })
      }).then((r) => r.json()).then((j) => {
        props.onFlash(j && j.ok ? "已处理" : ("失败：" + ((j && j.error) || "?")));
        load(); props.onChanged();
      });

      if (entries === null) return h("div", { style: { color: V.text3, fontSize: "12px" } }, "读取中…");
      if (entries.length === 0) return h("div", { style: { color: V.ok, fontSize: "12px", padding: "6px 2px" } }, "✓ 回收站是空的");

      return h("div", null,
        h("div", { style: { fontSize: "11.5px", color: V.text3, marginBottom: "6px" } },
          entries.length + " 项（删除的都在这里，可还原）"),
        entries.map((e) => h("div", { key: e.entry, style: S.auditRow },
          h("span", { style: { flex: 1 } }, e.id),
          h("span", { style: { color: V.text3, fontSize: "10.5px" } }, e.deletedAt.replace("T", " ").slice(0, 16)),
          h("button", { style: S.mini, onClick: () => act("/restore", e.entry) }, "还原"),
          h("button", { style: S.mini, onClick: () => act("/purge", e.entry) }, "彻底删"))));
    }

    function ComposeView(props) {
      const toggle = (sk) => props.setPicked((p) => p.some((x) => x.id === sk.id)
        ? p.filter((x) => x.id !== sk.id) : p.concat([sk]));
      const list = props.skills || [];
      return h("div", null,
        h("div", { style: { fontSize: "11.5px", color: V.text3, lineHeight: 1.6, marginBottom: "6px" } },
          "进阶：勾选多个技能，组合成一条流程，或合并保存为一个新技能。日常一般用不到。"),
        list.length === 0 ? h("div", { style: { color: V.text3, fontSize: "12px" } }, "还没有可组合的技能。") : null,
        list.map((sk) => h("div", { key: sk.id, style: Object.assign({}, S.auditRow, { cursor: "pointer" }),
            onClick: () => toggle(sk) },
          h("input", { type: "checkbox", readOnly: true, style: { pointerEvents: "none" },
            checked: props.picked.some((x) => x.id === sk.id) }),
          h("span", { style: { flex: 1 } }, sk.name),
          h("span", { style: { color: V.text3 } }, cut(briefOf(sk), 18)))),
        props.picked.length > 0 ? h("div", { style: S.pane },
          h("div", { style: { fontSize: "11px", color: V.text2, marginBottom: "6px" } },
            "已选 " + props.picked.length + " 个：" + cut(props.picked.map((p) => p.name).join(" → "), 30)),
          props.composing
            ? h("div", { style: S.row },
                h("input", { style: Object.assign({}, S.inp, { flex: 1 }), value: props.newName,
                  placeholder: "新技能名（字母数字-_）", onChange: (e) => props.setNewName(e.target.value),
                  onKeyDown: (e) => { if (e.key === "Enter") props.composePicked(); } }),
                h("button", { style: S.miniPrimary, onClick: props.composePicked }, "生成"),
                h("button", { style: S.mini, onClick: () => props.setComposing(false) }, "取消"))
            : h("div", { style: S.row },
                h("button", { style: S.miniPrimary, onClick: props.insertPicked }, "插入为流程"),
                h("button", { style: S.miniAccent, onClick: () => props.setComposing(true) }, "保存为技能"),
                h("button", { style: S.mini, onClick: () => props.setPicked([]) }, "清空"))) : null);
    }

    function SkillPanel(props) {
      const [open, setOpen] = React.useState(false);
      const [view, setView] = React.useState("list");
      const [skills, setSkills] = React.useState(null);
      const [stats, setStats] = React.useState(null);
      const [error, setError] = React.useState("");
      const [flash, setFlash] = React.useState("");
      const [auto, setAuto] = React.useState(true);
      const [picked, setPicked] = React.useState([]);
      const [composing, setComposing] = React.useState(false);
      const [newName, setNewName] = React.useState("");
  const [staged, setStaged] = React.useState([]);
      const sigRef = React.useRef("");

      const load = React.useCallback((silent) => {
        if (!silent) setError("");
        fetch(API + "/list", { headers: { "cache-control": "no-store" } })
          .then((r) => r.json())
          .then((j) => {
            if (!j || !j.ok) { if (!silent) setError((j && j.error) || "读取失败"); return; }
            const next = j.skills || [];
            const sig = next.map((s) => s.id + ":" + s.mtimeMs + ":" + usedOf(s)).join("|");
            if (sig !== sigRef.current) { sigRef.current = sig; setSkills(next); }
            const dr = (props.getDraft ? props.getDraft() : "");
            setStaged(next.filter((s) => dr.indexOf(markOf(s)) !== -1).map((s) => s.id));
          })
          .catch((e) => { if (!silent) setError("读取失败：" + e.message); });
        fetch(API + "/stats", { headers: { "cache-control": "no-store" } })
          .then((r) => r.json()).then((j) => { if (j && j.ok) setStats(j.stats); }).catch(() => {});
      }, []);

      React.useEffect(() => { if (open && skills === null) load(false); }, [open, skills, load]);
      React.useEffect(() => {
        if (!open || !auto) return undefined;
        const id = setInterval(() => load(true), POLL_MS);
        return () => clearInterval(id);
      }, [open, auto, load]);
      React.useEffect(() => {
        if (!flash) return undefined;
        const t = setTimeout(() => setFlash(""), 2400);
        return () => clearTimeout(t);
      }, [flash]);

      const emitEvent = (sk, type) => fetch(API + "/event", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ skillId: sk.id, type, source: "panel" })
      }).then(() => load(true)).catch(() => {});

      const pickOne = (sk) => {
        const r = props.insertSkill(sk, phraseOf(sk));
        if (r !== "dup") emitEvent(sk, "clicked");
        setFlash(r === "dup" ? "已在输入框中 → " + cut(briefOf(sk), 16)
          : r === "ok" ? "已加入 ✓（发送后执行）→ " + cut(briefOf(sk), 16)
          : r === "fallback" ? "已加入 ✓（发送后执行）→ " + cut(briefOf(sk), 16)
          : "插入失败");
      };
      const insertPicked = () => {
        if (picked.length === 0) return;
        const ok = props.insertPipeline(picked);
        picked.forEach((s) => emitEvent(s, "clicked"));
        setFlash(ok ? "已插入 " + picked.length + " 个技能的流程" : "插入失败");
        setPicked([]);
      };
      const composePicked = () => {
        const name = newName.trim();
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(name)) { setFlash("名字只能用字母数字和 -_"); return; }
        fetch(API + "/compose", { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids: picked.map((p) => p.id), name }) })
          .then((r) => r.json())
          .then((j) => {
            if (j && j.ok) { setFlash("已生成新技能：" + j.id); setComposing(false); setNewName(""); setPicked([]); load(false); }
            else setFlash("生成失败：" + ((j && j.error) || "?"));
          })
          .catch((e) => setFlash("生成失败：" + e.message));
      };

      const onDeleted = (name) => { setFlash("已删除「" + name + "」→ 回收站"); setPicked([]); load(false); };

      const backBtn = view !== "list"
        ? h("button", { style: S.pill, title: "返回技能列表", onClick: () => setView("list") }, "← 返回")
        : null;

      const ledger = stats
        ? h("div", { style: S.ledger },
            h("div", null, "实际调用 " + (stats.totalInvocations !== undefined ? stats.totalInvocations : stats.totalCalls) + " 次 · " + stats.used + "/" + stats.skills + " 个在用"),
            stats.savedTokens > 0
              ? h("div", null, "估算节省 ≈ " + fmtTok(stats.savedTokens) + " token（价值估算，非实测）")
              : null)
        : null;

      return h(React.Fragment, null,
        h("button", { style: Object.assign({}, S.trigger, open ? S.triggerOn : null),
            onClick: () => setOpen(!open), title: "技能面板" },
          h("span", null, "🐳"), h("span", null, "技能"),
          skills ? h("span", { style: { color: V.text3, fontSize: "11px" } }, skills.length) : null),

        open ? h("div", { style: S.panel, onClick: (e) => e.stopPropagation() },
          h("div", { style: S.head },
            backBtn,
            h("span", { style: S.headTitle }, view === "list" ? "技能面板" : view === "audit" ? "整理" : view === "trash" ? "回收站" : "组合技能"),
            h("button", { style: Object.assign({}, S.pill, view === "compose" ? S.pillAccent : null),
              title: "组合技能（进阶）", onClick: () => { const nv = view === "compose" ? "list" : "compose"; setView(nv); setPicked([]); setComposing(false); setNewName(""); } },
              "⧉ 组合"),
            view === "list" ? h("button", { style: Object.assign({}, S.pill, auto ? S.pillOn : null),
              title: auto ? "自动同步中" : "已停用", onClick: () => { const n = !auto; setAuto(n); if (n) load(false); } },
              auto ? "⟳ 同步" : "⟳ 停") : null,
            h("button", { style: Object.assign({}, S.pill, view === "audit" ? S.pillAccent : null),
              title: "垃圾体检 / 从对话提炼", onClick: () => setView(view === "audit" ? "list" : "audit") }, "🧹"),
            h("button", { style: Object.assign({}, S.pill, view === "trash" ? S.pillAccent : null),
              title: "回收站", onClick: () => setView(view === "trash" ? "list" : "trash") }, "♻"),
            h("button", { style: S.iconBtn, title: "刷新", onClick: () => load(false) }, "↻"),
            h("button", { style: S.iconBtn, title: "关闭", onClick: () => setOpen(false) }, "×")
          ),

          h("div", { style: S.body },
            error ? h("div", { style: { color: V.err, fontSize: "12px" } }, error) : null,
            view === "audit" ? h(AuditView, {
              onChanged: () => load(false),
              onDistill: () => {
                props.insertText("从我们刚才的对话里，提炼出可重复使用的技能：用 skill-edit 的极简方式写入 skills 目录，先回一句你打算写什么再动手。");
                setFlash("已把提炼要求写进输入框");
              }
            }) : null,
            view === "trash" ? h(TrashView, { onChanged: () => load(false), onFlash: setFlash }) : null,
            view === "compose" ? h(ComposeView, {
              skills: skills || [], picked, setPicked, composing, setComposing,
              newName, setNewName, insertPicked, composePicked
            }) : null,
            view === "list" ? h(React.Fragment, null,
              !error && skills === null ? h("div", { style: { color: V.text3, fontSize: "12px" } }, "加载中…") : null,
              skills && skills.length === 0 ? h("div", { style: { color: V.text3, fontSize: "12px" } }, "还没有技能。") : null,
              skills ? skills.map((s) => h(Card, { key: s.id, skill: s, staged: staged.includes(s.id),
                onPick: pickOne,
                ask: (sk, want) => { props.insertAsk(sk, want); setFlash("已把修改要求写进输入框"); },
                onSaved: () => load(false), onDeleted: onDeleted })) : null) : null
          ),

          h("div", { style: Object.assign({}, S.foot, { flexDirection: "column", alignItems: "stretch" }) },
            flash ? h("span", { style: { color: V.ok } }, flash) : null,
            ledger)
        ) : null
      );
    }

    function apply(ctx) {
      const emitAt = (sessionId, event, payload, replace) => {
        const actx = ctx.sessions.scope(sessionId);
        const conversation = actx.get("conversation");
        const input = conversation && conversation.input.for(actx);
        const state = input && input.state.getSnapshot();
        const draft = state && typeof state.draft === "string" ? state.draft : "";
        const span = replace
          ? { start: 0, end: draft.length, draftRev: (state && state.draftRev) || 0 }
          : { start: draft.length, end: draft.length, draftRev: (state && state.draftRev) || 0 };
        actx.emit(event, Object.assign({}, payload, { span }));
      };

      const insertText = (sessionId, text, replace) => {
        try { emitAt(sessionId, "slash/input-insert-text", { text }, replace === true); return true; }
        catch (e) { return false; }
      };

      const markOf = (sk) => "【" + briefOf(sk) + "】";
      const insertSkill = (sessionId, sk) => {
        const actx = ctx.sessions.scope(sessionId);
        const conversation = actx.get("conversation");
        const input = conversation && conversation.input.for(actx);
        const state = input && input.state.getSnapshot();
        const draft = state && typeof state.draft === "string" ? state.draft : "";
        const mark = markOf(sk);
        if (draft.indexOf(mark) !== -1) return "dup";
        actx.emit("slash/input-insert-text", {
          text: mark + phraseOf(sk),
          span: { start: draft.length, end: draft.length, draftRev: (state && state.draftRev) || 0 }
        });
        return "ok";
      };
      const insertPipeline = (sessionId, list) => {
        const body = list.map((s, i) => (i + 1) + ". " + phraseOf(s)).join("\n");
        return insertText(sessionId, "依次执行以下步骤：\n" + body + "\n");
      };

      try {
        ctx.effect(() => ctx.inputTriggers.registerSource({
          trigger: TRIGGER, name: SOURCE,
          candidates: async () => {
            try {
              const r = await fetch(API + "/list", { headers: { "cache-control": "no-store" } });
              const j = await r.json();
              if (!j || !j.ok) return [];
              return j.skills.map((s) => ({ name: s.name, description: briefOf(s), icon: "🐳" }));
            } catch (e) { return []; }
          },
          onPick: (pick) => {
            const c = pick.candidate;
            return { insert: { source: SOURCE, ref: c.name, label: "🐳 " + c.description,
              clipboardText: "请使用「" + c.name + "」技能：" } };
          }
        }));
      } catch (e) { /* 源注册失败不致命 */ }

      ctx.slots.inject("conversation.input.dock", () =>
        ctx.slots.register({
          name: "conversation.input.dock", id: "skill-panel-dock", order: 8,
          inject: (sessionId) => ({
            getDraft: () => {
              const a = ctx.sessions.scope(sessionId);
              const c = a.get("conversation");
              const i = c && c.input.for(a);
              const st = i && i.state.getSnapshot();
              return st && typeof st.draft === "string" ? st.draft : "";
            },
            insertSkill: (sk, phrase) => insertSkill(sessionId, sk),
            insertPipeline: (list) => insertPipeline(sessionId, list),
            insertText: (text) => insertText(sessionId, text, true),
            insertAsk: (sk, want) => insertText(sessionId, "修改技能「" + sk.name + "」：" + want, true)
          })
        }, SkillPanel));
    }

    module.exports = { apply, inject: ["slots", "sessions", "inputTriggers"] };
    return module.exports;
  }
});
