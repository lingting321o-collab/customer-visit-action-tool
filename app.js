const form = document.getElementById("notesForm");
const notesInput = document.getElementById("notesInput");
const customerInput = document.getElementById("customerInput");
const dateInput = document.getElementById("dateInput");
const ownerInput = document.getElementById("ownerInput");
const itemsBody = document.getElementById("itemsBody");
const itemCount = document.getElementById("itemCount");
const highCount = document.getElementById("highCount");
const datedCount = document.getElementById("datedCount");
const ownerCount = document.getElementById("ownerCount");
const copyButton = document.getElementById("copyButton");
const csvButton = document.getElementById("csvButton");
const clearButton = document.getElementById("clearButton");
const sampleButton = document.getElementById("sampleButton");
const apiNote = document.getElementById("apiNote");

let currentItems = [];

const sampleNotes = `客户：华东某制造客户
日期：2026-05-23
参会人：客户信息中心、业务负责人、项目经理、售后工程师

客户反馈：当前代理网关监控不足，近期终端规模持续增长，担心上线后性能瓶颈。客户希望下周三前确认高可用方案和应急切换流程。

会议结论：
1. 项目经理负责整理高可用落地方案，周三前发客户确认。
2. 售后工程师本周五前补齐网关监控指标，包括设备状态、CPU、内存、流量和业务探测。
3. 客户侧王经理协调变更窗口，计划下周五晚上做灰度上线。
4. 大客经理需要在本周内推动客户关键人确认F5方案；如果客户不同意，需要准备备选方案并上升。
5. 双方约定下周二进行一次应急切换演练，演练后输出复盘纪要。`;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function splitSentences(text) {
  return text
    .replace(/\r/g, "")
    .split(/\n|。|；|;/)
    .map((item) => item.replace(/^\s*[-*0-9.、）)]+/, "").trim())
    .filter(Boolean);
}

function inferOwner(sentence, defaultOwner) {
  const patterns = [
    /([\u4e00-\u9fa5A-Za-z0-9]+(?:经理|工程师|负责人|项目经理|客户侧|大客|售后|原厂|PM))负责/,
    /由([\u4e00-\u9fa5A-Za-z0-9]+(?:经理|工程师|负责人|项目经理|客户侧|大客|售后|原厂|PM)?)/,
    /([\u4e00-\u9fa5A-Za-z0-9]+)需要/,
    /([\u4e00-\u9fa5A-Za-z0-9]+)协调/,
  ];

  for (const pattern of patterns) {
    const match = sentence.match(pattern);
    if (match?.[1]) return match[1].replace(/^客户侧/, "客户侧 ");
  }

  return defaultOwner || "待定";
}

function inferDueDate(sentence) {
  const patterns = [
    /([本下]周[一二三四五六日天])/,
    /(周[一二三四五六日天]前?)/,
    /(今天|明天|后天)/,
    /(\d{1,2}月\d{1,2}日(?:前)?)/,
    /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/,
    /(\d{1,2}日前)/,
  ];

  for (const pattern of patterns) {
    const match = sentence.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "未明确";
}

function inferPriority(sentence) {
  const highWords = ["高可用", "应急", "切换", "SLA", "故障", "风险", "关键人", "上升", "瓶颈", "变更"];
  const lowWords = ["纪要", "复盘", "整理", "同步"];

  if (highWords.some((word) => sentence.includes(word))) return "高";
  if (lowWords.some((word) => sentence.includes(word))) return "中";
  return "中";
}

function normalizeTask(sentence) {
  return sentence
    .replace(/^(会议结论|行动项|待办|客户希望|双方约定)[:：]?/, "")
    .replace(/^(需要|负责|协调|计划|确认)/, "")
    .trim();
}

function extractActionItems(text, defaultOwner) {
  const actionSignals = [
    "负责",
    "需要",
    "确认",
    "输出",
    "整理",
    "补齐",
    "推动",
    "协调",
    "准备",
    "演练",
    "上线",
    "跟进",
    "完成",
    "发送",
    "同步",
    "落地",
  ];

  const sentences = splitSentences(text);
  const candidates = sentences.filter((sentence) =>
    actionSignals.some((signal) => sentence.includes(signal))
  );

  return candidates.map((sentence) => ({
    task: normalizeTask(sentence),
    owner: inferOwner(sentence, defaultOwner),
    due: inferDueDate(sentence),
    priority: inferPriority(sentence),
    status: "未开始",
  }));
}

function render(items) {
  currentItems = items;
  itemCount.textContent = items.length;
  highCount.textContent = items.filter((item) => item.priority === "高").length;
  datedCount.textContent = items.filter((item) => item.due !== "未明确").length;
  ownerCount.textContent = items.filter((item) => item.owner !== "待定").length;

  if (!items.length) {
    itemsBody.innerHTML = '<tr class="empty-row"><td colspan="5">暂无行动项</td></tr>';
    return;
  }

  itemsBody.innerHTML = items
    .map((item) => {
      const priorityClass = item.priority === "高" ? "high" : item.priority === "低" ? "low" : "medium";
      return `<tr>
        <td>${escapeHtml(item.task)}</td>
        <td>${escapeHtml(item.owner)}</td>
        <td>${escapeHtml(item.due)}</td>
        <td><span class="pill ${priorityClass}">${escapeHtml(item.priority)}</span></td>
        <td>${escapeHtml(item.status)}</td>
      </tr>`;
    })
    .join("");
}

function toMarkdown(items) {
  if (!items.length) return "暂无行动项";
  return [
    "| 事项 | 负责人 | 截止时间 | 优先级 | 状态 |",
    "| --- | --- | --- | --- | --- |",
    ...items.map((item) =>
      `| ${item.task} | ${item.owner} | ${item.due} | ${item.priority} | ${item.status} |`
    ),
  ].join("\n");
}

function toCsv(items) {
  const rows = [["事项", "负责人", "截止时间", "优先级", "状态"], ...items.map((item) => [
    item.task,
    item.owner,
    item.due,
    item.priority,
    item.status,
  ])];

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function downloadCsv() {
  const blob = new Blob(["\ufeff" + toCsv(currentItems)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "customer-visit-action-items.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const items = extractActionItems(notesInput.value, ownerInput.value.trim());
  render(items);
});

sampleButton.addEventListener("click", () => {
  notesInput.value = sampleNotes;
  customerInput.value = "华东某制造客户";
  dateInput.value = "2026-05-23";
  ownerInput.value = "项目经理";
  render(extractActionItems(notesInput.value, ownerInput.value.trim()));
});

clearButton.addEventListener("click", () => {
  notesInput.value = "";
  customerInput.value = "";
  dateInput.value = "";
  ownerInput.value = "";
  render([]);
});

copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(toMarkdown(currentItems));
  copyButton.textContent = "已复制";
  setTimeout(() => {
    copyButton.textContent = "复制";
  }, 1300);
});

csvButton.addEventListener("click", downloadCsv);

document.querySelectorAll(".mode").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".mode").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    apiNote.hidden = button.dataset.mode !== "api";
  });
});

render([]);
